import {
  ExecutionStatus,
  Prisma,
  StepStatus,
  StepType,
} from '../generated/prisma/client';
import { prisma } from '../utils/prisma';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

type RunnerError = Error & { status?: number };

interface StepExecutionResult {
  stepId: string;
  stepName: string;
  stepType: StepType;
  status: ExecutionStatus;
  output?: JsonValue;
  error?: string;
  continueOnError?: boolean;
}

interface WorkflowRunResult {
  workflowId: string;
  status: ExecutionStatus;
  steps: StepExecutionResult[];
}

interface HttpRequestStepConfig {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: JsonValue;
  timeoutMs?: number;
}

interface DelayStepConfig {
  durationMs: number;
}

interface LogStepConfig {
  message: string;
  level: 'info' | 'warn' | 'error';
}

interface StepBehaviorConfig {
  continueOnError: boolean;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toPrismaJson = (
  value: JsonValue | undefined
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
};

const toJsonValue = (value: unknown): JsonValue => {
  if (value === null) {
    return null;
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue(item));
  }

  if (isObject(value)) {
    const output: { [key: string]: JsonValue } = {};
    Object.entries(value).forEach(([key, currentValue]) => {
      output[key] = toJsonValue(currentValue);
    });
    return output;
  }

  return String(value);
};

const toStepBehaviorConfig = (config: unknown): StepBehaviorConfig => ({
  continueOnError:
    isObject(config) && typeof config.continueOnError === 'boolean'
      ? config.continueOnError
      : false,
});

const toHttpRequestConfig = (config: unknown): HttpRequestStepConfig => {
  if (!isObject(config) || typeof config.url !== 'string') {
    throw new Error('http_request step requires config.url');
  }

  const headers =
    isObject(config.headers) &&
    Object.values(config.headers).every((value) => typeof value === 'string')
      ? (config.headers as Record<string, string>)
      : undefined;

  return {
    url: config.url,
    method:
      typeof config.method === 'string' ? config.method.toUpperCase() : 'GET',
    headers,
    body: config.body === undefined ? undefined : toJsonValue(config.body),
    timeoutMs:
      typeof config.timeoutMs === 'number' && config.timeoutMs > 0
        ? config.timeoutMs
        : 15000,
  };
};

const toDelayConfig = (config: unknown): DelayStepConfig => {
  if (!isObject(config) || typeof config.durationMs !== 'number') {
    throw new Error('delay step requires numeric config.durationMs');
  }

  if (config.durationMs < 0) {
    throw new Error('delay step config.durationMs must be >= 0');
  }

  return { durationMs: config.durationMs };
};

const toLogConfig = (config: unknown): LogStepConfig => {
  if (!isObject(config) || typeof config.message !== 'string') {
    throw new Error('log step requires string config.message');
  }

  const level =
    config.level === 'warn' ||
    config.level === 'error' ||
    config.level === 'info'
      ? config.level
      : 'info';

  return {
    message: config.message,
    level,
  };
};

const sleep = async (durationMs: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });

const executeHttpRequestStep = async (config: unknown): Promise<JsonValue> => {
  const httpConfig = toHttpRequestConfig(config);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), httpConfig.timeoutMs);

  try {
    const headers = new Headers(httpConfig.headers);
    const hasBody = httpConfig.body !== undefined && httpConfig.method !== 'GET';
    let requestBody: string | undefined;

    if (hasBody) {
      requestBody = JSON.stringify(httpConfig.body);
      if (!headers.has('content-type')) {
        headers.set('content-type', 'application/json');
      }
    }

    const response = await fetch(httpConfig.url, {
      method: httpConfig.method,
      headers,
      body: requestBody,
      signal: controller.signal,
    });

    const responseText = await response.text();
    let responseBody: JsonValue = responseText;

    if (responseText) {
      try {
        responseBody = toJsonValue(JSON.parse(responseText));
      } catch {
        responseBody = responseText;
      }
    }

    return {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      body: responseBody,
    };
  } finally {
    clearTimeout(timeoutId);
  }
};

const executeDelayStep = async (config: unknown): Promise<JsonValue> => {
  const delayConfig = toDelayConfig(config);
  await sleep(delayConfig.durationMs);
  return { delayedMs: delayConfig.durationMs };
};

const executeLogStep = async (config: unknown): Promise<JsonValue> => {
  const logConfig = toLogConfig(config);

  if (logConfig.level === 'warn') {
    console.warn(logConfig.message);
  } else if (logConfig.level === 'error') {
    console.error(logConfig.message);
  } else {
    console.log(logConfig.message);
  }

  return {
    level: logConfig.level,
    message: logConfig.message,
  };
};

const executeStep = async (type: StepType, config: unknown): Promise<JsonValue> => {
  if (type === StepType.HTTP_REQUEST) {
    return executeHttpRequestStep(config);
  }

  if (type === StepType.DELAY) {
    return executeDelayStep(config);
  }

  if (type === StepType.LOG) {
    return executeLogStep(config);
  }

  throw new Error(`Unsupported step type: ${type}`);
};

export class WorkflowRunnerService {
  static async run(workflowId: string): Promise<WorkflowRunResult> {
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        steps: {
          where: { status: StepStatus.ACTIVE },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!workflow) {
      const error: RunnerError = new Error('Workflow not found');
      error.status = 404;
      throw error;
    }

    const results: StepExecutionResult[] = [];
    let workflowStatus: ExecutionStatus = ExecutionStatus.COMPLETED;

    for (const step of workflow.steps) {
      const startedAt = new Date();
      const behavior = toStepBehaviorConfig(step.config);

      const executionLog = await prisma.executionLog.create({
        data: {
          workflowId: workflow.id,
          workflowStepId: step.id,
          status: ExecutionStatus.RUNNING,
          startedAt,
          input: toPrismaJson(toJsonValue(step.config)),
        },
      });

      try {
        const output = await executeStep(step.type, step.config);
        const completedAt = new Date();

        await prisma.executionLog.update({
          where: { id: executionLog.id },
          data: {
            status: ExecutionStatus.COMPLETED,
            completedAt,
            duration: completedAt.getTime() - startedAt.getTime(),
            output: toPrismaJson(output),
          },
        });

        results.push({
          stepId: step.id,
          stepName: step.name,
          stepType: step.type,
          status: ExecutionStatus.COMPLETED,
          output,
          continueOnError: behavior.continueOnError,
        });
      } catch (error) {
        const completedAt = new Date();
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown step execution error';

        await prisma.executionLog.update({
          where: { id: executionLog.id },
          data: {
            status: ExecutionStatus.FAILED,
            completedAt,
            duration: completedAt.getTime() - startedAt.getTime(),
            error: errorMessage,
          },
        });

        results.push({
          stepId: step.id,
          stepName: step.name,
          stepType: step.type,
          status: ExecutionStatus.FAILED,
          error: errorMessage,
          continueOnError: behavior.continueOnError,
        });

        workflowStatus = ExecutionStatus.FAILED;

        if (!behavior.continueOnError) {
          break;
        }
      }
    }

    return {
      workflowId: workflow.id,
      status: workflowStatus,
      steps: results,
    };
  }
}

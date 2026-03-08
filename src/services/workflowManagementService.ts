import {
  Prisma,
  StepStatus,
  StepType,
  TriggerType,
  WorkflowStatus,
} from '../generated/prisma/client';
import { AppError } from '../errors/appError';
import { enqueueWorkflowRun } from '../queues/workflowRunQueue';
import {
  scheduleWorkflowTrigger,
  unscheduleWorkflowTrigger,
} from './workflowTriggerService';
import { prisma } from '../utils/prisma';

type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

interface WorkflowStepPayload {
  name: string;
  description?: string;
  type: string;
  order: number;
  config?: unknown;
  status?: StepStatus;
}

interface CreateWorkflowInput {
  name: string;
  description?: string;
  status?: string;
  triggerType?: string;
  triggerConfig?: unknown;
  createdBy: string;
  steps?: WorkflowStepPayload[];
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toStepType = (type: string): StepType | null => {
  const normalizedType = type.trim().toLowerCase();

  if (normalizedType === 'http_request') {
    return StepType.HTTP_REQUEST;
  }
  if (normalizedType === 'delay') {
    return StepType.DELAY;
  }
  if (normalizedType === 'log') {
    return StepType.LOG;
  }

  return null;
};

const toTriggerType = (type: string): TriggerType | null => {
  const normalizedType = type.trim().toLowerCase();

  if (normalizedType === 'webhook') {
    return TriggerType.WEBHOOK;
  }
  if (normalizedType === 'manual') {
    return TriggerType.MANUAL;
  }
  if (normalizedType === 'scheduled') {
    return TriggerType.SCHEDULED;
  }

  return null;
};

const isValidStepStatus = (status: string): status is StepStatus =>
  Object.values(StepStatus).includes(status as StepStatus);

const isValidWorkflowStatus = (
  status: string
): status is WorkflowStatus =>
  Object.values(WorkflowStatus).includes(status as WorkflowStatus);

const toPrismaJson = (
  value: JsonValue | null | undefined
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return Prisma.JsonNull;
  }
  return value as Prisma.InputJsonValue;
};

const areStepsValid = (steps: unknown): steps is WorkflowStepPayload[] => {
  if (!Array.isArray(steps)) {
    return false;
  }

  return steps.every((step) => {
    if (!step || typeof step !== 'object') {
      return false;
    }

    const currentStep = step as Record<string, unknown>;
    if (
      typeof currentStep.name !== 'string' ||
      currentStep.name.trim().length === 0
    ) {
      return false;
    }
    if (
      typeof currentStep.order !== 'number' ||
      !Number.isInteger(currentStep.order)
    ) {
      return false;
    }
    if (
      typeof currentStep.type !== 'string' ||
      toStepType(currentStep.type) === null
    ) {
      return false;
    }
    if (
      typeof currentStep.status === 'string' &&
      !isValidStepStatus(currentStep.status)
    ) {
      return false;
    }

    return true;
  });
};

const isWebhookTriggerConfigValid = (
  triggerConfig: unknown
): boolean => {
  if (triggerConfig === undefined || triggerConfig === null) {
    return true;
  }
  if (!isObject(triggerConfig)) {
    return false;
  }
  if (
    triggerConfig.secret !== undefined &&
    typeof triggerConfig.secret !== 'string'
  ) {
    return false;
  }
  return true;
};

const isScheduledTriggerConfigValid = (
  triggerConfig: unknown
): boolean => {
  if (!isObject(triggerConfig)) {
    return false;
  }
  if (typeof triggerConfig.cronExpression !== 'string') {
    return false;
  }
  return triggerConfig.cronExpression.trim().length > 0;
};

export class WorkflowManagementService {
  static async createWorkflow(input: CreateWorkflowInput) {
    const steps = input.steps ?? [];

    if (!input.name || !input.createdBy) {
      throw new AppError('name and createdBy are required', 400);
    }

    if (input.status && !isValidWorkflowStatus(input.status)) {
      throw new AppError('Invalid workflow status', 400);
    }

    if (!areStepsValid(steps)) {
      throw new AppError(
        'Invalid steps payload. Each step requires name, type (http_request|delay|log), and integer order.',
        400
      );
    }

    const parsedTriggerType = input.triggerType
      ? toTriggerType(input.triggerType)
      : TriggerType.MANUAL;

    if (!parsedTriggerType) {
      throw new AppError(
        'Invalid triggerType. Allowed values: webhook|scheduled|manual',
        400
      );
    }

    if (
      parsedTriggerType === TriggerType.WEBHOOK &&
      !isWebhookTriggerConfigValid(input.triggerConfig)
    ) {
      throw new AppError(
        'Invalid webhook triggerConfig. Expected object with optional string secret.',
        400
      );
    }

    if (
      parsedTriggerType === TriggerType.SCHEDULED &&
      !isScheduledTriggerConfigValid(input.triggerConfig)
    ) {
      throw new AppError(
        'Invalid scheduled triggerConfig. Expected object with string cronExpression.',
        400
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: input.createdBy },
      select: { id: true },
    });

    if (!user) {
      throw new AppError('User not found for createdBy', 404);
    }

    const normalizedStatus =
      input.status && isValidWorkflowStatus(input.status)
        ? (input.status as WorkflowStatus)
        : undefined;

    const workflow = await prisma.workflow.create({
      data: {
        name: input.name.trim(),
        description: input.description,
        status: normalizedStatus,
        triggerType: parsedTriggerType,
        triggerConfig: toPrismaJson(
          input.triggerConfig as JsonValue | null | undefined
        ),
        createdBy: input.createdBy,
        steps: {
          create: steps.map((step) => ({
            name: step.name.trim(),
            description: step.description,
            type: toStepType(step.type) as StepType,
            order: step.order,
            config: toPrismaJson(step.config as JsonValue | null | undefined),
            status: step.status,
          })),
        },
      },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (workflow.triggerType === TriggerType.SCHEDULED) {
      await scheduleWorkflowTrigger(workflow.id, workflow.triggerConfig);
    }

    return workflow;
  }

  static async getWorkflows() {
    return prisma.workflow.findMany({
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getWorkflowById(id: string) {
    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!workflow) {
      throw new AppError('Workflow not found', 404);
    }

    return workflow;
  }

  static async deleteWorkflowById(id: string): Promise<void> {
    const workflow = await prisma.workflow.findUnique({
      where: { id },
      select: {
        id: true,
        triggerType: true,
        triggerConfig: true,
      },
    });

    if (!workflow) {
      throw new AppError('Workflow not found', 404);
    }

    if (workflow.triggerType === TriggerType.SCHEDULED) {
      await unscheduleWorkflowTrigger(workflow.id, workflow.triggerConfig);
    }

    await prisma.workflow.delete({ where: { id } });
  }

  static async queueManualExecution(id: string): Promise<{ id?: string }> {
    const workflow = await prisma.workflow.findUnique({
      where: { id },
      select: {
        id: true,
        triggerType: true,
      },
    });

    if (!workflow) {
      throw new AppError('Workflow not found', 404);
    }

    if (workflow.triggerType !== TriggerType.MANUAL) {
      throw new AppError('Workflow triggerType is not manual', 400);
    }

    return enqueueWorkflowRun(id, {
      triggerSource: 'manual',
    });
  }

  static async queueWebhookExecution(
    id: string,
    webhookSecret: string | undefined,
    triggerMetadata?: Record<string, unknown>
  ): Promise<{ id?: string }> {
    const workflow = await prisma.workflow.findUnique({
      where: { id },
      select: {
        id: true,
        triggerType: true,
        triggerConfig: true,
      },
    });

    if (!workflow) {
      throw new AppError('Workflow not found', 404);
    }

    if (workflow.triggerType !== TriggerType.WEBHOOK) {
      throw new AppError('Workflow triggerType is not webhook', 400);
    }

    const webhookConfig = isObject(workflow.triggerConfig)
      ? workflow.triggerConfig
      : {};

    if (
      typeof webhookConfig.secret === 'string' &&
      webhookSecret !== webhookConfig.secret
    ) {
      throw new AppError('Invalid webhook secret', 401);
    }

    return enqueueWorkflowRun(id, {
      triggerSource: 'webhook',
      triggerMetadata,
    });
  }

  static async getExecutionLogs(id: string, limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    const normalizedLimit =
      Number.isNaN(parsedLimit) || parsedLimit <= 0
        ? 50
        : Math.min(parsedLimit, 200);

    const workflow = await prisma.workflow.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!workflow) {
      throw new AppError('Workflow not found', 404);
    }

    return prisma.executionLog.findMany({
      where: { workflowId: id },
      orderBy: { createdAt: 'desc' },
      take: normalizedLimit,
      include: {
        workflowStep: {
          select: {
            id: true,
            name: true,
            type: true,
            order: true,
          },
        },
      },
    });
  }
}

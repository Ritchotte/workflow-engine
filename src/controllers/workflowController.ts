import { NextFunction, Request, Response } from 'express';
import {
  Prisma,
  StepStatus,
  StepType,
  TriggerType,
  WorkflowStatus,
} from '../generated/prisma/client';
import { enqueueWorkflowRun } from '../queues/workflowRunQueue';
import { prisma } from '../utils/prisma';

interface WorkflowStepPayload {
  name: string;
  description?: string;
  type: string;
  order: number;
  config?: JsonValue | null;
  status?: StepStatus;
}

type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

interface CreateWorkflowRequest extends Request {
  body: {
    name: string;
    description?: string;
    status?: WorkflowStatus;
    triggerType?: string;
    triggerConfig?: JsonValue | null;
    createdBy: string;
    steps?: WorkflowStepPayload[];
  };
}

interface WorkflowParamsRequest extends Request {
  params: {
    id: string;
  };
}

interface WorkflowExecutionLogsRequest extends WorkflowParamsRequest {
  query: {
    limit?: string;
  };
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
  triggerConfig: JsonValue | null | undefined
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

/**
 * Create a workflow.
 */
export const createWorkflow = async (
  req: CreateWorkflowRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      name,
      description,
      status,
      triggerType,
      triggerConfig,
      createdBy,
      steps = [],
    } = req.body;

    if (!name || !createdBy) {
      res.status(400).json({
        status: 'error',
        message: 'name and createdBy are required',
      });
      return;
    }

    if (status && !isValidWorkflowStatus(status)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid workflow status',
      });
      return;
    }

    if (!areStepsValid(steps)) {
      res.status(400).json({
        status: 'error',
        message:
          'Invalid steps payload. Each step requires name, type (http_request|delay|log), and integer order.',
      });
      return;
    }

    const parsedTriggerType = triggerType
      ? toTriggerType(triggerType)
      : TriggerType.MANUAL;

    if (!parsedTriggerType) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid triggerType. Allowed values: webhook|manual',
      });
      return;
    }

    if (parsedTriggerType === TriggerType.SCHEDULED) {
      res.status(400).json({
        status: 'error',
        message: 'scheduled trigger support is not enabled yet',
      });
      return;
    }

    if (
      parsedTriggerType === TriggerType.WEBHOOK &&
      !isWebhookTriggerConfigValid(triggerConfig)
    ) {
      res.status(400).json({
        status: 'error',
        message:
          'Invalid webhook triggerConfig. Expected object with optional string secret.',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: createdBy },
      select: { id: true },
    });

    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found for createdBy',
      });
      return;
    }

    const workflow = await prisma.workflow.create({
      data: {
        name: name.trim(),
        description,
        status,
        triggerType: parsedTriggerType,
        triggerConfig: toPrismaJson(triggerConfig),
        createdBy,
        steps: {
          create: steps.map((step) => ({
            name: step.name.trim(),
            description: step.description,
            type: toStepType(step.type) as StepType,
            order: step.order,
            config: toPrismaJson(step.config),
            status: step.status,
          })),
        },
      },
      include: {
        steps: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    res.status(201).json({
      status: 'success',
      message: 'Workflow created successfully',
      data: workflow,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all workflows.
 */
export const getWorkflows = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const workflows = await prisma.workflow.findMany({
      include: {
        steps: {
          orderBy: {
            order: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({
      status: 'success',
      data: workflows,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a workflow by id.
 */
export const getWorkflowById = async (
  req: WorkflowParamsRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!workflow) {
      res.status(404).json({
        status: 'error',
        message: 'Workflow not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: workflow,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a workflow by id.
 */
export const deleteWorkflowById = async (
  req: WorkflowParamsRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const workflow = await prisma.workflow.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!workflow) {
      res.status(404).json({
        status: 'error',
        message: 'Workflow not found',
      });
      return;
    }

    await prisma.workflow.delete({
      where: { id },
    });

    res.status(200).json({
      status: 'success',
      message: 'Workflow deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Execute workflow steps in order.
 */
export const executeWorkflowById = async (
  req: WorkflowParamsRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const workflow = await prisma.workflow.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!workflow) {
      res.status(404).json({
        status: 'error',
        message: 'Workflow not found',
      });
      return;
    }

    const job = await enqueueWorkflowRun(id, {
      triggerSource: 'manual',
    });

    res.status(202).json({
      status: 'success',
      message: 'Workflow execution queued',
      data: {
        workflowId: id,
        jobId: job.id,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Trigger a workflow using webhook trigger configuration.
 */
export const executeWorkflowByWebhook = async (
  req: WorkflowParamsRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const workflow = await prisma.workflow.findUnique({
      where: { id },
      select: {
        id: true,
        triggerType: true,
        triggerConfig: true,
      },
    });

    if (!workflow) {
      res.status(404).json({
        status: 'error',
        message: 'Workflow not found',
      });
      return;
    }

    if (workflow.triggerType !== TriggerType.WEBHOOK) {
      res.status(400).json({
        status: 'error',
        message: 'Workflow triggerType is not webhook',
      });
      return;
    }

    const webhookConfig = isObject(workflow.triggerConfig)
      ? workflow.triggerConfig
      : {};

    if (
      typeof webhookConfig.secret === 'string' &&
      req.header('x-webhook-secret') !== webhookConfig.secret
    ) {
      res.status(401).json({
        status: 'error',
        message: 'Invalid webhook secret',
      });
      return;
    }

    const triggerMetadata = isObject(req.body)
      ? (req.body as Record<string, unknown>)
      : undefined;

    const job = await enqueueWorkflowRun(id, {
      triggerSource: 'webhook',
      triggerMetadata,
    });

    res.status(202).json({
      status: 'success',
      message: 'Workflow webhook trigger queued',
      data: {
        workflowId: id,
        jobId: job.id,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get execution logs for a workflow.
 */
export const getWorkflowExecutionLogs = async (
  req: WorkflowExecutionLogsRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const parsedLimit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
    const limit =
      Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 50 : Math.min(parsedLimit, 200);

    const workflow = await prisma.workflow.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!workflow) {
      res.status(404).json({
        status: 'error',
        message: 'Workflow not found',
      });
      return;
    }

    const logs = await prisma.executionLog.findMany({
      where: { workflowId: id },
      orderBy: { createdAt: 'desc' },
      take: limit,
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

    res.status(200).json({
      status: 'success',
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

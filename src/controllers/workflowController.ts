import { NextFunction, Request, Response } from 'express';
import { StepStatus, StepType, WorkflowStatus } from '../generated/prisma';
import { prisma } from '../utils/prisma';

interface WorkflowStepPayload {
  name: string;
  description?: string;
  type: StepType;
  order: number;
  config?: JsonValue;
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
    createdBy: string;
    steps?: WorkflowStepPayload[];
  };
}

interface WorkflowParamsRequest extends Request {
  params: {
    id: string;
  };
}

const isValidStepType = (type: string): type is StepType =>
  Object.values(StepType).includes(type as StepType);

const isValidStepStatus = (status: string): status is StepStatus =>
  Object.values(StepStatus).includes(status as StepStatus);

const isValidWorkflowStatus = (
  status: string
): status is WorkflowStatus =>
  Object.values(WorkflowStatus).includes(status as WorkflowStatus);

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
      !isValidStepType(currentStep.type)
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

/**
 * Create a workflow.
 */
export const createWorkflow = async (
  req: CreateWorkflowRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, description, status, createdBy, steps = [] } = req.body;

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
          'Invalid steps payload. Each step requires name, type, and integer order.',
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
        createdBy,
        steps: {
          create: steps.map((step) => ({
            name: step.name.trim(),
            description: step.description,
            type: step.type,
            order: step.order,
            config: step.config,
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

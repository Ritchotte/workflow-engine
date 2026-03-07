import { TriggerType, WorkflowStatus } from '../generated/prisma/client';
import {
  removeScheduledWorkflowRun,
  upsertScheduledWorkflowRun,
} from '../queues/workflowRunQueue';
import { prisma } from '../utils/prisma';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getCronExpressionFromConfig = (
  triggerConfig: unknown
): string | null => {
  if (!isObject(triggerConfig) || typeof triggerConfig.cronExpression !== 'string') {
    return null;
  }

  const cronExpression = triggerConfig.cronExpression.trim();
  return cronExpression.length > 0 ? cronExpression : null;
};

export const scheduleWorkflowTrigger = async (
  workflowId: string,
  triggerConfig: unknown
): Promise<void> => {
  const cronExpression = getCronExpressionFromConfig(triggerConfig);

  if (!cronExpression) {
    throw new Error(
      'Invalid scheduled triggerConfig. Expected object with string cronExpression.'
    );
  }

  await upsertScheduledWorkflowRun(workflowId, cronExpression);
};

export const unscheduleWorkflowTrigger = async (
  workflowId: string,
  triggerConfig: unknown
): Promise<void> => {
  const cronExpression = getCronExpressionFromConfig(triggerConfig);

  if (!cronExpression) {
    return;
  }

  await removeScheduledWorkflowRun(workflowId, cronExpression);
};

export const syncScheduledWorkflowTriggers = async (): Promise<void> => {
  const scheduledWorkflows = await prisma.workflow.findMany({
    where: {
      status: WorkflowStatus.ACTIVE,
      triggerType: TriggerType.SCHEDULED,
    },
    select: {
      id: true,
      triggerConfig: true,
    },
  });

  await Promise.all(
    scheduledWorkflows.map(async (workflow) => {
      try {
        await scheduleWorkflowTrigger(workflow.id, workflow.triggerConfig);
      } catch (error) {
        console.error('[TriggerService] Failed to sync scheduled workflow', {
          workflowId: workflow.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    })
  );
};

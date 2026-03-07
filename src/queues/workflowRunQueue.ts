import { config } from '../config';
import { createRedisConnection } from '../utils/redis';

export const WORKFLOW_RUN_JOB = 'workflow-run';

interface QueueJob {
  id?: string;
}

interface RepeatOptions {
  pattern: string;
}

interface QueueOptions {
  removeOnComplete?: number | boolean;
  removeOnFail?: number | boolean;
  attempts?: number;
  jobId?: string;
  repeat?: RepeatOptions;
  backoff?: {
    type: string;
    delay: number;
  };
}

interface QueueClient<TData> {
  add: (
    name: string,
    data: TData,
    options?: QueueOptions
  ) => Promise<QueueJob>;
  removeRepeatable: (
    name: string,
    repeat: RepeatOptions,
    jobId?: string
  ) => Promise<boolean>;
  close: () => Promise<void>;
}

interface QueueConstructor {
  new <TData = unknown>(
    queueName: string,
    options: {
      connection: unknown;
    }
  ): QueueClient<TData>;
}

const { Queue } = require('bullmq') as { Queue: QueueConstructor };

export interface WorkflowRunJobData {
  workflowId: string;
  requestedAt: string;
  triggerSource: 'manual' | 'webhook' | 'scheduled';
  triggerMetadata?: Record<string, unknown>;
}

interface EnqueueWorkflowRunOptions {
  triggerSource: WorkflowRunJobData['triggerSource'];
  triggerMetadata?: Record<string, unknown>;
}

const workflowRunQueue = new Queue<WorkflowRunJobData>(
  config.bullmq.workflowRunQueueName,
  {
    connection: createRedisConnection(),
  }
);

export const enqueueWorkflowRun = async (
  workflowId: string,
  options: EnqueueWorkflowRunOptions
): Promise<QueueJob> =>
  workflowRunQueue.add(
    WORKFLOW_RUN_JOB,
    {
      workflowId,
      requestedAt: new Date().toISOString(),
      triggerSource: options.triggerSource,
      triggerMetadata: options.triggerMetadata,
    },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: 100,
      removeOnFail: 100,
    }
  );

export const upsertScheduledWorkflowRun = async (
  workflowId: string,
  cronExpression: string
): Promise<QueueJob> =>
  workflowRunQueue.add(
    WORKFLOW_RUN_JOB,
    {
      workflowId,
      requestedAt: new Date().toISOString(),
      triggerSource: 'scheduled',
    },
    {
      jobId: `scheduled:${workflowId}`,
      repeat: {
        pattern: cronExpression,
      },
      removeOnComplete: 100,
      removeOnFail: 100,
    }
  );

export const removeScheduledWorkflowRun = async (
  workflowId: string,
  cronExpression: string
): Promise<boolean> =>
  workflowRunQueue.removeRepeatable(
    WORKFLOW_RUN_JOB,
    { pattern: cronExpression },
    `scheduled:${workflowId}`
  );

export const closeWorkflowRunQueue = async (): Promise<void> => {
  await workflowRunQueue.close();
};

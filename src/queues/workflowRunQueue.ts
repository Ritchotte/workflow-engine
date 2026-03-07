import { config } from '../config';
import { createRedisConnection } from '../utils/redis';

export const WORKFLOW_RUN_JOB = 'workflow-run';

interface QueueJob {
  id?: string;
}

interface QueueOptions {
  removeOnComplete?: number | boolean;
  removeOnFail?: number | boolean;
  attempts?: number;
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

export const closeWorkflowRunQueue = async (): Promise<void> => {
  await workflowRunQueue.close();
};

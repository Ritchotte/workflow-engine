import { config } from '../config';
import { WORKFLOW_RUN_JOB, WorkflowRunJobData } from '../queues/workflowRunQueue';
import { WorkflowStepExecutorService } from '../services/workflowStepExecutor';
import { createRedisConnection } from '../utils/redis';

interface WorkerJob<TData> {
  id?: string;
  data: TData;
}

interface WorkerClient {
  on: (
    event: 'completed' | 'failed' | 'error',
    listener: (...args: unknown[]) => void
  ) => void;
  close: () => Promise<void>;
}

interface WorkerConstructor {
  new <TData = unknown>(
    queueName: string,
    processor: (job: WorkerJob<TData>) => Promise<unknown>,
    options: {
      connection: unknown;
      concurrency?: number;
    }
  ): WorkerClient;
}

const { Worker } = require('bullmq') as { Worker: WorkerConstructor };

let workflowRunWorker: WorkerClient | null = null;

export const startWorkflowRunWorker = (): WorkerClient => {
  if (workflowRunWorker) {
    return workflowRunWorker;
  }

  workflowRunWorker = new Worker<WorkflowRunJobData>(
    config.bullmq.workflowRunQueueName,
    async (job) => {
      if (job.data.workflowId.trim().length === 0) {
        throw new Error('workflowId is required');
      }

      const result = await WorkflowStepExecutorService.executeWorkflow(
        job.data.workflowId
      );

      return {
        jobType: WORKFLOW_RUN_JOB,
        result,
      };
    },
    {
      connection: createRedisConnection(),
      concurrency: 5,
    }
  );

  workflowRunWorker.on('completed', (job, result) => {
    console.log('[Worker] Workflow run completed', {
      jobId: (job as WorkerJob<WorkflowRunJobData>)?.id,
      result,
    });
  });

  workflowRunWorker.on('failed', (job, error) => {
    console.error('[Worker] Workflow run failed', {
      jobId: (job as WorkerJob<WorkflowRunJobData> | undefined)?.id,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  workflowRunWorker.on('error', (error) => {
    console.error('[Worker] Worker error', {
      error: error instanceof Error ? error.message : String(error),
    });
  });

  return workflowRunWorker;
};

export const stopWorkflowRunWorker = async (): Promise<void> => {
  if (!workflowRunWorker) {
    return;
  }

  await workflowRunWorker.close();
  workflowRunWorker = null;
};

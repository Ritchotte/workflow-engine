import { config } from './config';
import { logger } from './utils/logger';
import {
  startWorkflowRunWorker,
  stopWorkflowRunWorker,
} from './workers/workflowRunWorker';

startWorkflowRunWorker();

logger.info(
  {
    queueName: config.bullmq.workflowRunQueueName,
  },
  'worker listening for workflow jobs'
);

const shutdown = async (signal: string): Promise<void> => {
  logger.info({ signal }, 'worker shutdown requested');
  await stopWorkflowRunWorker();
  process.exit(0);
};

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

import { config } from './config';
import {
  startWorkflowRunWorker,
  stopWorkflowRunWorker,
} from './workers/workflowRunWorker';

startWorkflowRunWorker();

console.log(
  `[${config.nodeEnv.toUpperCase()}] Worker listening on queue "${config.bullmq.workflowRunQueueName}"`
);

const shutdown = async (signal: string): Promise<void> => {
  console.log(`[Worker] Received ${signal}. Shutting down...`);
  await stopWorkflowRunWorker();
  process.exit(0);
};

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

import express, { Express } from 'express';
import cors from 'cors';
import { config } from './config';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import healthRouter from './routes/health';
import authRouter from './routes/auth';
import workflowRouter from './routes/workflow';
import { syncScheduledWorkflowTriggers } from './services/workflowTriggerService';

const app: Express = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Routes
app.use('/', healthRouter);
app.use('/auth', authRouter);
app.use('/workflows', workflowRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
  });
});

// Error handler
app.use(errorHandler);

// Start server
const startServer = (): void => {
  app.listen(config.port, () => {
    console.log(
      `[${config.nodeEnv.toUpperCase()}] Server running on http://localhost:${config.port}`
    );
    console.log('Health check: GET http://localhost:3000/health');

    void syncScheduledWorkflowTriggers()
      .then(() => {
        console.log('[TriggerService] Scheduled workflow triggers synced');
      })
      .catch((error) => {
        console.error('[TriggerService] Failed to sync scheduled triggers', {
          error: error instanceof Error ? error.message : String(error),
        });
      });
  });
};

export { app, startServer };

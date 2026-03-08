import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import healthRouter from './routes/health';
import authRouter from './routes/auth';
import workflowRouter from './routes/workflow';
import { syncScheduledWorkflowTriggers } from './services/workflowTriggerService';
import { logger } from './utils/logger';

const app: Express = express();
const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many requests, please try again later.',
  },
});

// Middleware
app.use(cors());
app.use(helmet());
app.use(apiRateLimiter);
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
    logger.info(
      {
        port: config.port,
      },
      'server started'
    );

    void syncScheduledWorkflowTriggers()
      .then(() => {
        logger.info('scheduled workflow triggers synced');
      })
      .catch((error) => {
        logger.error({
          message: 'failed to sync scheduled workflow triggers',
          error: error instanceof Error ? error.message : String(error),
        });
      });
  });
};

export { app, startServer };

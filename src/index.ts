import express, { Express } from 'express';
import cors from 'cors';
import { config } from './config';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import healthRouter from './routes/health';

const app: Express = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Routes
app.use('/', healthRouter);

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
  });
};

export { app, startServer };

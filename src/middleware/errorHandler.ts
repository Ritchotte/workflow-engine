import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { logger } from '../utils/logger';

interface ErrorWithStatus extends Error {
  status?: number;
  statusCode?: number;
  details?: unknown;
}

export const errorHandler = (
  error: ErrorWithStatus,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const candidateStatus = error.status ?? error.statusCode ?? 500;
  const status =
    Number.isInteger(candidateStatus) &&
    candidateStatus >= 400 &&
    candidateStatus <= 599
      ? candidateStatus
      : 500;

  const publicMessage =
    status >= 500 ? 'Internal Server Error' : error.message || 'Request failed';

  logger.error(
    {
      statusCode: status,
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.body,
      details: error.details,
      errorName: error.name,
      errorMessage: error.message,
      stack: config.isProduction ? undefined : error.stack,
    },
    'request failed'
  );

  res.status(status).json({
    status: 'error',
    statusCode: status,
    message: publicMessage,
  });
};

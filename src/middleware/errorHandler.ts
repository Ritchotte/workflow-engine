import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { AppError } from '../errors/appError';
import { logger } from '../utils/logger';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const appError =
    error instanceof AppError
      ? error
      : new AppError(
          error.message || 'Internal Server Error',
          500
        );

  const candidateStatus = appError.statusCode;
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
      details: appError.details,
      errorName: appError.name,
      errorMessage: appError.message,
      stack: config.isProduction ? undefined : appError.stack,
    },
    'request failed'
  );

  res.status(status).json({
    status: 'error',
    statusCode: status,
    message: publicMessage,
  });
};

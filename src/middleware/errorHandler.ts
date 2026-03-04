import { Request, Response, NextFunction } from 'express';

interface ErrorWithStatus extends Error {
  status?: number;
}

export const errorHandler = (
  error: ErrorWithStatus,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const status = error.status || 500;
  const message = error.message || 'Internal Server Error';

  console.error(`[Error] ${status}: ${message}`);

  res.status(status).json({
    status: 'error',
    statusCode: status,
    message,
  });
};

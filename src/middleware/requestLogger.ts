import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startedAt = Date.now();
  const requestId = req.header('x-request-id') ?? randomUUID();

  const requestLog = logger.child({
    requestId,
    method: req.method,
    path: req.path,
  });

  requestLog.info(
    {
      query: req.query,
      ip: req.ip,
      userAgent: req.header('user-agent'),
    },
    'request started'
  );

  res.on('finish', () => {
    requestLog.info(
      {
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
      },
      'request completed'
    );
  });

  next();
};

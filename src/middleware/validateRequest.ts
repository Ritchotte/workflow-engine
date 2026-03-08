import { NextFunction, Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';
import { ZodError, ZodTypeAny } from 'zod';

interface RequestSchemas {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

const formatZodErrors = (error: ZodError): Array<{ path: string; message: string }> =>
  error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));

export const validateRequest = (schemas: RequestSchemas) => (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (schemas.body) {
    const parsedBody = schemas.body.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid request body',
        errors: formatZodErrors(parsedBody.error),
      });
      return;
    }
    req.body = parsedBody.data;
  }

  if (schemas.params) {
    const parsedParams = schemas.params.safeParse(req.params);
    if (!parsedParams.success) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid request params',
        errors: formatZodErrors(parsedParams.error),
      });
      return;
    }
    req.params = parsedParams.data as ParamsDictionary;
  }

  if (schemas.query) {
    const parsedQuery = schemas.query.safeParse(req.query);
    if (!parsedQuery.success) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid request query',
        errors: formatZodErrors(parsedQuery.error),
      });
      return;
    }
    req.query = parsedQuery.data as ParsedQs;
  }

  next();
};

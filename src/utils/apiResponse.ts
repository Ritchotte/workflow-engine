import { Response } from 'express';
import { ApiErrorResponse, ApiSuccessResponse } from '../types/api';

export const sendSuccess = <TData>(
  res: Response<ApiSuccessResponse<TData>>,
  statusCode: number,
  data: TData,
  message?: string
): Response<ApiSuccessResponse<TData>> =>
  res.status(statusCode).json({
    status: 'success',
    message,
    data,
  });

export const sendError = (
  res: Response<ApiErrorResponse>,
  statusCode: number,
  message: string,
  details?: unknown
): Response<ApiErrorResponse> =>
  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    details,
  });

import { Request, Response } from 'express';
import { ApiSuccessResponse } from '../types/api';
import { sendSuccess } from '../utils/apiResponse';

export const getHealth = (
  _req: Request,
  res: Response<
    ApiSuccessResponse<{
      status: 'healthy';
      timestamp: string;
      uptime: number;
    }>
  >
): void => {
  sendSuccess(res, 200, {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
};

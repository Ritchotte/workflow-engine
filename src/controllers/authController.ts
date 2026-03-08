import { Request, Response } from 'express';
import { AppError } from '../errors/appError';
import { AuthManagementService } from '../services/authManagementService';
import { ApiSuccessResponse } from '../types/api';
import { sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

interface RegisterRequest extends Request {
  body: {
    email: string;
    password: string;
    name?: string;
  };
}

interface LoginRequest extends Request {
  body: {
    email: string;
    password: string;
  };
}

/**
 * Register a new user
 */
export const register = asyncHandler(async (
  req: RegisterRequest,
  res: Response<ApiSuccessResponse<{ user: unknown; token: string }>>
): Promise<void> => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }

  const payload = await AuthManagementService.registerUser({
    email,
    password,
    name,
  });

  sendSuccess(res, 201, payload, 'User registered successfully');
});

/**
 * Login a user
 */
export const login = asyncHandler(async (
  req: LoginRequest,
  res: Response<ApiSuccessResponse<{ user: unknown; token: string }>>
): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }

  const payload = await AuthManagementService.loginUser({
    email,
    password,
  });

  sendSuccess(res, 200, payload, 'Login successful');
});

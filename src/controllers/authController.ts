import { Request, Response } from 'express';
import { AppError } from '../errors/appError';
import { AuthManagementService } from '../services/authManagementService';
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
  res: Response
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

  res.status(201).json({
    status: 'success',
    message: 'User registered successfully',
    data: payload,
  });
});

/**
 * Login a user
 */
export const login = asyncHandler(async (
  req: LoginRequest,
  res: Response
): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }

  const payload = await AuthManagementService.loginUser({
    email,
    password,
  });

  res.status(200).json({
    status: 'success',
    message: 'Login successful',
    data: payload,
  });
});

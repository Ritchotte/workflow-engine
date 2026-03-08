import { AppError } from '../errors/appError';
import { authService } from './authService';
import { prisma } from '../utils/prisma';

interface RegisterUserInput {
  email: string;
  password: string;
  name?: string;
}

interface LoginUserInput {
  email: string;
  password: string;
}

export class AuthManagementService {
  static async registerUser(input: RegisterUserInput): Promise<{
    user: {
      id: string;
      email: string;
      name: string | null;
      createdAt: Date;
    };
    token: string;
  }> {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new AppError('User with this email already exists', 409);
    }

    const hashedPassword = await authService.hashPassword(input.password);
    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    const token = authService.generateToken({
      userId: user.id,
      email: user.email,
    });

    return { user, token };
  }

  static async loginUser(input: LoginUserInput): Promise<{
    user: {
      id: string;
      email: string;
      name: string | null;
    };
    token: string;
  }> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isPasswordValid = await authService.comparePasswords(
      input.password,
      user.password
    );

    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    const token = authService.generateToken({
      userId: user.id,
      email: user.email,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    };
  }
}

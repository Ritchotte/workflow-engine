import request from 'supertest';
import { app } from '../index';
import { authService } from '../services/authService';
import { prisma } from '../utils/prisma';

jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn().mockReturnThis(),
  },
}));

jest.mock('../utils/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('../services/authService', () => ({
  authService: {
    hashPassword: jest.fn(),
    comparePasswords: jest.fn(),
    generateToken: jest.fn(),
  },
}));

jest.mock('../queues/workflowRunQueue', () => ({
  enqueueWorkflowRun: jest.fn(),
  upsertScheduledWorkflowRun: jest.fn(),
  removeScheduledWorkflowRun: jest.fn(),
  WORKFLOW_RUN_JOB: 'workflow-run',
}));

const prismaMock = prisma as unknown as {
  user: {
    findUnique: jest.Mock;
    create: jest.Mock;
  };
};

const authServiceMock = authService as unknown as {
  hashPassword: jest.Mock;
  comparePasswords: jest.Mock;
  generateToken: jest.Mock;
};

describe('Auth routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers a user successfully', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    authServiceMock.hashPassword.mockResolvedValue('hashed-password');
    authServiceMock.generateToken.mockReturnValue('token-123');
    prismaMock.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'User',
      createdAt: new Date(),
    });

    const response = await request(app).post('/auth/register').send({
      email: 'user@example.com',
      password: 'password123',
      name: 'User',
    });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('success');
    expect(response.body.data.token).toBe('token-123');
    expect(prismaMock.user.create).toHaveBeenCalledTimes(1);
  });

  it('returns 409 when registering an existing email', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'existing-user',
      email: 'user@example.com',
    });

    const response = await request(app).post('/auth/register').send({
      email: 'user@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe('User with this email already exists');
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('logs in successfully with valid credentials', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'User',
      password: 'hashed-password',
    });
    authServiceMock.comparePasswords.mockResolvedValue(true);
    authServiceMock.generateToken.mockReturnValue('token-abc');

    const response = await request(app).post('/auth/login').send({
      email: 'user@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(response.body.data.token).toBe('token-abc');
    expect(authServiceMock.comparePasswords).toHaveBeenCalledWith(
      'password123',
      'hashed-password'
    );
  });

  it('returns 401 for invalid login password', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'User',
      password: 'hashed-password',
    });
    authServiceMock.comparePasswords.mockResolvedValue(false);

    const response = await request(app).post('/auth/login').send({
      email: 'user@example.com',
      password: 'bad-password',
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Invalid email or password');
  });
});

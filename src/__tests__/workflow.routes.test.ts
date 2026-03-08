import request from 'supertest';
import { app } from '../index';
import { enqueueWorkflowRun } from '../queues/workflowRunQueue';
import {
  scheduleWorkflowTrigger,
  unscheduleWorkflowTrigger,
} from '../services/workflowTriggerService';
import { prisma } from '../utils/prisma';

jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn().mockReturnThis(),
  },
}));

jest.mock('../queues/workflowRunQueue', () => ({
  enqueueWorkflowRun: jest.fn(),
  upsertScheduledWorkflowRun: jest.fn(),
  removeScheduledWorkflowRun: jest.fn(),
  WORKFLOW_RUN_JOB: 'workflow-run',
}));

jest.mock('../services/workflowTriggerService', () => ({
  scheduleWorkflowTrigger: jest.fn(),
  unscheduleWorkflowTrigger: jest.fn(),
  syncScheduledWorkflowTriggers: jest.fn(),
}));

jest.mock('../utils/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    workflow: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    executionLog: {
      findMany: jest.fn(),
    },
  },
}));

const prismaMock = prisma as unknown as {
  user: {
    findUnique: jest.Mock;
  };
  workflow: {
    create: jest.Mock;
    findUnique: jest.Mock;
    delete: jest.Mock;
    findMany: jest.Mock;
  };
};

const enqueueWorkflowRunMock = enqueueWorkflowRun as unknown as jest.Mock;
const scheduleWorkflowTriggerMock = scheduleWorkflowTrigger as unknown as jest.Mock;
const unscheduleWorkflowTriggerMock =
  unscheduleWorkflowTrigger as unknown as jest.Mock;

describe('Workflow routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a workflow successfully', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1' });
    prismaMock.workflow.create.mockResolvedValue({
      id: 'workflow-1',
      name: 'My Workflow',
      triggerType: 'MANUAL',
      triggerConfig: null,
      steps: [
        {
          id: 'step-1',
          name: 'Log',
          order: 1,
          type: 'LOG',
        },
      ],
    });

    const response = await request(app).post('/workflows').send({
      name: 'My Workflow',
      createdBy: 'user-1',
      triggerType: 'manual',
      steps: [
        {
          name: 'Log',
          type: 'log',
          order: 1,
          config: { message: 'hello', level: 'info' },
        },
      ],
    });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('success');
    expect(prismaMock.workflow.create).toHaveBeenCalledTimes(1);
    expect(scheduleWorkflowTriggerMock).not.toHaveBeenCalled();
  });

  it('returns 400 on invalid workflow steps payload', async () => {
    const response = await request(app).post('/workflows').send({
      name: 'Invalid Workflow',
      createdBy: 'user-1',
      steps: [{ name: '', type: 'unknown', order: 1 }],
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Invalid steps payload');
    expect(prismaMock.workflow.create).not.toHaveBeenCalled();
  });

  it('queues workflow execution for manual trigger', async () => {
    prismaMock.workflow.findUnique.mockResolvedValue({
      id: 'workflow-1',
      triggerType: 'MANUAL',
    });
    enqueueWorkflowRunMock.mockResolvedValue({
      id: 'job-1',
    });

    const response = await request(app).post('/workflows/workflow-1/trigger/manual');

    expect(response.status).toBe(202);
    expect(response.body.status).toBe('success');
    expect(response.body.data.jobId).toBe('job-1');
    expect(enqueueWorkflowRunMock).toHaveBeenCalledWith('workflow-1', {
      triggerSource: 'manual',
    });
  });

  it('returns 400 when executing a non-manual workflow manually', async () => {
    prismaMock.workflow.findUnique.mockResolvedValue({
      id: 'workflow-1',
      triggerType: 'SCHEDULED',
    });

    const response = await request(app).post('/workflows/workflow-1/trigger/manual');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Workflow triggerType is not manual');
    expect(enqueueWorkflowRunMock).not.toHaveBeenCalled();
    expect(unscheduleWorkflowTriggerMock).not.toHaveBeenCalled();
  });
});

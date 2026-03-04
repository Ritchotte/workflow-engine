import { prisma } from '../utils/prisma';
import { User, Workflow, WorkflowStep, ExecutionLog } from '../generated/prisma/index';

export class UserService {
  static async createUser(data: {
    email: string;
    name?: string;
    password: string;
  }): Promise<User> {
    return prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: data.password,
      },
    });
  }

  static async getUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  static async getAllUsers(): Promise<User[]> {
    return prisma.user.findMany();
  }

  static async updateUser(
    id: string,
    data: { name?: string; password?: string }
  ): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  static async deleteUser(id: string): Promise<User> {
    return prisma.user.delete({
      where: { id },
    });
  }
}

export class WorkflowService {
  static async createWorkflow(data: {
    name: string;
    description?: string;
    createdBy: string;
  }): Promise<Workflow> {
    return prisma.workflow.create({
      data: {
        name: data.name,
        description: data.description,
        createdBy: data.createdBy,
      },
    });
  }

  static async getWorkflowById(id: string): Promise<Workflow | null> {
    return prisma.workflow.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
        executionLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  static async getWorkflowsByUser(userId: string): Promise<Workflow[]> {
    return prisma.workflow.findMany({
      where: { createdBy: userId },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async updateWorkflow(
    id: string,
    data: { name?: string; description?: string; status?: string }
  ): Promise<Workflow> {
    return prisma.workflow.update({
      where: { id },
      data,
    });
  }

  static async deleteWorkflow(id: string): Promise<Workflow> {
    return prisma.workflow.delete({
      where: { id },
    });
  }
}

export class WorkflowStepService {
  static async createStep(data: {
    workflowId: string;
    name: string;
    type: string;
    order: number;
    description?: string;
    config?: Record<string, unknown>;
  }): Promise<WorkflowStep> {
    return prisma.workflowStep.create({
      data: {
        workflowId: data.workflowId,
        name: data.name,
        type: data.type as any,
        order: data.order,
        description: data.description,
        config: data.config,
      },
    });
  }

  static async getStepsByWorkflow(workflowId: string): Promise<WorkflowStep[]> {
    return prisma.workflowStep.findMany({
      where: { workflowId },
      orderBy: { order: 'asc' },
    });
  }

  static async updateStep(
    id: string,
    data: { name?: string; description?: string; config?: Record<string, unknown> }
  ): Promise<WorkflowStep> {
    return prisma.workflowStep.update({
      where: { id },
      data,
    });
  }

  static async deleteStep(id: string): Promise<WorkflowStep> {
    return prisma.workflowStep.delete({
      where: { id },
    });
  }
}

export class ExecutionLogService {
  static async createExecutionLog(data: {
    workflowId: string;
    workflowStepId?: string;
    status: string;
    startedAt: Date;
    input?: Record<string, unknown>;
  }): Promise<ExecutionLog> {
    return prisma.executionLog.create({
      data: {
        workflowId: data.workflowId,
        workflowStepId: data.workflowStepId,
        status: data.status as any,
        startedAt: data.startedAt,
        input: data.input,
      },
    });
  }

  static async completeExecutionLog(
    id: string,
    data: { output?: Record<string, unknown>; error?: string }
  ): Promise<ExecutionLog> {
    const completedAt = new Date();
    return prisma.executionLog.update({
      where: { id },
      data: {
        status: data.error ? 'FAILED' : 'COMPLETED',
        completedAt,
        output: data.output,
        error: data.error,
        duration: completedAt.getTime() - new Date(completedAt).getTime(),
      },
    });
  }

  static async getExecutionLogs(
    workflowId: string,
    limit = 50
  ): Promise<ExecutionLog[]> {
    return prisma.executionLog.findMany({
      where: { workflowId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  static async getExecutionLogStats(workflowId: string): Promise<{
    total: number;
    completed: number;
    failed: number;
    running: number;
  }> {
    const logs = await prisma.executionLog.groupBy({
      by: ['status'],
      where: { workflowId },
      _count: true,
    });

    const stats = {
      total: 0,
      completed: 0,
      failed: 0,
      running: 0,
    };

    logs.forEach((log: any) => {
      stats.total += log._count;
      if (log.status === 'COMPLETED') stats.completed += log._count;
      if (log.status === 'FAILED') stats.failed += log._count;
      if (log.status === 'RUNNING') stats.running += log._count;
    });

    return stats;
  }
}

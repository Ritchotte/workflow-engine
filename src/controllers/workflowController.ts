import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { WorkflowManagementService } from '../services/workflowManagementService';

const toMetadataObject = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

const toSingleParam = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value[0] : (value ?? '');

export const createWorkflow = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const workflow = await WorkflowManagementService.createWorkflow(
    req.body as any
  );

  res.status(201).json({
    status: 'success',
    message: 'Workflow created successfully',
    data: workflow,
  });
});

export const getWorkflows = asyncHandler(async (
  _req: Request,
  res: Response
): Promise<void> => {
  const workflows = await WorkflowManagementService.getWorkflows();
  res.status(200).json({
    status: 'success',
    data: workflows,
  });
});

export const getWorkflowById = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const workflow = await WorkflowManagementService.getWorkflowById(
    toSingleParam(req.params.id)
  );
  res.status(200).json({
    status: 'success',
    data: workflow,
  });
});

export const deleteWorkflowById = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  await WorkflowManagementService.deleteWorkflowById(toSingleParam(req.params.id));

  res.status(200).json({
    status: 'success',
    message: 'Workflow deleted successfully',
  });
});

export const executeWorkflowById = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const id = toSingleParam(req.params.id);
  const job = await WorkflowManagementService.queueManualExecution(id);

  res.status(202).json({
    status: 'success',
    message: 'Workflow execution queued',
    data: {
      workflowId: id,
      jobId: job.id,
    },
  });
});

export const executeWorkflowManually = executeWorkflowById;

export const executeWorkflowByWebhook = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const id = toSingleParam(req.params.id);
  const job = await WorkflowManagementService.queueWebhookExecution(
    id,
    req.header('x-webhook-secret') ?? undefined,
    toMetadataObject(req.body)
  );

  res.status(202).json({
    status: 'success',
    message: 'Workflow webhook trigger queued',
    data: {
      workflowId: id,
      jobId: job.id,
    },
  });
});

export const getWorkflowExecutionLogs = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const logs = await WorkflowManagementService.getExecutionLogs(
    toSingleParam(req.params.id),
    req.query.limit as string | undefined
  );

  res.status(200).json({
    status: 'success',
    data: logs,
  });
});

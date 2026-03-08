import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { WorkflowManagementService } from '../services/workflowManagementService';
import { ApiSuccessResponse } from '../types/api';
import { sendSuccess } from '../utils/apiResponse';

const toMetadataObject = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

const toSingleParam = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value[0] : (value ?? '');

export const createWorkflow = asyncHandler(async (
  req: Request,
  res: Response<ApiSuccessResponse<unknown>>
): Promise<void> => {
  const workflow = await WorkflowManagementService.createWorkflow(
    req.body as any
  );

  sendSuccess(res, 201, workflow, 'Workflow created successfully');
});

export const getWorkflows = asyncHandler(async (
  _req: Request,
  res: Response<ApiSuccessResponse<unknown>>
): Promise<void> => {
  const workflows = await WorkflowManagementService.getWorkflows();
  sendSuccess(res, 200, workflows);
});

export const getWorkflowById = asyncHandler(async (
  req: Request,
  res: Response<ApiSuccessResponse<unknown>>
): Promise<void> => {
  const workflow = await WorkflowManagementService.getWorkflowById(
    toSingleParam(req.params.id)
  );
  sendSuccess(res, 200, workflow);
});

export const deleteWorkflowById = asyncHandler(async (
  req: Request,
  res: Response<ApiSuccessResponse<null>>
): Promise<void> => {
  await WorkflowManagementService.deleteWorkflowById(toSingleParam(req.params.id));

  sendSuccess(res, 200, null, 'Workflow deleted successfully');
});

export const executeWorkflowById = asyncHandler(async (
  req: Request,
  res: Response<ApiSuccessResponse<{ workflowId: string; jobId: string | undefined }>>
): Promise<void> => {
  const id = toSingleParam(req.params.id);
  const job = await WorkflowManagementService.queueManualExecution(id);

  sendSuccess(
    res,
    202,
    {
      workflowId: id,
      jobId: job.id,
    },
    'Workflow execution queued'
  );
});

export const executeWorkflowManually = executeWorkflowById;

export const executeWorkflowByWebhook = asyncHandler(async (
  req: Request,
  res: Response<ApiSuccessResponse<{ workflowId: string; jobId: string | undefined }>>
): Promise<void> => {
  const id = toSingleParam(req.params.id);
  const job = await WorkflowManagementService.queueWebhookExecution(
    id,
    req.header('x-webhook-secret') ?? undefined,
    toMetadataObject(req.body)
  );

  sendSuccess(
    res,
    202,
    {
      workflowId: id,
      jobId: job.id,
    },
    'Workflow webhook trigger queued'
  );
});

export const getWorkflowExecutionLogs = asyncHandler(async (
  req: Request,
  res: Response<ApiSuccessResponse<unknown>>
): Promise<void> => {
  const logs = await WorkflowManagementService.getExecutionLogs(
    toSingleParam(req.params.id),
    req.query.limit as string | undefined
  );

  sendSuccess(res, 200, logs);
});

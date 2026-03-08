import { z } from 'zod';

const workflowStepSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  type: z.string(),
  order: z.number().int(),
  config: z.unknown().optional(),
  status: z.string().optional(),
});

export const workflowIdParamsSchema = z.object({
  id: z.string(),
});

export const createWorkflowBodySchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  status: z.string().optional(),
  triggerType: z.string().optional(),
  triggerConfig: z.unknown().optional(),
  createdBy: z.string(),
  steps: z.array(workflowStepSchema).optional(),
});

export const workflowExecutionLogsQuerySchema = z.object({
  limit: z.string().optional(),
});

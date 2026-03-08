import { Router } from 'express';
import {
  createWorkflow,
  deleteWorkflowById,
  executeWorkflowById,
  executeWorkflowManually,
  executeWorkflowByWebhook,
  getWorkflowExecutionLogs,
  getWorkflowById,
  getWorkflows,
} from '../controllers/workflowController';
import { validateRequest } from '../middleware/validateRequest';
import {
  createWorkflowBodySchema,
  workflowExecutionLogsQuerySchema,
  workflowIdParamsSchema,
} from '../validators/workflowValidators';

const router = Router();

router.post('/', validateRequest({ body: createWorkflowBodySchema }), createWorkflow);
router.get('/', getWorkflows);
router.get('/:id', validateRequest({ params: workflowIdParamsSchema }), getWorkflowById);
router.get(
  '/:id/execution-logs',
  validateRequest({
    params: workflowIdParamsSchema,
    query: workflowExecutionLogsQuerySchema,
  }),
  getWorkflowExecutionLogs
);
router.post(
  '/:id/execute',
  validateRequest({ params: workflowIdParamsSchema }),
  executeWorkflowById
);
router.post(
  '/:id/trigger/manual',
  validateRequest({ params: workflowIdParamsSchema }),
  executeWorkflowManually
);
router.post(
  '/:id/trigger/webhook',
  validateRequest({ params: workflowIdParamsSchema }),
  executeWorkflowByWebhook
);
router.delete(
  '/:id',
  validateRequest({ params: workflowIdParamsSchema }),
  deleteWorkflowById
);

export default router;

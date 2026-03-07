import { Router } from 'express';
import {
  createWorkflow,
  deleteWorkflowById,
  executeWorkflowById,
  executeWorkflowByWebhook,
  getWorkflowExecutionLogs,
  getWorkflowById,
  getWorkflows,
} from '../controllers/workflowController';

const router = Router();

router.post('/', createWorkflow);
router.get('/', getWorkflows);
router.get('/:id', getWorkflowById);
router.get('/:id/execution-logs', getWorkflowExecutionLogs);
router.post('/:id/execute', executeWorkflowById);
router.post('/:id/trigger/webhook', executeWorkflowByWebhook);
router.delete('/:id', deleteWorkflowById);

export default router;

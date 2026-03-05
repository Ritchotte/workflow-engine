import { Router } from 'express';
import {
  createWorkflow,
  deleteWorkflowById,
  getWorkflowById,
  getWorkflows,
} from '../controllers/workflowController';

const router = Router();

router.post('/', createWorkflow);
router.get('/', getWorkflows);
router.get('/:id', getWorkflowById);
router.delete('/:id', deleteWorkflowById);

export default router;

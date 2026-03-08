import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from '../docs/openapi';

const router = Router();

router.get('/openapi.json', (_req, res) => {
  res.status(200).json(openApiSpec);
});

router.use('/', swaggerUi.serve, swaggerUi.setup(openApiSpec));

export default router;

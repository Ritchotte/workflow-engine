import { Router } from 'express';
import { register, login } from '../controllers/authController';
import { validateRequest } from '../middleware/validateRequest';
import { loginBodySchema, registerBodySchema } from '../validators/authValidators';

const router = Router();

router.post('/register', validateRequest({ body: registerBodySchema }), register);
router.post('/login', validateRequest({ body: loginBodySchema }), login);

export default router;

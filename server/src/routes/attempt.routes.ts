import { Router } from 'express';
import * as attempts from '../controllers/attempt.controller';
import { requireAuth } from '../middleware/requireAuth';
import { validateBody } from '../middleware/validateBody';
import { submitAttemptSchema } from '../validators/attempt.schemas';

export const attemptRouter = Router();

attemptRouter.use(requireAuth);

attemptRouter.get('/', attempts.listMine);
attemptRouter.get('/:attemptId', attempts.getResult);
attemptRouter.post('/:attemptId/submit', validateBody(submitAttemptSchema), attempts.submit);

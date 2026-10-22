import { Router } from 'express';
import * as quizzes from '../controllers/quiz.controller';
import { requireAuth } from '../middleware/requireAuth';

export const quizRouter = Router();

quizRouter.use(requireAuth);

quizRouter.get('/', quizzes.listQuizzes);
quizRouter.post('/:quizId/attempts', quizzes.startQuiz);

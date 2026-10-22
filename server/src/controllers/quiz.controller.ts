import type { Request, Response } from 'express';
import { currentUserId } from '../middleware/requireAuth';
import { startAttempt } from '../services/attempt.service';
import { listQuizzesForStudent } from '../services/quiz.service';
import { parseObjectId } from '../utils/objectId';

export async function listQuizzes(req: Request, res: Response) {
  const quizzes = await listQuizzesForStudent(currentUserId(req));
  res.json({ data: { quizzes } });
}

export async function startQuiz(req: Request, res: Response) {
  const quizId = parseObjectId(req.params.quizId, 'quiz id');
  const { resumed, session } = await startAttempt(currentUserId(req), quizId);

  // 201 for a new attempt, 200 when an open one is handed back.
  res.status(resumed ? 200 : 201).json({ data: { resumed, ...session } });
}

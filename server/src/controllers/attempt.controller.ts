import type { Request, Response } from 'express';
import { currentUserId } from '../middleware/requireAuth';
import { getAttemptResult, listMyAttempts, submitAttempt } from '../services/attempt.service';
import { parseObjectId } from '../utils/objectId';
import type { SubmitAttemptInput } from '../validators/attempt.schemas';

export async function submit(req: Request, res: Response) {
  const attemptId = parseObjectId(req.params.attemptId, 'attempt id');
  const { answers } = req.body as SubmitAttemptInput;

  const result = await submitAttempt(currentUserId(req), attemptId, answers);
  res.json({ data: { result } });
}

export async function getResult(req: Request, res: Response) {
  const attemptId = parseObjectId(req.params.attemptId, 'attempt id');
  const result = await getAttemptResult(currentUserId(req), attemptId);
  res.json({ data: { result } });
}

export async function listMine(req: Request, res: Response) {
  const attempts = await listMyAttempts(currentUserId(req));
  res.json({ data: { attempts } });
}

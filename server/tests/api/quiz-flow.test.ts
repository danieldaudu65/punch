import { Types } from 'mongoose';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { AttemptModel } from '../../src/models/Attempt';
import { UserModel } from '../../src/models/User';
import { useTestDatabase } from '../helpers/db';
import { answersFor, app, completeQuiz, createQuiz, createStudent, startQuiz, submitAnswers } from '../helpers/factories';

useTestDatabase();

// A 4-question quiz: 10 XP per correct answer, +25 for a perfect score.
const PERFECT_XP = 4 * 10 + 25;

describe('Quiz list and start', () => {
  it('lists published quizzes without any correct answers', async () => {
    await createQuiz({ slug: 'visible' });
    await createQuiz({ slug: 'hidden', isPublished: false });
    const { agent } = await createStudent();

    const res = await agent.get('/api/quizzes');

    expect(res.status).toBe(200);
    expect(res.body.data.quizzes.map((q: { slug: string }) => q.slug)).toEqual(['visible']);
    expect(JSON.stringify(res.body)).not.toMatch(/correctIndex|explanation/);
  });

  it('requires a login', async () => {
    const res = await request(app).get('/api/quizzes');
    expect(res.status).toBe(401);
  });

  it('hands out questions without the answers', async () => {
    const quiz = await createQuiz({ slug: 'start' });
    const { agent } = await createStudent();

    const res = await agent.post(`/api/quizzes/${quiz.id}/attempts`);

    expect(res.status).toBe(201);
    expect(res.body.data.questions).toHaveLength(4);
    expect(res.body.data.isPractice).toBe(false);
    expect(JSON.stringify(res.body)).not.toMatch(/correctIndex|explanation/);
  });

  it('resumes the open attempt instead of creating a second one', async () => {
    const quiz = await createQuiz({ slug: 'resume' });
    const { agent } = await createStudent();

    const first = await agent.post(`/api/quizzes/${quiz.id}/attempts`);
    const second = await agent.post(`/api/quizzes/${quiz.id}/attempts`);

    expect(second.status).toBe(200);
    expect(second.body.data.resumed).toBe(true);
    expect(second.body.data.attemptId).toBe(first.body.data.attemptId);
    expect(await AttemptModel.countDocuments()).toBe(1);
  });

  it('returns 404 for an unpublished or missing quiz', async () => {
    const hidden = await createQuiz({ slug: 'draft', isPublished: false });
    const { agent } = await createStudent();

    expect((await agent.post(`/api/quizzes/${hidden.id}/attempts`)).status).toBe(404);
    expect((await agent.post(`/api/quizzes/${new Types.ObjectId()}/attempts`)).status).toBe(404);
  });

  it('returns 400 for a malformed quiz id', async () => {
    const { agent } = await createStudent();
    const res = await agent.post('/api/quizzes/not-an-id/attempts');
    expect(res.status).toBe(400);
  });
});

describe('Submitting a quiz', () => {
  it('grades on the server and awards XP', async () => {
    const quiz = await createQuiz({ slug: 'grade' });
    const { agent, id } = await createStudent();

    const res = await completeQuiz(agent, quiz, 3);

    expect(res.status).toBe(200);
    expect(res.body.data.result).toMatchObject({
      correctCount: 3,
      totalQuestions: 4,
      percentage: 75,
      xpAwarded: 30,
      isPractice: false,
    });
    expect(res.body.data.result.review).toHaveLength(4);

    const user = await UserModel.findById(id);
    expect(user?.xp).toBe(30);
    expect(user?.quizzesCompleted).toBe(1);
  });

  it('ignores any score the client tries to send', async () => {
    const quiz = await createQuiz({ slug: 'cheat' });
    const { agent, id } = await createStudent();
    const { attemptId } = await startQuiz(agent, quiz.id);

    const res = await agent
      .post(`/api/attempts/${attemptId}/submit`)
      .send({ answers: answersFor(quiz, 0), score: 100, xpAwarded: 5000, correctCount: 4 });

    expect(res.status).toBe(200);
    expect(res.body.data.result.correctCount).toBe(0);
    expect((await UserModel.findById(id))?.xp).toBe(0);
  });

  it('counts unanswered questions as wrong', async () => {
    const quiz = await createQuiz({ slug: 'partial' });
    const { agent } = await createStudent();
    const { attemptId } = await startQuiz(agent, quiz.id);

    const res = await submitAnswers(agent, attemptId, answersFor(quiz, 4).slice(0, 2));

    expect(res.body.data.result.correctCount).toBe(2);
    expect(res.body.data.result.review[3].selectedIndex).toBeNull();
  });
});

describe('Duplicate protection', () => {
  it('rejects a second submit of the same attempt and keeps XP unchanged', async () => {
    const quiz = await createQuiz({ slug: 'twice' });
    const { agent, id } = await createStudent();
    const { attemptId } = await startQuiz(agent, quiz.id);

    const first = await submitAnswers(agent, attemptId, answersFor(quiz, 4));
    const second = await submitAnswers(agent, attemptId, answersFor(quiz, 4));

    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('ATTEMPT_ALREADY_SUBMITTED');
    expect((await UserModel.findById(id))?.xp).toBe(PERFECT_XP);
  });

  it('pays out only once when two submits arrive at the same moment', async () => {
    const quiz = await createQuiz({ slug: 'race' });
    const { agent, id } = await createStudent();
    const { attemptId } = await startQuiz(agent, quiz.id);

    const responses = await Promise.all([
      submitAnswers(agent, attemptId, answersFor(quiz, 4)),
      submitAnswers(agent, attemptId, answersFor(quiz, 4)),
    ]);

    expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);

    const user = await UserModel.findById(id);
    expect(user?.xp).toBe(PERFECT_XP);
    expect(user?.quizzesCompleted).toBe(1);
    expect(await AttemptModel.countDocuments({ rewarded: true })).toBe(1);
  });

  it('treats a retake as practice worth 0 XP', async () => {
    const quiz = await createQuiz({ slug: 'retake' });
    const { agent, id } = await createStudent();
    await completeQuiz(agent, quiz, 2);

    const retakeStart = await startQuiz(agent, quiz.id);
    expect(retakeStart.isPractice).toBe(true);

    const retake = await submitAnswers(agent, retakeStart.attemptId, answersFor(quiz, 4));

    expect(retake.status).toBe(200);
    expect(retake.body.data.result).toMatchObject({ percentage: 100, xpAwarded: 0, isPractice: true });

    const user = await UserModel.findById(id);
    expect(user?.xp).toBe(20);
    expect(user?.quizzesCompleted).toBe(1);
  });

  it('enforces one rewarded attempt per quiz in the database itself', async () => {
    const quiz = await createQuiz({ slug: 'index' });
    const { id } = await createStudent();
    const base = { user: id, quiz: quiz.id, status: 'submitted', rewarded: true };

    await AttemptModel.create(base);
    await expect(AttemptModel.create(base)).rejects.toMatchObject({ code: 11000 });
  });
});

describe('Invalid submissions', () => {
  async function openAttempt() {
    const quiz = await createQuiz({ slug: `invalid-${new Types.ObjectId()}` });
    const student = await createStudent();
    const { attemptId } = await startQuiz(student.agent, quiz.id);
    return { quiz, attemptId, ...student };
  }

  it('rejects a question from another quiz', async () => {
    const { agent, attemptId } = await openAttempt();
    const res = await submitAnswers(agent, attemptId, [{ questionKey: 'someone-else-1', selectedIndex: 0 }]);

    expect(res.status).toBe(400);
  });

  it('rejects the same question answered twice', async () => {
    const { agent, attemptId, quiz } = await openAttempt();
    const key = quiz.questions[0].key;
    const res = await submitAnswers(agent, attemptId, [
      { questionKey: key, selectedIndex: 0 },
      { questionKey: key, selectedIndex: 1 },
    ]);

    expect(res.status).toBe(400);
  });

  it('rejects an option that does not exist', async () => {
    const { agent, attemptId, quiz } = await openAttempt();
    const res = await submitAnswers(agent, attemptId, [{ questionKey: quiz.questions[0].key, selectedIndex: 7 }]);

    expect(res.status).toBe(400);
  });

  it('rejects a body with the wrong shape', async () => {
    const { agent, attemptId } = await openAttempt();
    const res = await agent.post(`/api/attempts/${attemptId}/submit`).send({ answers: 'all correct please' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('keeps the attempt open after a rejected submit', async () => {
    const { agent, attemptId, quiz } = await openAttempt();
    await submitAnswers(agent, attemptId, [{ questionKey: 'bad', selectedIndex: 0 }]);

    const retry = await submitAnswers(agent, attemptId, answersFor(quiz, 4));
    expect(retry.status).toBe(200);
  });

  it('returns 400 for a malformed attempt id and 404 for a missing one', async () => {
    const { agent } = await createStudent();

    expect((await submitAnswers(agent, 'not-an-id', [])).status).toBe(400);
    expect((await submitAnswers(agent, String(new Types.ObjectId()), [])).status).toBe(404);
  });
});

describe('Access control', () => {
  it('stops a student submitting or viewing someone else’s attempt', async () => {
    const quiz = await createQuiz({ slug: 'owner' });
    const owner = await createStudent('Owner');
    const intruder = await createStudent('Intruder');
    const { attemptId } = await startQuiz(owner.agent, quiz.id);

    const submit = await submitAnswers(intruder.agent, attemptId, answersFor(quiz, 4));
    expect(submit.status).toBe(403);

    await submitAnswers(owner.agent, attemptId, answersFor(quiz, 2));
    const view = await intruder.agent.get(`/api/attempts/${attemptId}`);
    expect(view.status).toBe(403);

    expect((await UserModel.findById(intruder.id))?.xp).toBe(0);
  });

  it('requires a login to submit', async () => {
    const res = await request(app).post(`/api/attempts/${new Types.ObjectId()}/submit`).send({ answers: [] });
    expect(res.status).toBe(401);
  });
});

describe('Time limit', () => {
  it('rejects a submit after the time limit and grace period', async () => {
    const quiz = await createQuiz({ slug: 'slow', timeLimitSec: 60 });
    const { agent, id } = await createStudent();
    const { attemptId } = await startQuiz(agent, quiz.id);

    // Pretend the attempt started 2 minutes 30 seconds ago (limit 60s + 60s grace).
    await AttemptModel.updateOne({ _id: attemptId }, { startedAt: new Date(Date.now() - 150_000) });

    const res = await submitAnswers(agent, attemptId, answersFor(quiz, 4));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ATTEMPT_EXPIRED');
    expect((await AttemptModel.findById(attemptId))?.status).toBe('expired');
    expect((await UserModel.findById(id))?.xp).toBe(0);
  });

  it('lets the student start fresh after an attempt expires', async () => {
    const quiz = await createQuiz({ slug: 'restart', timeLimitSec: 60 });
    const { agent } = await createStudent();
    const first = await startQuiz(agent, quiz.id);
    await AttemptModel.updateOne({ _id: first.attemptId }, { startedAt: new Date(Date.now() - 150_000) });

    const res = await agent.post(`/api/quizzes/${quiz.id}/attempts`);

    expect(res.status).toBe(201);
    expect(res.body.data.attemptId).not.toBe(first.attemptId);
  });
});

describe('Results and history', () => {
  it('shows a past result with the full review', async () => {
    const quiz = await createQuiz({ slug: 'history' });
    const { agent } = await createStudent();
    const { attemptId } = await startQuiz(agent, quiz.id);
    await submitAnswers(agent, attemptId, answersFor(quiz, 3));

    const res = await agent.get(`/api/attempts/${attemptId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.result).toMatchObject({ correctCount: 3, percentage: 75 });
    expect(res.body.data.result.review[0]).toHaveProperty('correctIndex');
  });

  it('will not show results for an attempt still in progress', async () => {
    const quiz = await createQuiz({ slug: 'peek' });
    const { agent } = await createStudent();
    const { attemptId } = await startQuiz(agent, quiz.id);

    const res = await agent.get(`/api/attempts/${attemptId}`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ATTEMPT_NOT_SUBMITTED');
  });

  it('lists only the student’s own submitted attempts, newest first', async () => {
    const quizA = await createQuiz({ slug: 'list-a' });
    const quizB = await createQuiz({ slug: 'list-b' });
    const me = await createStudent();
    const other = await createStudent();

    await completeQuiz(me.agent, quizA, 1);
    await completeQuiz(me.agent, quizB, 2);
    await completeQuiz(other.agent, quizA, 4);
    await startQuiz(me.agent, quizA.id); // open, not submitted

    const res = await me.agent.get('/api/attempts');

    expect(res.body.data.attempts.map((a: { quiz: { title: string } }) => a.quiz.title)).toEqual([
      'Quiz list-b',
      'Quiz list-a',
    ]);
  });
});

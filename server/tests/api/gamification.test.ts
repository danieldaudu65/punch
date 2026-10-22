import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { AttemptModel } from '../../src/models/Attempt';
import { UserModel } from '../../src/models/User';
import { useTestDatabase } from '../helpers/db';
import { answersFor, app, completeQuiz, createQuiz, createStudent, startQuiz, submitAnswers } from '../helpers/factories';

useTestDatabase();

function badgeKeys(res: request.Response): string[] {
  return res.body.data.result.newBadges.map((b: { key: string }) => b.key).sort();
}

describe('Badges after a quiz', () => {
  it('awards badges in the same submit and reports them as new', async () => {
    const quizA = await createQuiz({ slug: 'badge-a' });
    await createQuiz({ slug: 'badge-b' });
    const { agent, id } = await createStudent();

    // A perfect score submitted instantly: First Steps, Perfect Score and Speed Run.
    const res = await completeQuiz(agent, quizA, 4);

    expect(badgeKeys(res)).toEqual(['first-steps', 'perfect-score', 'speed-run']);
    const user = await UserModel.findById(id);
    expect(user?.badges.map((b) => b.key).sort()).toEqual(['first-steps', 'perfect-score', 'speed-run']);
  });

  it('does not give Speed Run when the quiz took too long', async () => {
    const quiz = await createQuiz({ slug: 'slowpoke' });
    await createQuiz({ slug: 'other' });
    const { agent } = await createStudent();
    const { attemptId } = await startQuiz(agent, quiz.id);

    // Started 2 minutes ago: inside the 5-minute limit, but over the 90-second Speed Run.
    await AttemptModel.updateOne({ _id: attemptId }, { startedAt: new Date(Date.now() - 120_000) });
    const res = await submitAnswers(agent, attemptId, answersFor(quiz, 4));

    expect(badgeKeys(res)).toEqual(['first-steps', 'perfect-score']);
  });

  it('awards All-Rounder once every quiz is completed', async () => {
    const quizA = await createQuiz({ slug: 'round-a' });
    const quizB = await createQuiz({ slug: 'round-b' });
    const { agent } = await createStudent();

    await completeQuiz(agent, quizA, 1);
    const res = await completeQuiz(agent, quizB, 1);

    expect(badgeKeys(res)).toContain('all-rounder');
  });

  it('awards Sharp Shooter for 80%+ on three different quizzes', async () => {
    const quizzes = await Promise.all(['ss-1', 'ss-2', 'ss-3', 'ss-4'].map((slug) => createQuiz({ slug })));
    const { agent } = await createStudent();

    await completeQuiz(agent, quizzes[0], 4);
    const second = await completeQuiz(agent, quizzes[1], 4);
    expect(badgeKeys(second)).not.toContain('sharp-shooter');

    const third = await completeQuiz(agent, quizzes[2], 4);
    expect(badgeKeys(third)).toContain('sharp-shooter');
  });

  it('never awards the same badge twice', async () => {
    const quiz = await createQuiz({ slug: 'repeat' });
    await createQuiz({ slug: 'repeat-other' });
    const { agent, id } = await createStudent();

    await completeQuiz(agent, quiz, 4);
    const retake = await completeQuiz(agent, quiz, 4);

    expect(retake.body.data.result.newBadges).toEqual([]);
    const keys = (await UserModel.findById(id))!.badges.map((b) => b.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('reports a level up', async () => {
    const quiz = await createQuiz({ slug: 'level-up' });
    const { agent } = await createStudent();

    // 65 XP moves a Rookie (0) past Explorer (50).
    const res = await completeQuiz(agent, quiz, 4);

    expect(res.body.data.result.leveledUp).toBe(true);
    expect(res.body.data.result.student.level).toMatchObject({ level: 2, title: 'Explorer' });
  });
});

describe('GET /api/dashboard', () => {
  it('shows name, XP, quizzes completed and badges', async () => {
    const quizA = await createQuiz({ slug: 'dash-a' });
    await createQuiz({ slug: 'dash-b' });
    const { agent } = await createStudent('Dashboard Student');
    await completeQuiz(agent, quizA, 3);

    const res = await agent.get('/api/dashboard');

    expect(res.status).toBe(200);
    expect(res.body.data.student.name).toBe('Dashboard Student');
    expect(res.body.data.stats).toMatchObject({
      xp: 30,
      quizzesCompleted: 1,
      totalQuizzes: 2,
      averageScore: 75,
      rank: 1,
      badgesEarned: 2,
      totalBadges: 5,
    });
    expect(res.body.data.badges).toHaveLength(5);
    expect(res.body.data.badges.filter((b: { earned: boolean }) => b.earned)).toHaveLength(2);
    expect(res.body.data.recentAttempts).toHaveLength(1);
  });

  it('requires a login', async () => {
    expect((await request(app).get('/api/dashboard')).status).toBe(401);
  });
});

describe('GET /api/leaderboard', () => {
  async function seedStudents() {
    const top = await createStudent('Top');
    const tieA = await createStudent('Tie A');
    const tieB = await createStudent('Tie B');
    const me = await createStudent('Me');
    await UserModel.updateOne({ _id: top.id }, { xp: 300 });
    await UserModel.updateOne({ _id: tieA.id }, { xp: 150 });
    await UserModel.updateOne({ _id: tieB.id }, { xp: 150 });
    await UserModel.updateOne({ _id: me.id }, { xp: 20 });
    return me;
  }

  it('ranks students by XP with shared ranks for ties', async () => {
    const me = await seedStudents();
    const res = await me.agent.get('/api/leaderboard');

    expect(res.status).toBe(200);
    expect(res.body.data.top.map((e: { name: string; rank: number }) => [e.name, e.rank])).toEqual([
      ['Top', 1],
      ['Tie A', 2],
      ['Tie B', 2],
      ['Me', 4],
    ]);
    expect(res.body.data.totalStudents).toBe(4);
  });

  it('always includes the current student, even outside the top list', async () => {
    const me = await seedStudents();
    const res = await me.agent.get('/api/leaderboard?limit=2');

    expect(res.body.data.top).toHaveLength(2);
    expect(res.body.data.me).toMatchObject({ name: 'Me', rank: 4, isMe: true });
  });

  it('never exposes email addresses', async () => {
    const me = await seedStudents();
    const res = await me.agent.get('/api/leaderboard');

    expect(JSON.stringify(res.body)).not.toMatch(/@example\.com|email/);
  });

  it('updates after a quiz is completed', async () => {
    const quiz = await createQuiz({ slug: 'climb' });
    const me = await seedStudents();

    // 20 + 65 = 85 XP: still behind the ties at 150, so rank stays 4.
    await completeQuiz(me.agent, quiz, 4);
    const res = await me.agent.get('/api/leaderboard');

    expect(res.body.data.me).toMatchObject({ xp: 85, rank: 4 });
  });

  it('rejects an out-of-range limit', async () => {
    const { agent } = await createStudent();
    expect((await agent.get('/api/leaderboard?limit=500')).status).toBe(400);
    expect((await agent.get('/api/leaderboard?limit=abc')).status).toBe(400);
  });

  it('requires a login', async () => {
    expect((await request(app).get('/api/leaderboard')).status).toBe(401);
  });
});

describe('Unknown routes', () => {
  it('returns 404 rather than 401 for an unknown API path', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

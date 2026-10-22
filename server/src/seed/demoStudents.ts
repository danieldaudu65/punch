import { randomBytes } from 'node:crypto';
import type { Types } from 'mongoose';
import { AttemptModel } from '../models/Attempt';
import { UserModel } from '../models/User';
import { evaluateBadges, SHARP_SHOOTER_MIN_PERCENT, SPEED_RUN_MAX_SEC, SPEED_RUN_MIN_PERCENT } from '../services/badges';
import { calculateXp, gradeAnswers, type GradableQuestion } from '../services/scoring';
import { hashPassword } from '../utils/password';
import { DEMO_ACCOUNT } from './demoAccount';


interface DemoRun {
  slug: string;
  correct: number;
  durationSec: number;
}

// Fictitious students only. No real personal data.
const DEMO_STUDENTS: { name: string; email: string; runs: DemoRun[] }[] = [
  {
    name: 'Tolu Adebayo',
    email: 'tolu.demo@example.com',
    runs: [
      { slug: 'naija-know-it-all', correct: 10, durationSec: 84 },
      { slug: 'digital-skills-101', correct: 9, durationSec: 140 },
      { slug: 'money-smart', correct: 10, durationSec: 120 },
    ],
  },
  {
    name: 'Chinedu Okafor',
    email: 'chinedu.demo@example.com',
    runs: [
      { slug: 'naija-know-it-all', correct: 8, durationSec: 150 },
      { slug: 'digital-skills-101', correct: 7, durationSec: 200 },
      { slug: 'money-smart', correct: 9, durationSec: 170 },
    ],
  },
  {
    name: 'Amina Bello',
    email: 'amina.demo@example.com',
    runs: [
      { slug: 'digital-skills-101', correct: 10, durationSec: 160 },
      { slug: 'money-smart', correct: 8, durationSec: 75 },
    ],
  },
  {
    name: 'Ifeoma Eze',
    email: 'ifeoma.demo@example.com',
    runs: [
      { slug: 'naija-know-it-all', correct: 6, durationSec: 210 },
      { slug: 'money-smart', correct: 9, durationSec: 180 },
    ],
  },
  {
    name: 'Zainab Yusuf',
    email: 'zainab.demo@example.com',
    runs: [
      { slug: 'naija-know-it-all', correct: 5, durationSec: 240 },
      { slug: 'digital-skills-101', correct: 6, durationSec: 230 },
      { slug: 'money-smart', correct: 4, durationSec: 260 },
    ],
  },
  {
    name: 'Kelechi Nwosu',
    email: 'kelechi.demo@example.com',
    runs: [{ slug: 'digital-skills-101', correct: 9, durationSec: 88 }],
  },
  {
    name: 'Musa Ibrahim',
    email: 'musa.demo@example.com',
    runs: [{ slug: 'naija-know-it-all', correct: 7, durationSec: 190 }],
  },
  {
    name: 'Bisi Lawal',
    email: 'bisi.demo@example.com',
    runs: [{ slug: 'money-smart', correct: 3, durationSec: 280 }],
  },
];

interface SeededQuiz {
  _id: Types.ObjectId;
  slug: string;
  questions: GradableQuestion[];
}

/** First `correct` questions right, the rest deliberately wrong. */
function buildAnswers(questions: GradableQuestion[], correct: number) {
  return questions.map((q, i) => ({
    questionKey: q.key,
    selectedIndex: i < correct ? q.correctIndex : (q.correctIndex + 1) % q.options.length,
  }));
}

/**
 * Recreates the demo students from scratch with real attempts, scored by the
 * same functions the API uses, so their XP, badges and history all agree.
 */
export async function seedDemoStudents(quizzes: SeededQuiz[]) {
  const quizBySlug = new Map(quizzes.map((q) => [q.slug, q]));
  const demoEmails = [DEMO_ACCOUNT.email, ...DEMO_STUDENTS.map((s) => s.email)];

  const oldUsers = await UserModel.find({ email: { $in: demoEmails } }).select('_id');
  await AttemptModel.deleteMany({ user: { $in: oldUsers.map((u) => u._id) } });
  await UserModel.deleteMany({ _id: { $in: oldUsers.map((u) => u._id) } });

  await UserModel.create({
    name: DEMO_ACCOUNT.name,
    email: DEMO_ACCOUNT.email,
    passwordHash: await hashPassword(DEMO_ACCOUNT.password),
  });
  console.log(`Demo login ready: ${DEMO_ACCOUNT.email} / ${DEMO_ACCOUNT.password}`);

  for (const [studentIndex, student] of DEMO_STUDENTS.entries()) {
    // Nobody can log in as these students: their password is random and never shown.
    const user = await UserModel.create({
      name: student.name,
      email: student.email,
      passwordHash: await hashPassword(randomBytes(24).toString('hex')),
    });

    let xp = 0;
    const completedQuizIds: string[] = [];
    let perfectScoreCount = 0;
    let quizzesAtOrAbove80 = 0;
    let hasSpeedRun = false;

    for (const [runIndex, run] of student.runs.entries()) {
      const quiz = quizBySlug.get(run.slug);
      if (!quiz) throw new Error(`Demo run refers to unknown quiz "${run.slug}"`);

      const answers = buildAnswers(quiz.questions, run.correct);
      const grade = gradeAnswers(quiz.questions, answers);
      const xpAwarded = calculateXp(grade.correctCount, grade.totalQuestions, true);

      // Spread attempts over the past few days so history looks natural.
      const submittedAt = new Date(Date.now() - ((studentIndex + 1) * 7 + runIndex) * 60 * 60 * 1000);

      await AttemptModel.create({
        user: user._id,
        quiz: quiz._id,
        status: 'submitted',
        startedAt: new Date(submittedAt.getTime() - run.durationSec * 1000),
        submittedAt,
        answers,
        correctCount: grade.correctCount,
        totalQuestions: grade.totalQuestions,
        percentage: grade.percentage,
        durationSec: run.durationSec,
        xpAwarded,
        rewarded: true,
      });

      xp += xpAwarded;
      completedQuizIds.push(String(quiz._id));
      if (grade.percentage === 100) perfectScoreCount++;
      if (grade.percentage >= SHARP_SHOOTER_MIN_PERCENT) quizzesAtOrAbove80++;
      if (grade.percentage >= SPEED_RUN_MIN_PERCENT && run.durationSec <= SPEED_RUN_MAX_SEC) hasSpeedRun = true;
    }

    const badgeKeys = evaluateBadges({
      completedQuizIds,
      publishedQuizIds: quizzes.map((q) => String(q._id)),
      perfectScoreCount,
      quizzesAtOrAbove80,
      hasSpeedRun,
    });

    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: {
          xp,
          quizzesCompleted: student.runs.length,
          badges: badgeKeys.map((key) => ({ key, earnedAt: new Date() })),
        },
      },
    );

    console.log(`Demo student: ${student.name} — ${xp} XP, ${badgeKeys.length} badge(s)`);
  }
}

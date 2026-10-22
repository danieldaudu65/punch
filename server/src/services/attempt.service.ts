import mongoose, { type Types } from 'mongoose';
import { AttemptModel, type AttemptDocument } from '../models/Attempt';
import { QuizModel } from '../models/Quiz';
import { UserModel } from '../models/User';
import { AppError } from '../utils/AppError';
import { isDuplicateKeyError } from '../utils/mongoErrors';
import {
  assertValidAnswers,
  calculateXp,
  gradeAnswers,
  type GradableQuestion,
  type SubmittedAnswer,
} from './scoring';
import { toPublicBadge, type BadgeKey } from './badges';
import { awardNewBadges } from './gamification.service';
import { getLevelInfo } from './levels';

// Extra seconds allowed after the timer ends, for slow networks.
const SUBMIT_GRACE_SEC = 60;

interface QuizForAttempt {
  _id: Types.ObjectId;
  title: string;
  description: string;
  timeLimitSec: number;
  questions: GradableQuestion[];
}

function deadlineFor(startedAt: Date, timeLimitSec: number): Date {
  return new Date(startedAt.getTime() + (timeLimitSec + SUBMIT_GRACE_SEC) * 1000);
}

async function loadQuiz(quizId: Types.ObjectId | string): Promise<QuizForAttempt> {
  const quiz = await QuizModel.findOne({ _id: quizId, isPublished: true })
    .select('title description timeLimitSec questions')
    .lean<QuizForAttempt>();

  if (!quiz) throw AppError.notFound('Quiz not found');
  return quiz;
}

async function hasBeenRewarded(userId: string, quizId: Types.ObjectId | string, session?: mongoose.ClientSession) {
  const found = await AttemptModel.exists({ user: userId, quiz: quizId, rewarded: true }).session(session ?? null);
  return found !== null;
}

/** What the student sees while taking the quiz. Correct answers are left out. */
function toQuizSession(attempt: AttemptDocument, quiz: QuizForAttempt, isPractice: boolean) {
  return {
    attemptId: attempt.id as string,
    startedAt: attempt.startedAt,
    endsAt: new Date(attempt.startedAt.getTime() + quiz.timeLimitSec * 1000),
    timeLimitSec: quiz.timeLimitSec,
    isPractice,
    quiz: { id: String(quiz._id), title: quiz.title, description: quiz.description },
    questions: quiz.questions.map((q) => ({ key: q.key, prompt: q.prompt, options: q.options })),
  };
}

/**
 * Starts a quiz, or resumes the student's open attempt if one exists.
 * An open attempt whose time has fully run out is closed as expired
 * and a fresh one is created.
 */
export async function startAttempt(userId: string, quizId: string) {
  const quiz = await loadQuiz(quizId);

  let attempt = await AttemptModel.findOne({ user: userId, quiz: quiz._id, status: 'in_progress' });

  if (attempt && new Date() > deadlineFor(attempt.startedAt, quiz.timeLimitSec)) {
    attempt.status = 'expired';
    await attempt.save();
    attempt = null;
  }

  let resumed = attempt !== null;

  if (!attempt) {
    try {
      attempt = await AttemptModel.create({ user: userId, quiz: quiz._id });
    } catch (err) {
      // Two "start" requests raced; the unique index let only one through.
      if (!isDuplicateKeyError(err)) throw err;
      attempt = await AttemptModel.findOne({ user: userId, quiz: quiz._id, status: 'in_progress' });
      if (!attempt) throw err;
      resumed = true;
    }
  }

  const isPractice = await hasBeenRewarded(userId, quiz._id);
  return { resumed, session: toQuizSession(attempt, quiz, isPractice) };
}

/**
 * Grades a submission on the server and pays out rewards at most once.
 *
 * Inside one transaction we:
 *   1. flip the attempt from in_progress to submitted (only succeeds once),
 *   2. decide whether this is the student's first completion of the quiz,
 *   3. add XP and the completion count to the student,
 *   4. award any badges the student now qualifies for.
 * If any step fails, none of it is saved.
 */
export async function submitAttempt(userId: string, attemptId: string, answers: SubmittedAnswer[]) {
  const attempt = await AttemptModel.findById(attemptId);

  if (!attempt) throw AppError.notFound('Attempt not found');
  if (!attempt.user.equals(userId)) throw AppError.forbidden('This attempt belongs to another student');
  if (attempt.status === 'submitted') throw AppError.conflict('This attempt has already been submitted', 'ATTEMPT_ALREADY_SUBMITTED');
  if (attempt.status === 'expired') throw AppError.conflict('This attempt has expired. Start the quiz again.', 'ATTEMPT_EXPIRED');

  const quiz = await loadQuiz(attempt.quiz);
  assertValidAnswers(quiz.questions, answers);

  const now = new Date();
  if (now > deadlineFor(attempt.startedAt, quiz.timeLimitSec)) {
    await AttemptModel.updateOne({ _id: attempt._id, status: 'in_progress' }, { $set: { status: 'expired' } });
    throw AppError.conflict('Time is up for this attempt. Start the quiz again.', 'ATTEMPT_EXPIRED');
  }

  const grade = gradeAnswers(quiz.questions, answers);
  const durationSec = Math.round((now.getTime() - attempt.startedAt.getTime()) / 1000);

  const dbSession = await mongoose.startSession();
  try {
    let outcome!: {
      xpAwarded: number;
      rewarded: boolean;
      xp: number;
      quizzesCompleted: number;
      newBadgeKeys: BadgeKey[];
    };

    await dbSession.withTransaction(async () => {
      const rewarded = !(await hasBeenRewarded(userId, quiz._id, dbSession));
      const xpAwarded = calculateXp(grade.correctCount, grade.totalQuestions, rewarded);

      // The status filter makes this a one-time switch. A second submit finds nothing to update.
      const updated = await AttemptModel.findOneAndUpdate(
        { _id: attempt._id, status: 'in_progress' },
        {
          $set: {
            status: 'submitted',
            submittedAt: now,
            answers,
            correctCount: grade.correctCount,
            totalQuestions: grade.totalQuestions,
            percentage: grade.percentage,
            durationSec,
            xpAwarded,
            rewarded,
          },
        },
        { new: true, session: dbSession },
      );

      if (!updated) throw AppError.conflict('This attempt has already been submitted', 'ATTEMPT_ALREADY_SUBMITTED');

      const user = rewarded
        ? await UserModel.findByIdAndUpdate(
            userId,
            { $inc: { xp: xpAwarded, quizzesCompleted: 1 } },
            { new: true, session: dbSession },
          )
        : await UserModel.findById(userId).session(dbSession);

      if (!user) throw AppError.unauthorized();

      const newBadgeKeys = await awardNewBadges(userId, dbSession);

      outcome = { xpAwarded, rewarded, xp: user.xp, quizzesCompleted: user.quizzesCompleted, newBadgeKeys };
    });

    const levelBefore = getLevelInfo(outcome.xp - outcome.xpAwarded);
    const levelNow = getLevelInfo(outcome.xp);

    return {
      attemptId: attempt.id as string,
      quiz: { id: String(quiz._id), title: quiz.title },
      correctCount: grade.correctCount,
      totalQuestions: grade.totalQuestions,
      percentage: grade.percentage,
      durationSec,
      xpAwarded: outcome.xpAwarded,
      isPractice: !outcome.rewarded,
      submittedAt: now,
      review: grade.review,
      newBadges: outcome.newBadgeKeys.map(toPublicBadge).filter((b) => b !== null),
      leveledUp: levelNow.level > levelBefore.level,
      student: {
        xp: outcome.xp,
        quizzesCompleted: outcome.quizzesCompleted,
        level: levelNow,
      },
    };
  } catch (err) {
    // The one-reward index caught a race between two different attempts.
    if (isDuplicateKeyError(err)) {
      throw AppError.conflict(
        'Rewards for this quiz were already claimed. Refresh to see your result.',
        'REWARD_ALREADY_CLAIMED',
      );
    }
    throw err;
  } finally {
    await dbSession.endSession();
  }
}

/** Full result of a submitted attempt, for the results and review screen. */
export async function getAttemptResult(userId: string, attemptId: string) {
  const attempt = await AttemptModel.findById(attemptId);

  if (!attempt) throw AppError.notFound('Attempt not found');
  if (!attempt.user.equals(userId)) throw AppError.forbidden('This attempt belongs to another student');
  if (attempt.status !== 'submitted') throw AppError.conflict('This attempt has not been submitted yet', 'ATTEMPT_NOT_SUBMITTED');

  // Use the quiz even if unpublished later, so old results still open.
  const quiz = await QuizModel.findById(attempt.quiz)
    .select('title description timeLimitSec questions')
    .lean<QuizForAttempt>();
  if (!quiz) throw AppError.notFound('Quiz not found');

  const savedAnswers = attempt.answers.map((a) => ({ questionKey: a.questionKey, selectedIndex: a.selectedIndex }));
  const grade = gradeAnswers(quiz.questions, savedAnswers);

  return {
    attemptId: attempt.id as string,
    quiz: { id: String(quiz._id), title: quiz.title },
    correctCount: attempt.correctCount,
    totalQuestions: attempt.totalQuestions,
    percentage: attempt.percentage,
    durationSec: attempt.durationSec,
    xpAwarded: attempt.xpAwarded,
    isPractice: !attempt.rewarded,
    submittedAt: attempt.submittedAt,
    review: grade.review,
  };
}

/** The student's most recent submitted attempts. */
export async function listMyAttempts(userId: string, limit = 20) {
  const attempts = await AttemptModel.find({ user: userId, status: 'submitted' })
    .sort({ submittedAt: -1 })
    .limit(limit)
    .populate<{ quiz: { _id: Types.ObjectId; title: string } | null }>('quiz', 'title')
    .lean();

  return attempts.map((a) => ({
    attemptId: String(a._id),
    quiz: a.quiz ? { id: String(a.quiz._id), title: a.quiz.title } : null,
    correctCount: a.correctCount,
    totalQuestions: a.totalQuestions,
    percentage: a.percentage,
    xpAwarded: a.xpAwarded,
    isPractice: !a.rewarded,
    submittedAt: a.submittedAt,
  }));
}

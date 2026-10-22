import { Types } from 'mongoose';
import { AttemptModel } from '../models/Attempt';
import { QuizModel } from '../models/Quiz';
import { maxXpForQuiz } from './scoring';

interface QuizProgressRow {
  _id: Types.ObjectId;
  attempts: number;
  bestPercentage: number;
  completed: boolean;
}

/** All published quizzes, plus how this student has done on each. Answers are never included. */
export async function listQuizzesForStudent(userId: string) {
  const [quizzes, progressRows] = await Promise.all([
    QuizModel.aggregate<{
      _id: Types.ObjectId;
      slug: string;
      title: string;
      description: string;
      category: string;
      difficulty: string;
      accent: string;
      timeLimitSec: number;
      questionCount: number;
    }>([
      { $match: { isPublished: true } },
      { $sort: { createdAt: 1 } },
      {
        $project: {
          slug: 1,
          title: 1,
          description: 1,
          category: 1,
          difficulty: 1,
          accent: 1,
          timeLimitSec: 1,
          questionCount: { $size: '$questions' },
        },
      },
    ]),
    AttemptModel.aggregate<QuizProgressRow>([
      { $match: { user: new Types.ObjectId(userId), status: 'submitted' } },
      {
        $group: {
          _id: '$quiz',
          attempts: { $sum: 1 },
          bestPercentage: { $max: '$percentage' },
          completed: { $max: '$rewarded' },
        },
      },
    ]),
  ]);

  const progressByQuiz = new Map(progressRows.map((row) => [String(row._id), row]));

  return quizzes.map((quiz) => {
    const progress = progressByQuiz.get(String(quiz._id));
    return {
      id: String(quiz._id),
      slug: quiz.slug,
      title: quiz.title,
      description: quiz.description,
      category: quiz.category,
      difficulty: quiz.difficulty,
      accent: quiz.accent,
      timeLimitSec: quiz.timeLimitSec,
      questionCount: quiz.questionCount,
      maxXp: maxXpForQuiz(quiz.questionCount),
      progress: {
        completed: progress?.completed ?? false,
        attempts: progress?.attempts ?? 0,
        bestPercentage: progress?.bestPercentage ?? null,
      },
    };
  });
}

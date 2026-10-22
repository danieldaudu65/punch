import type { Types } from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/db';
import { AttemptModel } from '../models/Attempt';
import { QuizModel } from '../models/Quiz';
import { UserModel } from '../models/User';
import type { GradableQuestion } from '../services/scoring';
import { seedDemoStudents } from './demoStudents';
import { seedQuizzes } from './quizzes';

/**
 * Safe to run any number of times:
 * - quizzes are matched by slug and updated in place, keeping question keys,
 *   so attempts by real test accounts still work;
 * - demo students are deleted and recreated, so their data is always consistent.
 */
async function seed() {
  await connectDatabase();

  // Make sure the unique indexes exist before the app takes traffic.
  await Promise.all([UserModel.init(), QuizModel.init(), AttemptModel.init()]);

  const quizzes: { _id: Types.ObjectId; slug: string; questions: GradableQuestion[] }[] = [];

  for (const quiz of seedQuizzes) {
    const saved = await QuizModel.findOneAndUpdate(
      { slug: quiz.slug },
      { $set: { ...quiz, isPublished: true } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    ).lean<{ _id: Types.ObjectId; slug: string; questions: GradableQuestion[] }>();

    if (!saved) throw new Error(`Could not save quiz ${quiz.slug}`);
    quizzes.push(saved);
    console.log(`Quiz ready: ${quiz.title} (${quiz.questions.length} questions)`);
  }

  await seedDemoStudents(quizzes);

  console.log('Seeding complete.');
}

seed()
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exitCode = 1;
  })
  .finally(disconnectDatabase);

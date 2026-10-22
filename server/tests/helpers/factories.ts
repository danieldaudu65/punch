import request from 'supertest';
import { createApp } from '../../src/app';
import { QuizModel } from '../../src/models/Quiz';

export const app = createApp();

export const TEST_PASSWORD = 'password123';

let studentCounter = 0;

/** Registers a fictitious student and returns an agent that keeps their session cookie. */
export async function createStudent(name = 'Test Student') {
  studentCounter++;
  const email = `student${studentCounter}@example.com`;
  const agent = request.agent(app);

  const res = await agent.post('/api/auth/register').send({ name, email, password: TEST_PASSWORD });
  if (res.status !== 201) {
    throw new Error(`Could not register test student: ${res.status} ${JSON.stringify(res.body)}`);
  }

  return { agent, email, id: res.body.data.user.id as string };
}

interface QuizOptions {
  slug: string;
  questionCount?: number;
  timeLimitSec?: number;
  isPublished?: boolean;
}

/** A small quiz with predictable answers: question i has correct option i % 4. */
export async function createQuiz({ slug, questionCount = 4, timeLimitSec = 300, isPublished = true }: QuizOptions) {
  const quiz = await QuizModel.create({
    slug,
    title: `Quiz ${slug}`,
    description: 'A quiz used in automated tests',
    category: 'Testing',
    timeLimitSec,
    isPublished,
    questions: Array.from({ length: questionCount }, (_, i) => ({
      key: `${slug}-${i + 1}`,
      prompt: `Test question ${i + 1}`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctIndex: i % 4,
      explanation: `The answer is option ${i % 4}`,
    })),
  });

  return { id: quiz.id as string, slug, questions: quiz.questions };
}

type TestQuiz = Awaited<ReturnType<typeof createQuiz>>;

/** The first `correctCount` answers are right; the rest are deliberately wrong. */
export function answersFor(quiz: TestQuiz, correctCount: number) {
  return quiz.questions.map((q, i) => ({
    questionKey: q.key,
    selectedIndex: i < correctCount ? q.correctIndex : (q.correctIndex + 1) % q.options.length,
  }));
}

type Agent = ReturnType<typeof request.agent>;

export async function startQuiz(agent: Agent, quizId: string) {
  const res = await agent.post(`/api/quizzes/${quizId}/attempts`);
  if (res.status !== 201 && res.status !== 200) {
    throw new Error(`Could not start quiz: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.data as { attemptId: string; isPractice: boolean; resumed: boolean };
}

export function submitAnswers(agent: Agent, attemptId: string, answers: { questionKey: string; selectedIndex: number }[]) {
  return agent.post(`/api/attempts/${attemptId}/submit`).send({ answers });
}

/** Start a quiz and submit it in one go. Returns the submit response. */
export async function completeQuiz(agent: Agent, quiz: TestQuiz, correctCount: number) {
  const { attemptId } = await startQuiz(agent, quiz.id);
  return submitAnswers(agent, attemptId, answersFor(quiz, correctCount));
}

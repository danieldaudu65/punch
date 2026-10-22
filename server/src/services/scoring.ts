import { AppError } from '../utils/AppError';

/**
 * Pure scoring rules. No database access here, so every rule can be
 * unit-tested directly and the numbers can be explained line by line.
 */

export const XP_PER_CORRECT_ANSWER = 10;
export const PERFECT_SCORE_BONUS = 25;

export interface GradableQuestion {
  key: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation?: string | null;
}

export interface SubmittedAnswer {
  questionKey: string;
  selectedIndex: number;
}

export interface QuestionReview {
  questionKey: string;
  prompt: string;
  options: string[];
  selectedIndex: number | null;
  correctIndex: number;
  isCorrect: boolean;
  explanation: string;
}

export interface GradeResult {
  correctCount: number;
  totalQuestions: number;
  percentage: number;
  review: QuestionReview[];
}

/**
 * Rejects answers that could not have come from a real quiz screen:
 * unknown questions, the same question answered twice, or an option
 * index that does not exist. Unanswered questions are allowed (the timer
 * can run out) and simply count as wrong.
 */
export function assertValidAnswers(questions: GradableQuestion[], answers: SubmittedAnswer[]): void {
  const optionCountByKey = new Map(questions.map((q) => [q.key, q.options.length]));
  const seen = new Set<string>();

  for (const answer of answers) {
    const optionCount = optionCountByKey.get(answer.questionKey);

    if (optionCount === undefined) {
      throw AppError.badRequest(`Question "${answer.questionKey}" is not part of this quiz`);
    }
    if (seen.has(answer.questionKey)) {
      throw AppError.badRequest(`Question "${answer.questionKey}" was answered more than once`);
    }
    if (answer.selectedIndex >= optionCount) {
      throw AppError.badRequest(`Answer for "${answer.questionKey}" is not a valid option`);
    }

    seen.add(answer.questionKey);
  }
}

export function gradeAnswers(questions: GradableQuestion[], answers: SubmittedAnswer[]): GradeResult {
  const selectedByKey = new Map(answers.map((a) => [a.questionKey, a.selectedIndex]));

  const review = questions.map<QuestionReview>((question) => {
    const selectedIndex = selectedByKey.get(question.key) ?? null;
    return {
      questionKey: question.key,
      prompt: question.prompt,
      options: question.options,
      selectedIndex,
      correctIndex: question.correctIndex,
      isCorrect: selectedIndex === question.correctIndex,
      explanation: question.explanation ?? '',
    };
  });

  const correctCount = review.filter((r) => r.isCorrect).length;
  const totalQuestions = questions.length;
  const percentage = totalQuestions === 0 ? 0 : Math.round((correctCount / totalQuestions) * 100);

  return { correctCount, totalQuestions, percentage, review };
}

/**
 * XP is only paid on a student's first completed attempt of a quiz.
 * Retakes are practice: still scored, but worth 0 XP, so nobody can
 * farm points by repeating the same quiz.
 */
export function calculateXp(correctCount: number, totalQuestions: number, isFirstCompletion: boolean): number {
  if (!isFirstCompletion) return 0;

  const isPerfect = totalQuestions > 0 && correctCount === totalQuestions;
  return correctCount * XP_PER_CORRECT_ANSWER + (isPerfect ? PERFECT_SCORE_BONUS : 0);
}

export function maxXpForQuiz(totalQuestions: number): number {
  return calculateXp(totalQuestions, totalQuestions, true);
}

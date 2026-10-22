import { describe, expect, it } from 'vitest';
import {
  PERFECT_SCORE_BONUS,
  XP_PER_CORRECT_ANSWER,
  assertValidAnswers,
  calculateXp,
  gradeAnswers,
  maxXpForQuiz,
  type GradableQuestion,
} from '../../src/services/scoring';

const questions: GradableQuestion[] = [
  { key: 'q1', prompt: 'One', options: ['a', 'b', 'c', 'd'], correctIndex: 0, explanation: 'Because a' },
  { key: 'q2', prompt: 'Two', options: ['a', 'b', 'c', 'd'], correctIndex: 1 },
  { key: 'q3', prompt: 'Three', options: ['a', 'b'], correctIndex: 1 },
];

describe('gradeAnswers', () => {
  it('counts correct answers and works out the percentage', () => {
    const result = gradeAnswers(questions, [
      { questionKey: 'q1', selectedIndex: 0 },
      { questionKey: 'q2', selectedIndex: 3 },
      { questionKey: 'q3', selectedIndex: 1 },
    ]);

    expect(result.correctCount).toBe(2);
    expect(result.totalQuestions).toBe(3);
    expect(result.percentage).toBe(67);
  });

  it('marks unanswered questions as wrong', () => {
    const result = gradeAnswers(questions, [{ questionKey: 'q1', selectedIndex: 0 }]);

    expect(result.correctCount).toBe(1);
    expect(result.review[1]).toMatchObject({ questionKey: 'q2', selectedIndex: null, isCorrect: false });
  });

  it('grades in quiz order no matter what order answers arrive in', () => {
    const result = gradeAnswers(questions, [
      { questionKey: 'q3', selectedIndex: 1 },
      { questionKey: 'q1', selectedIndex: 0 },
    ]);

    expect(result.review.map((r) => r.questionKey)).toEqual(['q1', 'q2', 'q3']);
    expect(result.correctCount).toBe(2);
  });

  it('returns a review with the correct answer and explanation for each question', () => {
    const result = gradeAnswers(questions, [{ questionKey: 'q1', selectedIndex: 2 }]);

    expect(result.review[0]).toMatchObject({ correctIndex: 0, selectedIndex: 2, explanation: 'Because a' });
    expect(result.review[1].explanation).toBe('');
  });

  it('scores an empty submission as zero', () => {
    expect(gradeAnswers(questions, []).percentage).toBe(0);
  });
});

describe('assertValidAnswers', () => {
  it('accepts a normal submission', () => {
    expect(() => assertValidAnswers(questions, [{ questionKey: 'q1', selectedIndex: 3 }])).not.toThrow();
  });

  it('rejects a question that is not in the quiz', () => {
    expect(() => assertValidAnswers(questions, [{ questionKey: 'other-quiz-1', selectedIndex: 0 }])).toThrow(
      /not part of this quiz/,
    );
  });

  it('rejects the same question answered twice', () => {
    expect(() =>
      assertValidAnswers(questions, [
        { questionKey: 'q1', selectedIndex: 0 },
        { questionKey: 'q1', selectedIndex: 1 },
      ]),
    ).toThrow(/more than once/);
  });

  it('rejects an option that does not exist', () => {
    // q3 only has two options (0 and 1).
    expect(() => assertValidAnswers(questions, [{ questionKey: 'q3', selectedIndex: 2 }])).toThrow(/not a valid option/);
  });
});

describe('calculateXp', () => {
  it('pays per correct answer on the first completion', () => {
    expect(calculateXp(7, 10, true)).toBe(7 * XP_PER_CORRECT_ANSWER);
  });

  it('adds the perfect-score bonus only for a perfect score', () => {
    expect(calculateXp(10, 10, true)).toBe(10 * XP_PER_CORRECT_ANSWER + PERFECT_SCORE_BONUS);
    expect(calculateXp(9, 10, true)).toBe(9 * XP_PER_CORRECT_ANSWER);
  });

  it('pays nothing for a retake, even a perfect one', () => {
    expect(calculateXp(10, 10, false)).toBe(0);
  });

  it('pays nothing for zero correct answers', () => {
    expect(calculateXp(0, 10, true)).toBe(0);
  });

  it('caps a 10-question quiz at 125 XP', () => {
    expect(maxXpForQuiz(10)).toBe(125);
  });
});

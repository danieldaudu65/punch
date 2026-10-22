import clsx from 'clsx';
import { Check, Minus, X } from 'lucide-react';
import type { QuestionReview } from '../../lib/types';

/** Every question with what the student picked, the right answer, and why. */
export function AnswerReview({ review }: { review: QuestionReview[] }) {
  return (
    <ol className="review-list">
      {review.map((item, i) => {
        const skipped = item.selectedIndex === null;
        const state = item.isCorrect ? 'correct' : skipped ? 'skipped' : 'wrong';

        return (
          <li key={item.questionKey} className={`review-item review-item--${state}`}>
            <div className="review-item__head">
              <span className="review-item__icon" aria-hidden="true">
                {item.isCorrect ? <Check size={16} strokeWidth={3} /> : skipped ? <Minus size={16} strokeWidth={3} /> : <X size={16} strokeWidth={3} />}
              </span>
              <p className="review-item__prompt">
                <span className="visually-hidden">
                  Question {i + 1}, {item.isCorrect ? 'correct' : skipped ? 'not answered' : 'wrong'}.{' '}
                </span>
                {item.prompt}
              </p>
            </div>

            <ul className="review-item__options">
              {skipped && <li className="review-option review-option--skipped">You left this blank</li>}
              {item.options.map((option, optionIndex) => {
                const isRight = optionIndex === item.correctIndex;
                const isPicked = optionIndex === item.selectedIndex;
                if (!isRight && !isPicked) return null;
                return (
                  <li
                    key={optionIndex}
                    className={clsx('review-option', isRight ? 'review-option--right' : 'review-option--picked')}
                  >
                    <span className="review-option__tag">{isRight ? (isPicked ? 'Your answer, correct' : 'Correct answer') : 'Your answer'}</span>
                    {option}
                  </li>
                );
              })}
            </ul>

            {item.explanation && <p className="review-item__explanation">{item.explanation}</p>}
          </li>
        );
      })}
    </ol>
  );
}

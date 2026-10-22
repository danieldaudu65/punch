import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, ArrowRight, Info, Timer, X } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '../../components/Button';
import { ApiError } from '../../lib/api';
import type { QuizSession } from '../../lib/types';
import { AnswerOption } from './AnswerOption';
import { useSubmitAttempt } from './quiz.api';
import { formatClock, useCountdown } from './useCountdown';
import { useSavedAnswers } from './useSavedAnswers';

const LOW_TIME_SEC = 30;

type Problem = { kind: 'expired' | 'error'; message: string } | null;

/**
 * Runs one attempt from first question to submit.
 * Mount it with key={attemptId}, so a new attempt always starts clean.
 */
export function QuizRunner({ session, onRestart }: { session: QuizSession; onRestart: () => void }) {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const submit = useSubmitAttempt();
  const { answers, choose, clear } = useSavedAnswers(session.attemptId);

  const questions = session.questions;
  const total = questions.length;
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [reviewing, setReviewing] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [problem, setProblem] = useState<Problem>(null);
  const submittedRef = useRef(false);

  const question = questions[index];
  const answeredCount = questions.filter((q) => answers[q.key] !== undefined).length;
  const isLast = index === total - 1;

  const sendAnswers = useCallback(async () => {
    // One submit per attempt from this screen. The server enforces it too.
    if (submittedRef.current) return;
    submittedRef.current = true;
    setProblem(null);

    const payload = questions
      .filter((q) => answers[q.key] !== undefined)
      .map((q) => ({ questionKey: q.key, selectedIndex: answers[q.key] }));

    try {
      const { result } = await submit.mutateAsync({ attemptId: session.attemptId, answers: payload });
      clear();
      navigate(`/results/${result.attemptId}`, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'ATTEMPT_ALREADY_SUBMITTED') {
        // Submitted in another tab, or a retry after a lost response: just show the result.
        clear();
        navigate(`/results/${session.attemptId}`, { replace: true });
        return;
      }
      if (err instanceof ApiError && err.code === 'ATTEMPT_EXPIRED') {
        clear();
        setProblem({ kind: 'expired', message: err.message });
        return;
      }
      // Network or server trouble: let them try again with the same answers.
      submittedRef.current = false;
      setProblem({
        kind: 'error',
        message: err instanceof ApiError ? err.message : 'Your answers could not be sent. Try again.',
      });
    }
  }, [answers, clear, navigate, questions, session.attemptId, submit]);

  const secondsLeft = useCountdown(session.endsAt, () => {
    setTimeUp(true);
    void sendAnswers();
  });

  function goTo(nextIndex: number) {
    setDirection(nextIndex > index ? 1 : -1);
    setIndex(nextIndex);
    setReviewing(false);
  }

  function next() {
    if (isLast) setReviewing(true);
    else goTo(index + 1);
  }

  // Keyboard: 1–4 or A–D to answer, arrows to move, Enter to continue.
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (reviewing || submit.isPending || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const key = event.key.toLowerCase();
      const byNumber = Number(key) - 1;
      const byLetter = 'abcdef'.indexOf(key);
      const optionIndex = Number.isInteger(byNumber) && byNumber >= 0 ? byNumber : byLetter;

      if (optionIndex >= 0 && optionIndex < question.options.length) {
        choose(question.key, optionIndex);
      } else if (key === 'arrowright' || (key === 'enter' && target.tagName !== 'BUTTON')) {
        next();
      } else if (key === 'arrowleft' && index > 0) {
        goTo(index - 1);
      }
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  if (problem?.kind === 'expired') {
    return (
      <div className="quiz-shell">
        <div className="quiz-ended" role="alert">
          <Timer size={36} aria-hidden="true" />
          <h1>Time ran out on this attempt</h1>
          <p>{problem.message} Your next attempt starts with a fresh timer.</p>
          <div className="quiz-ended__actions">
            <Button variant="primary" onClick={onRestart}>
              Start again
            </Button>
            <Link to="/dashboard" className="btn btn--quiet">
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const lowTime = secondsLeft !== null && secondsLeft <= LOW_TIME_SEC;
  const slide = reduceMotion ? 0 : 48;

  return (
    <div className="quiz-shell">
      <header className="quiz-top">
        <Link to="/dashboard" className="quiz-top__leave" aria-label="Leave quiz. Your answers stay saved.">
          <X size={20} aria-hidden="true" />
          <span>Leave</span>
        </Link>
        <p className="quiz-top__title">{session.quiz.title}</p>
        <p
          className={clsx('timer', lowTime && 'timer--low')}
          role="timer"
          aria-live={lowTime ? 'polite' : 'off'}
          aria-label={secondsLeft === null ? 'Time left' : `${formatClock(secondsLeft)} left`}
        >
          <Timer size={16} aria-hidden="true" />
          {secondsLeft === null ? '--:--' : formatClock(secondsLeft)}
        </p>
      </header>

      <ol className="progress-steps" aria-label={`${answeredCount} of ${total} answered`}>
        {questions.map((q, i) => (
          <li
            key={q.key}
            className={clsx(
              'progress-steps__step',
              answers[q.key] !== undefined && 'progress-steps__step--answered',
              i === index && !reviewing && 'progress-steps__step--current',
            )}
          />
        ))}
      </ol>

      {session.isPractice && (
        <p className="practice-note">
          <Info size={16} aria-hidden="true" />
          Practice round. You already earned XP for this quiz, so this one is just for learning.
        </p>
      )}

      {timeUp && submit.isPending && (
        <p className="practice-note practice-note--alert" role="status">
          <Timer size={16} aria-hidden="true" />
          Time’s up. Sending the answers you picked.
        </p>
      )}

      <main className="quiz-stage">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          {reviewing ? (
            <motion.section
              key="review"
              className="quiz-review"
              initial={{ opacity: 0, y: slide / 2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -slide / 2 }}
              transition={{ duration: 0.25 }}
              aria-labelledby="review-title"
            >
              <h1 id="review-title" className="quiz-question__prompt">
                Ready to submit?
              </h1>
              <p className="quiz-review__summary">
                You answered {answeredCount} of {total}.
                {answeredCount < total && ' Blank questions count as wrong, so you may want to go back.'}
              </p>

              <ol className="review-grid" aria-label="Jump to a question">
                {questions.map((q, i) => {
                  const done = answers[q.key] !== undefined;
                  return (
                    <li key={q.key}>
                      <button
                        type="button"
                        className={clsx('review-grid__chip', done ? 'review-grid__chip--done' : 'review-grid__chip--blank')}
                        onClick={() => goTo(i)}
                        aria-label={`Question ${i + 1}, ${done ? 'answered' : 'not answered'}`}
                      >
                        {i + 1}
                      </button>
                    </li>
                  );
                })}
              </ol>

              {problem?.kind === 'error' && (
                <div className="alert alert--error" role="alert">
                  <AlertTriangle size={16} aria-hidden="true" />
                  {problem.message}
                </div>
              )}

              <div className="quiz-actions">
                <Button variant="quiet" onClick={() => goTo(total - 1)} disabled={submit.isPending}>
                  <ArrowLeft size={18} aria-hidden="true" />
                  Back to questions
                </Button>
                <Button variant="primary" onClick={() => void sendAnswers()} loading={submit.isPending}>
                  {submit.isPending ? 'Marking your answers' : 'Submit answers'}
                </Button>
              </div>
            </motion.section>
          ) : (
            <motion.section
              key={question.key}
              className="quiz-question"
              custom={direction}
              initial={{ opacity: 0, x: direction * slide }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -slide }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="quiz-question__count">
                Question {index + 1} of {total}
              </p>
              <h1 id={`prompt-${question.key}`} className="quiz-question__prompt">
                {question.prompt}
              </h1>

              <div className="answers" role="radiogroup" aria-labelledby={`prompt-${question.key}`}>
                {question.options.map((option, optionIndex) => (
                  <AnswerOption
                    key={optionIndex}
                    index={optionIndex}
                    text={option}
                    selected={answers[question.key] === optionIndex}
                    disabled={submit.isPending}
                    onSelect={() => choose(question.key, optionIndex)}
                  />
                ))}
              </div>

              <div className="quiz-actions">
                <Button variant="quiet" onClick={() => goTo(index - 1)} disabled={index === 0}>
                  <ArrowLeft size={18} aria-hidden="true" />
                  Previous
                </Button>
                <Button variant={answers[question.key] === undefined ? 'quiet' : 'primary'} onClick={next}>
                  {isLast ? 'Review answers' : answers[question.key] === undefined ? 'Skip for now' : 'Next'}
                  <ArrowRight size={18} aria-hidden="true" />
                </Button>
              </div>

              <p className="quiz-hint">Tip: press 1 to {question.options.length} to answer, and Enter for the next question.</p>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

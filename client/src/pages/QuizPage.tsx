import { Link, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ScreenLoader } from '../components/ScreenLoader';
import { queryKeys, useQuizSession } from '../features/quiz/quiz.api';
import { QuizRunner } from '../features/quiz/QuizRunner';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ApiError } from '../lib/api';

export function QuizPage() {
  const { quizId = '' } = useParams();
  const queryClient = useQueryClient();
  const session = useQuizSession(quizId);
  useDocumentTitle(session.data?.quiz.title ?? 'Quiz');

  // Asking the server again after an expiry creates a fresh attempt.
  const restart = () => void queryClient.resetQueries({ queryKey: queryKeys.quizSession(quizId) });

  if (session.isPending) return <ScreenLoader label="Getting your questions ready" />;

  if (session.isError) {
    const notFound = session.error instanceof ApiError && (session.error.status === 404 || session.error.status === 400);
    return (
      <main className="center-page" style={{ minHeight: '100dvh', padding: '0 var(--page-gutter)' }}>
        <h1>{notFound ? 'This quiz isn’t available.' : 'The quiz didn’t load.'}</h1>
        <p>
          {notFound
            ? 'It may have been removed. Pick another one from your dashboard.'
            : 'Check your connection and try again. Your answers so far are saved on this device.'}
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          {!notFound && (
            <button type="button" className="btn btn--primary" onClick={() => void session.refetch()}>
              Try again
            </button>
          )}
          <Link to="/dashboard" className="btn btn--quiet">
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  return <QuizRunner key={session.data.attemptId} session={session.data} onRestart={restart} />;
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { AttemptResult, AttemptSummary, Dashboard, QuizListItem, QuizSession, SubmitResult, SubmittedAnswer } from '../../lib/types';
import { currentUserKey } from '../auth/auth.api';

export const queryKeys = {
  dashboard: ['dashboard'] as const,
  quizzes: ['quizzes'] as const,
  attempts: ['attempts'] as const,
  quizSession: (quizId: string) => ['quiz-session', quizId] as const,
  attemptResult: (attemptId: string) => ['attempt-result', attemptId] as const,
};

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => api<Dashboard>('/dashboard'),
  });
}

export function useQuizzes() {
  return useQuery({
    queryKey: queryKeys.quizzes,
    queryFn: async () => (await api<{ quizzes: QuizListItem[] }>('/quizzes')).quizzes,
  });
}

export function useAttemptHistory() {
  return useQuery({
    queryKey: queryKeys.attempts,
    queryFn: async () => (await api<{ attempts: AttemptSummary[] }>('/attempts')).attempts,
  });
}

/**
 * Starting a quiz is a POST, but it is safe to repeat: the server hands back
 * the student's open attempt instead of creating a second one. That is why
 * it can be a query (React StrictMode may run it twice in development).
 */
export function useQuizSession(quizId: string) {
  return useQuery({
    queryKey: queryKeys.quizSession(quizId),
    queryFn: () => api<QuizSession>(`/quizzes/${quizId}/attempts`, { method: 'POST' }),
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  });
}

export function useSubmitAttempt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ attemptId, answers }: { attemptId: string; answers: SubmittedAnswer[] }) =>
      api<{ result: SubmitResult }>(`/attempts/${attemptId}/submit`, { method: 'POST', body: { answers } }),
    onSuccess: ({ result }) => {
      // The results page opens instantly from this, without another request.
      queryClient.setQueryData(queryKeys.attemptResult(result.attemptId), result);
      queryClient.removeQueries({ queryKey: queryKeys.quizSession(result.quiz.id) });
      // XP, badges, rank and quiz progress have all changed.
      void queryClient.invalidateQueries({ queryKey: currentUserKey });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      void queryClient.invalidateQueries({ queryKey: queryKeys.quizzes });
      void queryClient.invalidateQueries({ queryKey: queryKeys.attempts });
      void queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });
}

export function useAttemptResult(attemptId: string) {
  return useQuery({
    queryKey: queryKeys.attemptResult(attemptId),
    queryFn: async () => (await api<{ result: AttemptResult }>(`/attempts/${attemptId}`)).result,
    staleTime: Infinity,
  });
}

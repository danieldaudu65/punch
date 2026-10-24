import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from '../../lib/api';
import { playSound } from '../../lib/sound';
import type { User } from '../../lib/types';

export const currentUserKey = ['auth', 'me'] as const;

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  name: string;
}

/** The logged-in student, or null when nobody is logged in. */
export function useCurrentUser() {
  return useQuery({
    queryKey: currentUserKey,
    queryFn: async () => {
      try {
        const { user } = await api<{ user: User }>('/auth/me');
        return user;
      } catch (err) {
        // Not logged in is a normal state, not an error screen.
        if (err instanceof ApiError && err.isUnauthorized) return null;
        throw err;
      }
    },
    staleTime: 5 * 60_000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => api<{ user: User }>('/auth/login', { method: 'POST', body: input }),
    onSuccess: ({ user }) => {
      playSound('success');
      queryClient.setQueryData(currentUserKey, user);
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterInput) => api<{ user: User }>('/auth/register', { method: 'POST', body: input }),
    onSuccess: ({ user }) => {
      playSound('success');
      queryClient.setQueryData(currentUserKey, user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>('/auth/logout', { method: 'POST' }),
    onSettled: async () => {
      playSound('back');
      await queryClient.cancelQueries();
      // Mark nobody as logged in first, so the route guards react straight away.
      queryClient.setQueryData(currentUserKey, null);
      // Then drop every other cached screen so the next student never sees this one's data.
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== currentUserKey[0] });
    },
  });
}

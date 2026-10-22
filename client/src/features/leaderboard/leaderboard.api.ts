import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Leaderboard } from '../../lib/types';

// The ['leaderboard'] prefix is invalidated after every quiz submit.
export function useLeaderboard(limit = 10) {
  return useQuery({
    queryKey: ['leaderboard', limit],
    queryFn: () => api<Leaderboard>(`/leaderboard?limit=${limit}`),
  });
}

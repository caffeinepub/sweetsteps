import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { RewardType, TimeRange, type InventorySummary } from '../backend';

/**
 * Hook to fetch the caller's chocolate inventory for a given time range
 */
export function useGetRewardsForCaller(timeRange: TimeRange) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<InventorySummary>({
    queryKey: ['rewards', timeRange],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getRewardsForCaller(timeRange);
    },
    enabled: !!actor && !actorFetching,
    retry: 1,
  });
}

/**
 * Hook to award a chocolate reward to the caller
 */
export function useAddReward() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rewardType: RewardType) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addReward(rewardType);
    },
    onSuccess: () => {
      // Invalidate all reward queries to refetch updated totals
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { UserProfile, RewardType, TimeRange, InventorySummary } from '../backend';

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  // Return custom state that properly reflects actor dependency and settled state
  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
    isSettled: !!actor && (query.isSuccess || query.isError),
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

export function useDeleteCallerUserData() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteCallerUserData();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

export function useGetRewardsForCaller(timeRange: TimeRange) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<InventorySummary>({
    queryKey: ['rewards', timeRange],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getRewardsForCaller(timeRange);
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useAddReward() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rewardType: RewardType) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addReward(rewardType);
    },
    onSuccess: () => {
      // Invalidate all reward queries to refresh counts
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
    },
  });
}

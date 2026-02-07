import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import type { UserProfile } from '../backend';

/**
 * Hook to get the current user's profile
 */
export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity, isInitializing } = useInternetIdentity();

  // Only run query when authenticated (not anonymous)
  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    // Only enable when actor is ready, not fetching, auth is initialized, and user is authenticated
    enabled: !!actor && !actorFetching && !isInitializing && isAuthenticated,
    retry: false,
  });

  // Return custom state that properly reflects all dependencies
  return {
    ...query,
    isLoading: actorFetching || isInitializing || query.isLoading,
    isFetched: !!actor && !isInitializing && isAuthenticated && query.isFetched,
  };
}

/**
 * Hook to save the current user's profile
 */
export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      // Invalidate the user profile query to refetch
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

/**
 * Hook to delete the current user's data
 */
export function useDeleteCallerUserData() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteCallerUserData();
    },
    onSuccess: () => {
      // Clear all queries after deletion including rewards
      queryClient.clear();
    },
  });
}

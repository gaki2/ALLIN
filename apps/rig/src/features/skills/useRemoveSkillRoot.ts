import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Effect } from 'effect';
import posthog from 'posthog-js';
import { removeSkillRoot } from './api';
import type { SkillRoot } from './types';
import { skillRootsQueryKey } from './useSkillRoots';

export const useRemoveSkillRoot = ({
  onRemoved,
}: {
  onRemoved?: (rootId: string) => void;
} = {}) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (rootId: string) => Effect.runPromise(removeSkillRoot(rootId)),
    onSuccess: (_, rootId) => {
      onRemoved?.(rootId);
      queryClient.setQueryData<SkillRoot[]>(skillRootsQueryKey, currentRoots =>
        currentRoots?.filter(root => root.id !== rootId),
      );
      void queryClient.invalidateQueries({ queryKey: skillRootsQueryKey });
      posthog.capture('repository_removed', { repository_id: rootId });
    },
  });

  return {
    removeRoot: mutation.mutateAsync,
    isRemoving: mutation.isPending,
    removingRootId: mutation.isPending ? mutation.variables : null,
  };
};

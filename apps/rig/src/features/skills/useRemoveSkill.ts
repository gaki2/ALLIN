import { toast } from '@allin/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Effect } from 'effect';
import { RemoveSkillError, removeSkill as removeSkillApi } from './api';
import type { Skill, SkillDeletionError } from './types';

export const useRemoveSkill = ({
  onRemoved,
}: {
  onRemoved?: (skill: Skill) => void;
} = {}) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (skill: Skill) => Effect.runPromise(removeSkillApi(skill)),
    onSuccess: (_, skill) => {
      void queryClient.invalidateQueries({
        queryKey: ['skills'],
      });

      onRemoved?.(skill);
      toast.success(`${skill.name} skill removed`, {
        description: 'The skill folder was deleted from disk.',
      });
    },
    onError: (error, skill) => {
      const deletionError = getSkillDeletionError(error);

      toast.error(`Failed to remove ${skill.name}`, {
        description: deletionError?.message ?? getErrorMessage(error),
      });
    },
  });

  return {
    removeSkill: mutation.mutate,
    removingSkillId: mutation.variables
      ? getSkillIdentity(mutation.variables)
      : null,
    isRemoving: mutation.isPending,
  };
};

export const getSkillIdentity = (
  skill: Pick<Skill, 'rootPath' | 'relativePath'> &
    Partial<Pick<Skill, 'isArchived'>>,
) =>
  `${skill.rootPath}:${skill.relativePath}:${skill.isArchived ? 'archived' : 'active'}`;

const getSkillDeletionError = (error: unknown) => {
  if (
    error instanceof RemoveSkillError &&
    error.kind === 'SkillDeletionError'
  ) {
    return error.cause as SkillDeletionError;
  }

  return null;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

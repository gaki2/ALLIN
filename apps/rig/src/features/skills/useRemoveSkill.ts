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
    mutationFn: (skills: Skill[]) =>
      Promise.all(
        skills.map(skill => Effect.runPromise(removeSkillApi(skill))),
      ),
    onSuccess: (_, skills) => {
      skills.forEach(skill => onRemoved?.(skill));
      toast.success(
        skills.length === 1
          ? `${skills[0].name} skill removed`
          : `${skills.length} skills removed`,
        {
          description:
            skills.length === 1
              ? 'The skill folder was deleted from disk.'
              : 'The selected skill folders were deleted from disk.',
        },
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ['skills'],
      });
    },
    onError: (error, skills) => {
      const deletionError = getSkillDeletionError(error);

      toast.error(
        skills.length === 1
          ? `Failed to remove ${skills[0].name}`
          : `Failed to remove all ${skills.length} skills`,
        {
          description: deletionError?.message ?? getErrorMessage(error),
        },
      );
    },
  });

  const removingSkillIds = new Set(
    (mutation.variables ?? []).map(getSkillIdentity),
  );

  return {
    removeSkill: (skill: Skill) => mutation.mutate([skill]),
    removeSkills: mutation.mutate,
    removingSkillIds,
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

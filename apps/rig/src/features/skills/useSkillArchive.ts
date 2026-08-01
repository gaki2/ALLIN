import { toast } from '@allin/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Effect } from 'effect';
import {
  archiveSkill as archiveSkillApi,
  ChangeSkillArchiveError,
  restoreSkill as restoreSkillApi,
} from './api';
import type { Skill, SkillArchiveError } from './types';
import { getSkillIdentity } from './useRemoveSkill';

export const useSkillArchive = ({
  onArchived,
  onRestored,
}: {
  onArchived?: (skill: Skill) => void;
  onRestored?: (skill: Skill) => void;
} = {}) => {
  const queryClient = useQueryClient();
  const refreshSkills = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['skills'] }),
      queryClient.invalidateQueries({ queryKey: ['archived-skills'] }),
    ]);

  const restoreMutation = useMutation({
    mutationFn: (skill: Skill) => Effect.runPromise(restoreSkillApi(skill)),
    onSuccess: (_, skill) => {
      void refreshSkills();
      onRestored?.(skill);
      toast.success(`${skill.name} restored`, {
        description: 'The skill is discoverable by agents again.',
      });
    },
    onError: (error, skill) => showArchiveError('restore', skill, error),
  });

  const archiveMutation = useMutation({
    mutationFn: (skill: Skill) => Effect.runPromise(archiveSkillApi(skill)),
    onSuccess: (_, skill) => {
      void refreshSkills();
      onArchived?.(skill);
      toast.success(`${skill.name} archived`, {
        description: 'Removed from discovery without deleting its files.',
        action: {
          label: 'Undo',
          onClick: () => restoreMutation.mutate(skill),
        },
      });
    },
    onError: (error, skill) => showArchiveError('archive', skill, error),
  });
  const changingSkill =
    archiveMutation.variables ?? restoreMutation.variables ?? null;

  return {
    archiveSkill: archiveMutation.mutate,
    restoreSkill: restoreMutation.mutate,
    changingSkillId: changingSkill ? getSkillIdentity(changingSkill) : null,
    isChanging: archiveMutation.isPending || restoreMutation.isPending,
  };
};

const showArchiveError = (
  action: 'archive' | 'restore',
  skill: Skill,
  error: unknown,
) => {
  const archiveError = getSkillArchiveError(error);

  toast.error(`Failed to ${action} ${skill.name}`, {
    description: archiveError?.message ?? getErrorMessage(error),
  });
};

const getSkillArchiveError = (error: unknown) => {
  if (
    error instanceof ChangeSkillArchiveError &&
    error.kind === 'SkillArchiveError'
  ) {
    return error.cause as SkillArchiveError;
  }

  return null;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

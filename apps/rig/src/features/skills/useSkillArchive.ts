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
    mutationFn: (skills: Skill[]) =>
      Promise.all(
        skills.map(skill => Effect.runPromise(restoreSkillApi(skill))),
      ),
    onSuccess: (_, skills) => {
      skills.forEach(skill => onRestored?.(skill));
      toast.success(
        skills.length === 1
          ? `${skills[0].name} enabled`
          : `${skills.length} skills enabled`,
        {
          description:
            skills.length === 1
              ? 'The skill is discoverable by agents again.'
              : 'The selected skills are discoverable by agents again.',
        },
      );
    },
    onError: (error, skills) => showArchiveError('enable', skills, error),
    onSettled: () => {
      void refreshSkills();
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (skills: Skill[]) =>
      Promise.all(
        skills.map(skill => Effect.runPromise(archiveSkillApi(skill))),
      ),
    onSuccess: (_, skills) => {
      skills.forEach(skill => onArchived?.(skill));
      toast.success(
        skills.length === 1
          ? `${skills[0].name} disabled`
          : `${skills.length} skills disabled`,
        {
          description:
            skills.length === 1
              ? 'No longer discoverable by agents. Files remain on disk.'
              : 'No longer discoverable by agents. All files remain on disk.',
          action: {
            label: 'Undo',
            onClick: () => restoreMutation.mutate(skills),
          },
        },
      );
    },
    onError: (error, skills) => showArchiveError('disable', skills, error),
    onSettled: () => {
      void refreshSkills();
    },
  });
  const changingSkillIds = new Set(
    (archiveMutation.variables ?? restoreMutation.variables ?? []).map(
      getSkillIdentity,
    ),
  );

  return {
    archiveSkill: (skill: Skill) => archiveMutation.mutate([skill]),
    archiveSkills: archiveMutation.mutate,
    restoreSkill: (skill: Skill) => restoreMutation.mutate([skill]),
    restoreSkills: restoreMutation.mutate,
    changingSkillIds,
    isChanging: archiveMutation.isPending || restoreMutation.isPending,
  };
};

const showArchiveError = (
  action: 'disable' | 'enable',
  skills: Skill[],
  error: unknown,
) => {
  const archiveError = getSkillArchiveError(error);

  toast.error(
    skills.length === 1
      ? `Failed to ${action} ${skills[0].name}`
      : `Failed to ${action} all ${skills.length} skills`,
    {
      description: archiveError?.message ?? getErrorMessage(error),
    },
  );
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

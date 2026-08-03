import { toast } from '@allin/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Effect } from 'effect';
import { copySkill as copySkillApi, CopySkillError } from './api';
import type { ProviderSkill, SkillCopyError, SkillRoot } from './types';
import { skillRootsQueryKey } from './useSkillRoots';

interface InstallSkillInput {
  sourceSkill: ProviderSkill;
  targetRoot: SkillRoot;
}

export const useInstallSkill = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ sourceSkill, targetRoot }: InstallSkillInput) =>
      Effect.runPromise(
        copySkillApi({
          sourceRootPath: sourceSkill.rootPath,
          sourceRelativePath: sourceSkill.relativePath,
          targetRootPath: targetRoot.path,
          targetRelativePath: sourceSkill.relativePath,
        }),
      ),
    onSuccess: (_, { sourceSkill, targetRoot }) => {
      void queryClient.invalidateQueries({ queryKey: ['skills'] });
      void queryClient.invalidateQueries({ queryKey: skillRootsQueryKey });

      toast.success(`${sourceSkill.name} installed to ${targetRoot.label}`, {
        description: 'The skill is now available in the selected provider.',
      });
    },
    onError: (error, { sourceSkill, targetRoot }) => {
      const copyError = getSkillCopyError(error);

      toast.error(`Failed to install ${sourceSkill.name} to ${targetRoot.label}`, {
        description: copyError?.message ?? getErrorMessage(error),
      });
    },
  });

  return {
    installSkill: mutation.mutate,
    isInstalling: mutation.isPending,
    installingTargetRootId: mutation.variables?.targetRoot.id ?? null,
  };
};

const getSkillCopyError = (error: unknown) => {
  if (error instanceof CopySkillError && error.kind === 'SkillCopyError') {
    return error.cause as SkillCopyError;
  }

  return null;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

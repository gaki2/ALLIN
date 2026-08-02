import { useMutation, useQueryClient } from '@tanstack/react-query';
import { open } from '@tauri-apps/plugin-dialog';
import { Effect } from 'effect';
import posthog from 'posthog-js';
import { importSkillRoot } from './api';
import type { SkillRoot } from './types';
import { skillRootsQueryKey } from './useSkillRoots';

export const useImportSkillRoot = ({
  onImported,
}: {
  onImported: (root: SkillRoot) => void;
}) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ path }: { path: string; selectAfterImport: boolean }) =>
      Effect.runPromise(importSkillRoot(path)),
    onSuccess: (importedRoot, { selectAfterImport }) => {
      if (selectAfterImport) onImported(importedRoot);
      queryClient.setQueryData<SkillRoot[]>(skillRootsQueryKey, currentRoots =>
        currentRoots
          ? [
              ...currentRoots.filter(root => root.id !== importedRoot.id),
              importedRoot,
            ]
          : [importedRoot],
      );
      void queryClient.invalidateQueries({ queryKey: skillRootsQueryKey });
      posthog.capture('repository_imported', {
        repository_id: importedRoot.id,
        repository_label: importedRoot.label,
        repository_kind: importedRoot.kind,
      });
    },
  });

  const importFromFolder = async () => {
    const selectedPath = await open({ directory: true, multiple: false });

    if (typeof selectedPath !== 'string') {
      return;
    }

    mutation.mutate({ path: selectedPath, selectAfterImport: true });
  };

  return {
    importFromFolder,
    importFromPath: (path: string, selectAfterImport: boolean) =>
      mutation.mutateAsync({ path, selectAfterImport }),
    isImporting: mutation.isPending,
  };
};

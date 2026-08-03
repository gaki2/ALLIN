import { Button, toast } from '@allin/ui';
import { Settings } from 'lucide-react';
import { useState } from 'react';
import { SettingsDialog } from '@/features/plugins/components/SettingsDialog';
import {
  GLOBAL_REPOSITORY_ID,
  getImportedRepositoryId,
  RepositorySelector,
} from '@/features/skills/components/RepositorySelector';
import { SkillRoot } from '@/features/skills/components/SkillRoot';
import type { SkillRoot as SkillRootModel } from '@/features/skills/types';
import { useImportSkillRoot } from '@/features/skills/useImportSkillRoot';
import { useRemoveSkillRoot } from '@/features/skills/useRemoveSkillRoot';
import { useSkillRepositorySelection } from '@/features/skills/useSkillRepositorySelection';
import { useSkillRoots } from '@/features/skills/useSkillRoots';
import { useSkillSourceVisibility } from '@/features/skills/skillSources';
import { HeaderLayout } from '@/layouts/HeaderLayout';

export const Root = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { hiddenSourceIds, setSourceVisible } = useSkillSourceVisibility();

  const { data: roots = [] } = useSkillRoots();
  const repositorySelection = useSkillRepositorySelection({
    roots,
    onRepositoryChange: () => undefined,
  });
  const importSkillRoot = useImportSkillRoot({
    onImported: importedRoot =>
      repositorySelection.selectRepository(importedRoot.scopeId),
  });
  const removeSkillRoot = useRemoveSkillRoot();
  const removeRepository = async (root: SkillRootModel) => {
    const wasSelected =
      repositorySelection.selectedRepositoryId === root.scopeId;

    try {
      await removeSkillRoot.removeRoot(getImportedRepositoryId(root));
      if (wasSelected) {
        repositorySelection.selectRepository(GLOBAL_REPOSITORY_ID);
      }
      const removalToastId = toast.success(`“${root.label}” removed from Rig`, {
        description: 'The folder and its files were not deleted.',
        duration: 10_000,
        action: {
          label: 'Undo',
          onClick: () => {
            void importSkillRoot
              .importFromPath(root.scopeId, wasSelected)
              .then(() => {
                toast.dismiss(removalToastId);
                toast.success(`“${root.label}” restored`);
              })
              .catch(() =>
                toast.error(`Couldn’t restore “${root.label}”`, {
                  description: 'Add the repository again with the + button.',
                }),
              );
          },
        },
      });
      return true;
    } catch {
      toast.error(`Couldn’t remove “${root.label}” from Rig`, {
        description: 'Nothing changed. Try again.',
      });
      return false;
    }
  };
  return (
    <main className='rig-shell flex h-dvh flex-col overflow-hidden bg-background text-foreground'>
      <HeaderLayout>
        <div className='flex w-full items-center gap-2 px-3 sm:px-4'>
          <RepositorySelector
            roots={roots}
            selectedRepositoryId={repositorySelection.selectedRepositoryId}
            isImporting={importSkillRoot.isImporting}
            onSelectRepository={repositorySelection.selectRepository}
            onImportRepository={importSkillRoot.importFromFolder}
            onRemoveRepository={removeRepository}
            removingRepositoryId={removeSkillRoot.removingRootId}
          />
          <Button
            type='button'
            variant='ghost'
            size='icon'
            aria-label='Open settings'
            onClick={() => setIsSettingsOpen(true)}
            className='rig-pressable ml-auto rounded-full border bg-background/80 shadow-xs'
          >
            <Settings size={16} />
          </Button>
        </div>
      </HeaderLayout>
      <SkillRoot
        roots={repositorySelection.visibleRoots}
        hiddenSkillSourceIds={hiddenSourceIds}
      />
      <SettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        hiddenSkillSourceIds={hiddenSourceIds}
        onSkillSourceVisibilityChange={setSourceVisible}
      />
    </main>
  );
};

import { Button } from '@allin/ui';
import { Settings } from 'lucide-react';
import { useState } from 'react';
import { SettingsDialog } from '@/features/plugins/components/SettingsDialog';
import { RepositorySelector } from '@/features/skills/components/RepositorySelector';
import { SkillRoot } from '@/features/skills/components/SkillRoot';
import { useImportSkillRoot } from '@/features/skills/useImportSkillRoot';
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
      repositorySelection.selectRepository(importedRoot.id),
  });
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

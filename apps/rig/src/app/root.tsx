import { Button } from '@allin/ui';
import { Activity, Blocks, PlugZap } from 'lucide-react';
import { PluginSetupDialog } from '@/features/plugins/components/PluginSetupDialog';
import { usePluginSetup } from '@/features/plugins/usePluginSetup';
import { RepositorySelector } from '@/features/skills/components/RepositorySelector';
import { SkillRoot } from '@/features/skills/components/SkillRoot';
import { useImportSkillRoot } from '@/features/skills/useImportSkillRoot';
import { useSkillRepositorySelection } from '@/features/skills/useSkillRepositorySelection';
import { useSkillRoots } from '@/features/skills/useSkillRoots';
import { HeaderLayout } from '@/layouts/HeaderLayout';

export const Root = () => {
  const pluginSetup = usePluginSetup();

  const { data: roots = [] } = useSkillRoots();
  const repositorySelection = useSkillRepositorySelection({
    roots,
    onRepositoryChange: () => undefined,
  });
  const importSkillRoot = useImportSkillRoot({
    onImported: importedRoot =>
      repositorySelection.selectRepository(importedRoot.id),
  });
  const connectedAgentCount = pluginSetup.pluginTargets.filter(
    target => target.isInstalled,
  ).length;

  return (
    <main className='rig-shell flex h-dvh flex-col overflow-hidden bg-background text-foreground'>
      <HeaderLayout>
        <div className='flex w-full items-center gap-2 px-3 sm:px-4'>
          <div className='flex shrink-0 items-center gap-2 pr-1'>
            <span className='flex size-8 items-center justify-center rounded-[10px] bg-foreground text-background shadow-sm'>
              <Blocks size={17} strokeWidth={2.2} />
            </span>
            <span className='hidden text-sm font-semibold tracking-[-0.02em] sm:block'>
              Rig
            </span>
          </div>

          <RepositorySelector
            roots={roots}
            selectedRepositoryId={repositorySelection.selectedRepositoryId}
            isOpen={repositorySelection.isOpen}
            isImporting={importSkillRoot.isImporting}
            onOpenChange={repositorySelection.setIsOpen}
            onSelectRepository={repositorySelection.selectRepository}
            onImportRepository={importSkillRoot.importFromFolder}
          />
          <div className='ml-auto flex items-center gap-2'>
            <div className='hidden items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-2.5 py-1.5 text-xs font-medium text-emerald-700 md:flex dark:text-emerald-300'>
              <Activity size={13} />
              Local & private
            </div>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={pluginSetup.openPluginSetup}
              className='rig-pressable rounded-full border bg-background/80 px-3 shadow-xs'
            >
              <PlugZap size={15} />
              <span className='hidden sm:inline'>Connect agents</span>
              <span className='text-muted-foreground'>
                {connectedAgentCount}/{pluginSetup.pluginTargets.length}
              </span>
              {pluginSetup.hasIncompletePlugin && (
                <span className='ml-1 size-2 rounded-full bg-blue-500' />
              )}
            </Button>
          </div>
        </div>
      </HeaderLayout>
      <SkillRoot roots={repositorySelection.visibleRoots} />
      <PluginSetupDialog
        open={pluginSetup.isOpen}
        pluginTargets={pluginSetup.pluginTargets}
        onOpenChange={pluginSetup.setIsOpen}
        onInstallPlugin={pluginSetup.installPlugin}
        onCheckAgain={pluginSetup.checkAgain}
        isChecking={pluginSetup.isChecking}
        isInstalling={pluginSetup.isInstalling}
        installingPluginId={pluginSetup.installingPluginId}
        errorMessage={pluginSetup.errorMessage}
      />
    </main>
  );
};

import { Button } from '@allin/ui';
import { PlugZap } from 'lucide-react';
import { appPaths, useAppNavigation } from '@/app/navigation';
import { DashboardRoot } from '@/features/dashboard/components/DashboardRoot';
import { PluginSetupDialog } from '@/features/plugins/components/PluginSetupDialog';
import { usePluginSetup } from '@/features/plugins/usePluginSetup';
import { ResourceRoot } from '@/features/resources/components/ResourceRoot';
import { ScopeSelector } from '@/features/skills/components/ScopeSelector';
import { SkillRoot } from '@/features/skills/components/SkillRoot';
import { useImportSkillRoot } from '@/features/skills/useImportSkillRoot';
import { useSkillScopeSelection } from '@/features/skills/useSkillScopeSelection';
import { useSkillRoots } from '@/features/skills/useSkillRoots';
import { HeaderLayout } from '@/layouts/HeaderLayout';
import { NavigationRail } from './NavigationRail';

export const Root = () => {
  const navigation = useAppNavigation();
  const pluginSetup = usePluginSetup();

  const { data: roots = [] } = useSkillRoots();
  const scopeSelection = useSkillScopeSelection({
    roots,
    onScopeChange: () => undefined,
  });
  const importSkillRoot = useImportSkillRoot({
    onImported: importedRoot => scopeSelection.selectScope(importedRoot.scopeId),
  });
  const renderCurrentPath = () => {
    switch (navigation.currentPath) {
      case appPaths.skills:
        return (
          <SkillRoot
            key={scopeSelection.selectedScopeId}
            roots={scopeSelection.visibleRoots}
          />
        );
      case appPaths.agents:
        return (
          <ResourceRoot
            section={appPaths.agents}
            pluginTargets={pluginSetup.pluginTargets}
            onOpenPluginSetup={pluginSetup.openPluginSetup}
          />
        );
      case appPaths.apps:
        return (
          <ResourceRoot
            section={appPaths.apps}
            pluginTargets={pluginSetup.pluginTargets}
            onOpenPluginSetup={pluginSetup.openPluginSetup}
          />
        );
      case appPaths.dashboard:
        return <DashboardRoot roots={scopeSelection.visibleRoots} />;
    }
  };

  return (
    <main className='flex h-dvh flex-col overflow-hidden bg-background text-foreground'>
      <HeaderLayout>
        <div className='flex w-full items-center justify-between pr-4'>
          <ScopeSelector
            roots={roots}
            selectedScopeId={scopeSelection.selectedScopeId}
            isOpen={scopeSelection.isOpen}
            isImporting={importSkillRoot.isImporting}
            onOpenChange={scopeSelection.setIsOpen}
            onSelectScope={scopeSelection.selectScope}
            onImportScope={importSkillRoot.importFromFolder}
          />
          <div className='flex items-center gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={pluginSetup.openPluginSetup}
            >
              <PlugZap size={15} />
              Plugins
              {pluginSetup.hasIncompletePlugin && (
                <span className='ml-1 size-2 rounded-full bg-blue-500' />
              )}
            </Button>
          </div>
        </div>
      </HeaderLayout>
      <div className='flex min-h-0 flex-1'>
        <NavigationRail
          currentPath={navigation.currentPath}
          onNavigate={navigation.navigate}
        />
        {renderCurrentPath()}
      </div>
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

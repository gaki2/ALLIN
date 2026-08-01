import { cn } from '@allin/ui';
import { Folder, Layers3, LoaderCircle, Plus } from 'lucide-react';
import posthog from 'posthog-js';
import type { SkillRoot } from '../types';

const GLOBAL_REPOSITORY_ID = 'global';

interface RepositorySelectorProps {
  roots: SkillRoot[];
  selectedRepositoryId: string;
  isImporting: boolean;
  onSelectRepository: (repositoryId: string) => void;
  onImportRepository: () => void;
}

export const RepositorySelector = ({
  roots,
  selectedRepositoryId,
  isImporting,
  onSelectRepository,
  onImportRepository,
}: RepositorySelectorProps) => {
  const repositoryRoots = roots.filter(root => root.kind === 'repository');

  const selectRepository = (repositoryId: string, repositoryLabel: string) => {
    onSelectRepository(repositoryId);
    posthog.capture('repository_selected', {
      repository_id: repositoryId,
      repository_label: repositoryLabel,
    });
  };

  return (
    <nav
      className='flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
      aria-label='Skill repositories'
    >
      <RepositoryButton
        icon={<Layers3 size={14} />}
        label='All skills'
        isSelected={selectedRepositoryId === GLOBAL_REPOSITORY_ID}
        onClick={() => selectRepository(GLOBAL_REPOSITORY_ID, 'All skills')}
      />

      {repositoryRoots.map(root => (
        <RepositoryButton
          key={root.id}
          icon={<Folder size={14} />}
          label={root.label}
          title={root.exists ? root.path : `Unavailable · ${root.path}`}
          isSelected={selectedRepositoryId === root.id}
          isAvailable={root.exists}
          onClick={() => selectRepository(root.id, root.label)}
        />
      ))}

      <button
        type='button'
        aria-label={isImporting ? 'Adding repository' : 'Add repository'}
        title={isImporting ? 'Adding repository…' : 'Add repository'}
        disabled={isImporting}
        onClick={onImportRepository}
        className='rig-pressable flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed bg-background/80 text-muted-foreground shadow-xs hover:border-solid hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60'
      >
        {isImporting ? (
          <LoaderCircle size={15} className='animate-spin' />
        ) : (
          <Plus size={16} />
        )}
      </button>
    </nav>
  );
};

const RepositoryButton = ({
  icon,
  label,
  title,
  isSelected,
  isAvailable = true,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  title?: string;
  isSelected: boolean;
  isAvailable?: boolean;
  onClick: () => void;
}) => (
  <button
    type='button'
    aria-pressed={isSelected}
    title={title}
    onClick={onClick}
    className={cn(
      'rig-pressable flex h-9 max-w-48 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-medium shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      isSelected
        ? 'border-foreground bg-foreground text-background'
        : 'border-border bg-background/80 text-foreground hover:bg-muted',
      !isAvailable && 'border-amber-500/30 text-amber-700 dark:text-amber-300',
    )}
  >
    <span className='shrink-0'>{icon}</span>
    <span className='truncate'>{label}</span>
  </button>
);

export { GLOBAL_REPOSITORY_ID };

import { cn, Popover, PopoverContent, PopoverTrigger } from '@allin/ui';
import { Check, ChevronsUpDown, Folder, Layers3, Plus } from 'lucide-react';
import posthog from 'posthog-js';
import type { SkillRoot } from '../types';

const GLOBAL_REPOSITORY_ID = 'global';

interface RepositorySelectorProps {
  roots: SkillRoot[];
  selectedRepositoryId: string;
  isOpen: boolean;
  isImporting: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSelectRepository: (repositoryId: string) => void;
  onImportRepository: () => void;
}

export const RepositorySelector = ({
  roots,
  selectedRepositoryId,
  isOpen,
  isImporting,
  onOpenChange,
  onSelectRepository,
  onImportRepository,
}: RepositorySelectorProps) => {
  const repositoryRoots = roots.filter(root => root.kind === 'repository');
  const selectedRepository = repositoryRoots.find(
    root => root.id === selectedRepositoryId,
  );
  const selectedLabel = selectedRepository?.label ?? 'All skills';

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type='button'
          className='rig-pressable flex h-9 min-w-0 max-w-64 items-center gap-2 rounded-full border bg-background/80 px-2.5 text-left shadow-xs transition-[background-color,transform] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        >
          <span className='flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-300'>
            {selectedRepository ? <Folder size={14} /> : <Layers3 size={14} />}
          </span>
          <span className='min-w-0 flex-1'>
            <span className='block truncate text-xs font-semibold leading-4 sm:text-sm'>
              {selectedLabel}
            </span>
          </span>

          <ChevronsUpDown
            size={16}
            className='shrink-0 text-muted-foreground'
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align='start'
        sideOffset={8}
        className='w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl p-3 shadow-2xl'
      >
        <p className='px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
          Skill context
        </p>

        <RepositoryOption
          icon={<Layers3 size={18} />}
          label='All skills'
          path='Auto-detected agents + project locations'
          exists
          isSelected={selectedRepositoryId === GLOBAL_REPOSITORY_ID}
          onClick={() => {
            onSelectRepository(GLOBAL_REPOSITORY_ID);
            posthog.capture('repository_selected', {
              repository_id: GLOBAL_REPOSITORY_ID,
              repository_label: 'All skills',
            });
          }}
        />

        {repositoryRoots.map(root => (
          <RepositoryOption
            key={root.id}
            icon={<Folder size={18} />}
            label={root.label}
            path={root.path}
            exists={root.exists}
            isSelected={selectedRepositoryId === root.id}
            onClick={() => {
              onSelectRepository(root.id);
              posthog.capture('repository_selected', {
                repository_id: root.id,
                repository_label: root.label,
              });
            }}
          />
        ))}

        <div className='my-3 border-t' />

        <button
          type='button'
          onClick={onImportRepository}
          disabled={isImporting}
          className='flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        >
          <span className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-dashed bg-background text-muted-foreground'>
            <Plus size={18} />
          </span>

          <span className='min-w-0'>
            <span className='block text-sm font-semibold'>
              {isImporting ? 'Adding project...' : 'Add project folder...'}
            </span>
            <span className='mt-0.5 block font-mono text-xs text-muted-foreground'>
              Optional fallback for a location Rig cannot detect
            </span>
          </span>
        </button>
      </PopoverContent>
    </Popover>
  );
};

interface RepositoryOptionProps {
  icon: React.ReactNode;
  label: string;
  path: string;
  exists: boolean;
  isSelected: boolean;
  onClick: () => void;
}

const RepositoryOption = ({
  icon,
  label,
  path,
  exists,
  isSelected,
  onClick,
}: RepositoryOptionProps) => {
  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isSelected ? 'bg-muted' : 'hover:bg-muted/70',
      )}
    >
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-lg',
          isSelected
            ? 'bg-foreground text-background'
            : 'border bg-background text-foreground',
        )}
      >
        {icon}
      </span>

      <span className='min-w-0 flex-1'>
        <span className='block truncate text-sm font-semibold'>{label}</span>
        <span
          className={cn(
            'mt-0.5 block truncate font-mono text-xs',
            exists
              ? 'text-muted-foreground'
              : 'text-amber-600 dark:text-amber-300',
          )}
        >
          {exists ? path : `Unavailable · ${path}`}
        </span>
      </span>

      {isSelected && <Check size={18} className='shrink-0 text-blue-500' />}
    </button>
  );
};

export { GLOBAL_REPOSITORY_ID };

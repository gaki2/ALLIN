import { cn, Popover, PopoverContent, PopoverTrigger } from '@allin/ui';
import { Check, ChevronsUpDown, Folder, Home, Plus } from 'lucide-react';
import posthog from 'posthog-js';
import type { SkillRoot, SkillScopeKind } from '../types';

const GLOBAL_SCOPE_ID = 'global';

export interface SkillScopeOption {
  id: string;
  label: string;
  kind: SkillScopeKind;
  roots: SkillRoot[];
}

interface ScopeSelectorProps {
  roots: SkillRoot[];
  selectedScopeId: string;
  isOpen: boolean;
  isImporting: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSelectScope: (scopeId: string) => void;
  onImportScope: () => void;
}

export const ScopeSelector = ({
  roots,
  selectedScopeId,
  isOpen,
  isImporting,
  onOpenChange,
  onSelectScope,
  onImportScope,
}: ScopeSelectorProps) => {
  const scopeOptions = getScopeOptions(roots);
  const selectedScope = scopeOptions.find(scope => scope.id === selectedScopeId);
  const selectedLabel = selectedScope?.label ?? 'Global';
  const isGlobalSelected = selectedScopeId === GLOBAL_SCOPE_ID;

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type='button'
          className='flex h-14 w-78 ml-2 items-center gap-3 rounded-sm px-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        >
          <span className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-background'>
            {isGlobalSelected ? <Home size={18} /> : <Folder size={18} />}
          </span>
          <span className='min-w-0 flex-1'>
            <span className='block truncate text-sm font-semibold leading-4'>
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
        sideOffset={0}
        className='w-78 shadow-2xl rounded-2xl p-3'
      >
        <p className='px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
          Scope
        </p>

        {scopeOptions.map(scope => (
          <ScopeOption
            key={scope.id}
            icon={
              scope.kind === 'global' ? <Home size={18} /> : <Folder size={18} />
            }
            label={scope.label}
            path={getScopeDescription(scope)}
            isSelected={selectedScopeId === scope.id}
            onClick={() => {
              onSelectScope(scope.id);
              posthog.capture('repository_selected', {
                repository_id: scope.id,
                repository_label: scope.label,
                scope_id: scope.id,
                scope_label: scope.label,
                scope_kind: scope.kind,
              });
            }}
          />
        ))}

        <div className='my-3 border-t' />

        <button
          type='button'
          onClick={onImportScope}
          disabled={isImporting}
          className='flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        >
          <span className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-dashed bg-background text-muted-foreground'>
            <Plus size={18} />
          </span>

          <span className='min-w-0'>
            <span className='block text-sm font-semibold'>
              {isImporting ? 'Importing scope...' : 'Import repository scope...'}
            </span>
            <span className='mt-0.5 block font-mono text-xs text-muted-foreground'>
              Choose a project folder
            </span>
          </span>
        </button>
      </PopoverContent>
    </Popover>
  );
};

const getScopeOptions = (roots: SkillRoot[]): SkillScopeOption[] => {
  const scopes = new Map<string, SkillScopeOption>();

  for (const root of roots) {
    const existingScope = scopes.get(root.scopeId);

    if (existingScope) {
      existingScope.roots.push(root);
      continue;
    }

    scopes.set(root.scopeId, {
      id: root.scopeId,
      label: root.scopeLabel,
      kind: root.scopeKind,
      roots: [root],
    });
  }

  return [...scopes.values()].toSorted((a, b) => {
    if (a.kind !== b.kind) {
      return a.kind === 'global' ? -1 : 1;
    }

    return a.label.localeCompare(b.label);
  });
};

const getScopeDescription = (scope: SkillScopeOption) => {
  if (scope.kind === 'global') {
    return 'Global provider skill roots';
  }

  return scope.id;
};

interface ScopeOptionProps {
  icon: React.ReactNode;
  label: string;
  path: string;
  isSelected: boolean;
  onClick: () => void;
}

const ScopeOption = ({
  icon,
  label,
  path,
  isSelected,
  onClick,
}: ScopeOptionProps) => {
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
        <span className='mt-0.5 block truncate font-mono text-xs text-muted-foreground'>
          {path}
        </span>
      </span>

      {isSelected && <Check size={18} className='shrink-0 text-blue-500' />}
    </button>
  );
};

export { GLOBAL_SCOPE_ID };

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  toast,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@allin/ui';
import {
  ChevronDown,
  Copy,
  Folder,
  Layers3,
  LoaderCircle,
  Plus,
  Unlink,
} from 'lucide-react';
import posthog from 'posthog-js';
import { useRef, useState } from 'react';
import type { SkillRoot } from '../types';

const GLOBAL_REPOSITORY_ID = 'global';

interface RepositorySelectorProps {
  roots: SkillRoot[];
  selectedRepositoryId: string;
  isImporting: boolean;
  removingRepositoryId: string | null;
  onSelectRepository: (repositoryId: string) => void;
  onImportRepository: () => void;
  onRemoveRepository: (root: SkillRoot) => Promise<boolean>;
}

export const RepositorySelector = ({
  roots,
  selectedRepositoryId,
  isImporting,
  removingRepositoryId,
  onSelectRepository,
  onImportRepository,
  onRemoveRepository,
}: RepositorySelectorProps) => {
  const [repositoryPendingRemoval, setRepositoryPendingRemoval] =
    useState<SkillRoot | null>(null);
  const [removeFailed, setRemoveFailed] = useState(false);
  const allSkillsButtonRef = useRef<HTMLButtonElement>(null);
  const repositoryRoots = Array.from(
    new Map(
      roots
        .filter(root => root.kind === 'repository')
        .map(root => [root.scopeId, root]),
    ).values(),
  );
  const isRemovingPendingRepository =
    repositoryPendingRemoval !== null &&
    getImportedRepositoryId(repositoryPendingRemoval) === removingRepositoryId;

  const selectRepository = (repositoryId: string, repositoryLabel: string) => {
    onSelectRepository(repositoryId);
    posthog.capture('repository_selected', {
      repository_id: repositoryId,
      repository_label: repositoryLabel,
    });
  };

  const copyRepositoryPath = async (root: SkillRoot) => {
    try {
      await navigator.clipboard.writeText(root.scopeId);
      toast.success('Repository path copied');
    } catch {
      toast.error('Couldn’t copy the repository path.');
    }
  };

  const confirmRemoval = async (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    if (!repositoryPendingRemoval) return;

    setRemoveFailed(false);
    const removedSelectedRepository =
      selectedRepositoryId === repositoryPendingRemoval.scopeId;
    const didRemove = await onRemoveRepository(repositoryPendingRemoval);
    if (didRemove) {
      setRepositoryPendingRemoval(null);
      if (removedSelectedRepository) {
        window.requestAnimationFrame(() => allSkillsButtonRef.current?.focus());
      }
      return;
    }

    setRemoveFailed(true);
  };

  return (
    <>
      <nav
        className='flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
        aria-label='Skill repositories'
      >
        <RepositoryButton
          buttonRef={allSkillsButtonRef}
          icon={<Layers3 size={14} />}
          label='All skills'
          isSelected={selectedRepositoryId === GLOBAL_REPOSITORY_ID}
          onClick={() => selectRepository(GLOBAL_REPOSITORY_ID, 'All skills')}
        />

        {repositoryRoots.map(root => (
          <RepositoryPill
            key={root.scopeId}
            root={root}
            isSelected={selectedRepositoryId === root.scopeId}
            onSelect={() => selectRepository(root.scopeId, root.scopeLabel)}
            onCopyPath={() => copyRepositoryPath(root)}
            onRequestRemoval={() => {
              setRemoveFailed(false);
              setRepositoryPendingRemoval(root);
            }}
          />
        ))}

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type='button'
              aria-label={
                isImporting ? 'Adding project folder' : 'Add project folder'
              }
              disabled={isImporting}
              onClick={onImportRepository}
              className='rig-pressable flex h-9 w-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-dashed bg-background/80 px-0 text-muted-foreground shadow-xs hover:border-solid hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60 sm:w-auto sm:px-3'
            >
              {isImporting ? (
                <LoaderCircle size={15} className='animate-spin' />
              ) : (
                <Plus size={16} />
              )}
              <span className='hidden text-sm font-medium sm:inline'>
                {isImporting ? 'Adding…' : 'Add project'}
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent side='bottom'>
            Choose a project folder to show its skills
          </TooltipContent>
        </Tooltip>
      </nav>

      <AlertDialog
        open={repositoryPendingRemoval !== null}
        onOpenChange={open => {
          if (!open && !isRemovingPendingRepository) {
            setRepositoryPendingRemoval(null);
            setRemoveFailed(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove “{repositoryPendingRemoval?.scopeLabel}” from Rig?
            </AlertDialogTitle>
            <AlertDialogDescription className='space-y-3'>
              <span className='block'>
                Rig will stop showing skills from this folder. The folder and
                its files will stay on your computer, and you can add it again
                anytime.
              </span>
              <span className='block break-all rounded-lg bg-muted px-3 py-2 font-mono text-xs text-foreground'>
                {repositoryPendingRemoval?.scopeId}
              </span>
              {removeFailed ? (
                <span className='block text-destructive'>
                  Nothing changed. Try again.
                </span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel autoFocus disabled={isRemovingPendingRepository}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isRemovingPendingRepository}
              onClick={confirmRemoval}
            >
              {isRemovingPendingRepository ? (
                <LoaderCircle className='animate-spin' />
              ) : (
                <Unlink />
              )}
              {isRemovingPendingRepository ? 'Removing…' : 'Remove from Rig'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const RepositoryPill = ({
  root,
  isSelected,
  onSelect,
  onCopyPath,
  onRequestRemoval,
}: {
  root: SkillRoot;
  isSelected: boolean;
  onSelect: () => void;
  onCopyPath: () => void;
  onRequestRemoval: () => void;
}) => (
  <div
    role='group'
    aria-label={`${root.scopeLabel} repository`}
    className={cn(
      'flex h-9 max-w-56 shrink-0 items-stretch overflow-hidden rounded-full border shadow-xs',
      isSelected
        ? 'border-foreground bg-foreground text-background'
        : 'border-border bg-background/80 text-foreground',
      !root.exists && 'border-amber-500/30 text-amber-700 dark:text-amber-300',
    )}
  >
    <button
      type='button'
      aria-pressed={isSelected}
      title={root.scopeId}
      onClick={onSelect}
      className='rig-pressable flex min-w-0 items-center gap-2 py-1.5 pl-3 pr-2 text-sm font-medium hover:bg-muted/60 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'
    >
      <Folder size={14} className='shrink-0' />
      <span className='truncate'>{root.scopeLabel}</span>
    </button>

    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type='button'
          aria-label={`Options for ${root.scopeLabel}`}
          title='Repository options'
          className={cn(
            'rig-pressable flex w-8 shrink-0 items-center justify-center border-l hover:bg-muted/60 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
            isSelected ? 'border-background/20' : 'border-border',
          )}
        >
          <ChevronDown size={13} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-52'>
        <DropdownMenuItem onSelect={onCopyPath}>
          <Copy />
          Copy folder path
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onRequestRemoval}>
          <Unlink />
          Remove from Rig…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);

const RepositoryButton = ({
  buttonRef,
  icon,
  label,
  isSelected,
  onClick,
}: {
  buttonRef?: React.Ref<HTMLButtonElement>;
  icon: React.ReactNode;
  label: string;
  isSelected: boolean;
  onClick: () => void;
}) => (
  <button
    ref={buttonRef}
    type='button'
    aria-pressed={isSelected}
    onClick={onClick}
    className={cn(
      'rig-pressable flex h-9 max-w-48 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-medium shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      isSelected
        ? 'border-foreground bg-foreground text-background'
        : 'border-border bg-background/80 text-foreground hover:bg-muted',
    )}
  >
    <span className='shrink-0'>{icon}</span>
    <span className='truncate'>{label}</span>
  </button>
);

export { GLOBAL_REPOSITORY_ID };

export const getImportedRepositoryId = (root: SkillRoot) => {
  const match = root.id.match(
    /^repo-(.+)-(agents|claude|opencode|hermes|cursor)$/,
  );
  return match?.[1] ?? root.id;
};

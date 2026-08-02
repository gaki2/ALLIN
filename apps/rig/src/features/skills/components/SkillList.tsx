import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  cn,
  ScrollArea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@allin/ui';
import {
  ChevronLeft,
  Power,
  PowerOff,
  RefreshCw,
  Search,
  Share2,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import posthog from 'posthog-js';
import {
  type MouseEvent as ReactMouseEvent,
  useDeferredValue,
  useMemo,
  useState,
} from 'react';
import {
  estimateSkillTokens,
  getDuplicateSkillNames,
  getLibraryHealth,
  getSkillFilePath,
  getSkillNameCounts,
  getSkillReviewReasons,
  getSkillSourceLabel,
  matchesSkillSearch,
} from '../insights';
import { getNextSkillSelection } from '../selection';
import type {
  Skill,
  SkillManagementView,
  SkillUpdateStatus,
  SkillUsage,
  SkillUsageSeries,
} from '../types';
import { getSkillIdentity } from '../useRemoveSkill';
import { ShareSkillsDialog } from './ShareSkillDialog';
import { SkillUsageSparkline } from './SkillUsageSparkline';

const loadingSkeletonIds = Array.from(
  { length: 6 },
  (_, index) => `skill-loading-${index}`,
);

const normalizeFilePath = (value: string) =>
  value.replaceAll('\\', '/').replace(/\/+$/, '');

type SkillFilter = 'all' | 'used';
const skillFilters: Array<{ value: SkillFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'used', label: 'Recent · 7d' },
];

export interface SkillListProps {
  skills: Skill[];
  archivedSkills: Skill[];
  selectedSkill: Skill | null;
  selectedSkillIds: ReadonlySet<string>;
  skillUsages: SkillUsage[];
  skillUsageTendencies: SkillUsageSeries[];
  skillUpdates: SkillUpdateStatus[];
  skillUpdatesError: unknown;
  isCheckingUpdates: boolean;
  onCheckUpdates: () => void;
  isLoading: boolean;
  error: string | null;
  onSelectionChange: (skills: Skill[], focusedSkill: Skill | null) => void;
  onClearSelection: () => void;
  onRemoveSkills: (skills: Skill[]) => void;
  removingSkillIds: ReadonlySet<string>;
  onArchiveSkills: (skills: Skill[]) => void;
  onRestoreSkills: (skills: Skill[]) => void;
  changingSkillIds: ReadonlySet<string>;
  managementView: SkillManagementView | null;
  onManagementViewChange: (view: SkillManagementView | null) => void;
}

export const SkillList = ({
  skills,
  archivedSkills,
  selectedSkill,
  selectedSkillIds,
  skillUsages,
  skillUsageTendencies,
  skillUpdates,
  skillUpdatesError,
  isCheckingUpdates,
  onCheckUpdates,
  isLoading,
  error,
  onSelectionChange,
  onClearSelection,
  onRemoveSkills,
  removingSkillIds,
  onArchiveSkills,
  onRestoreSkills,
  changingSkillIds,
  managementView,
  onManagementViewChange,
}: SkillListProps) => {
  const [skillsPendingRemoval, setSkillsPendingRemoval] = useState<Skill[]>([]);
  const [skillsPendingShare, setSkillsPendingShare] = useState<Skill[]>([]);
  const [selectionAnchorId, setSelectionAnchorId] = useState<string | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<SkillFilter>('all');
  const deferredSearchQuery = useDeferredValue(
    searchQuery.trim().toLowerCase(),
  );
  const usageByName = useMemo(
    () => new Map(skillUsages.map(usage => [usage.name, usage])),
    [skillUsages],
  );
  const tendencyByName = useMemo(
    () =>
      new Map(skillUsageTendencies.map(tendency => [tendency.name, tendency])),
    [skillUsageTendencies],
  );
  const updateByPath = useMemo(
    () =>
      new Map(
        skillUpdates.map(update => [
          normalizeFilePath(update.installPath),
          update,
        ]),
      ),
    [skillUpdates],
  );
  const updateCount = useMemo(
    () =>
      skillUpdates.filter(update => update.state === 'updateAvailable').length,
    [skillUpdates],
  );
  const unavailableUpdateCount = useMemo(
    () =>
      skillUpdates.filter(update => update.state === 'checkUnavailable').length,
    [skillUpdates],
  );
  const updateCountLabel =
    updateCount > 0 ? updateCount : unavailableUpdateCount > 0 ? '?' : 0;
  const libraryHealth = useMemo(() => getLibraryHealth(skills), [skills]);
  const activeSkillNameCounts = useMemo(
    () => getSkillNameCounts(skills),
    [skills],
  );
  const archivedSkillNameCounts = useMemo(
    () => getSkillNameCounts(archivedSkills),
    [archivedSkills],
  );
  const duplicateSkillNames = useMemo(
    () => getDuplicateSkillNames(skills),
    [skills],
  );
  const visibleFilters: Array<{
    value: SkillFilter | SkillManagementView;
    label: string;
  }> = managementView
    ? [
        {
          value: 'review',
          label: `Needs review · ${libraryHealth.reviewCount}`,
        },
        {
          value: 'updates',
          label: `Updates · ${updateCountLabel}`,
        },
        {
          value: 'archived',
          label: `Disabled · ${archivedSkills.length}`,
        },
      ]
    : skillFilters;
  const visibleSkills = useMemo(() => {
    const sourceSkills =
      managementView === 'archived' ? archivedSkills : skills;
    const matchingSkills = sourceSkills.filter(skill => {
      const usage = usageByName.get(skill.name);
      const matchesQuery = matchesSkillSearch(skill, deferredSearchQuery);
      const matchesFilter =
        managementView === 'review'
          ? getSkillReviewReasons({
              skill,
              duplicateNames: duplicateSkillNames,
            }).length > 0
          : managementView === 'updates'
            ? updateByPath.get(normalizeFilePath(getSkillFilePath(skill)))
                ?.state === 'updateAvailable'
            : managementView === 'archived' ||
              filter === 'all' ||
              (filter === 'used' && (usage?.count ?? 0) > 0);

      return matchesQuery && matchesFilter;
    });

    return matchingSkills.toSorted((a, b) => {
      const aCount = usageByName.get(a.name)?.count ?? 0;
      const bCount = usageByName.get(b.name)?.count ?? 0;

      return bCount - aCount || a.name.localeCompare(b.name);
    });
  }, [
    archivedSkills,
    deferredSearchQuery,
    duplicateSkillNames,
    filter,
    managementView,
    skills,
    updateByPath,
    usageByName,
  ]);
  const selectedVisibleSkills = useMemo(
    () =>
      visibleSkills.filter(skill =>
        selectedSkillIds.has(getSkillIdentity(skill)),
      ),
    [selectedSkillIds, visibleSkills],
  );

  const handleSkillClick = (
    event: ReactMouseEvent<HTMLButtonElement>,
    skill: Skill,
  ) => {
    const clickedId = getSkillIdentity(skill);
    const orderedIds = visibleSkills.map(getSkillIdentity);
    const toggle = event.metaKey || event.ctrlKey;
    const hasVisibleAnchor = selectionAnchorId
      ? orderedIds.includes(selectionAnchorId)
      : false;
    const nextIds = getNextSkillSelection({
      orderedIds,
      selectedIds: selectedSkillIds,
      clickedId,
      anchorId: selectionAnchorId,
      modifiers: { toggle, range: event.shiftKey },
    });
    const nextIdSet = new Set(nextIds);
    const nextSkills = visibleSkills.filter(visibleSkill =>
      nextIdSet.has(getSkillIdentity(visibleSkill)),
    );
    const focusedSkill = nextIdSet.has(clickedId)
      ? skill
      : (nextSkills.at(-1) ?? null);

    if (!event.shiftKey || !hasVisibleAnchor) {
      setSelectionAnchorId(clickedId);
    }
    onSelectionChange(nextSkills, focusedSkill);

    if (focusedSkill === skill) {
      posthog.capture('skill_selected', {
        skill_name: skill.name,
        skill_description: skill.description,
        skill_is_valid: skill.isValid,
        skill_usage_count: usageByName.get(skill.name)?.count ?? 0,
        skill_root_path: skill.rootPath,
        selected_count: nextSkills.length,
      });
    }
  };

  if (isLoading) {
    return (
      <output className='block space-y-2 p-3' aria-label='Loading skills'>
        {loadingSkeletonIds.map(skeletonId => (
          <div
            key={skeletonId}
            className='h-16 animate-pulse rounded-xl bg-muted'
          />
        ))}
      </output>
    );
  }

  return (
    <div className='flex h-full min-h-0 flex-col'>
      <div className='shrink-0 space-y-3 border-b px-4 pb-3 pt-4'>
        {managementView ? (
          <div>
            <button
              type='button'
              onClick={() => {
                onManagementViewChange(null);
                onClearSelection();
              }}
              className='rig-pressable -ml-2 inline-flex h-7 items-center gap-1 rounded-lg px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            >
              <ChevronLeft size={14} />
              Library
            </button>
            <div className='mt-1 flex items-end justify-between gap-3'>
              <div>
                <h1 className='text-lg font-semibold tracking-[-0.02em]'>
                  {managementView === 'archived'
                    ? 'Disabled'
                    : managementView === 'updates'
                      ? 'Updates'
                      : 'Needs review'}
                </h1>
                <p className='text-xs text-muted-foreground'>
                  {managementView === 'archived'
                    ? 'Kept on disk and excluded from agent discovery'
                    : managementView === 'updates'
                      ? unavailableUpdateCount > 0 && updateCount === 0
                        ? 'Update availability could not be verified'
                        : 'Newer remote files detected without changing local skills'
                      : 'Issues that may affect discovery or instruction size'}
                </p>
              </div>
              {managementView === 'updates' ? (
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <button
                      type='button'
                      onClick={onCheckUpdates}
                      disabled={isCheckingUpdates}
                      aria-label='Check skill updates again'
                      className='rig-pressable inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-50'
                    >
                      <RefreshCw
                        size={14}
                        className={cn(isCheckingUpdates && 'animate-spin')}
                      />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side='bottom' sideOffset={6}>
                    Check GitHub again. This does not change local files.
                  </TooltipContent>
                </Tooltip>
              ) : null}
            </div>
          </div>
        ) : (
          <div>
            <h1 className='text-lg font-semibold tracking-[-0.02em]'>
              Library
            </h1>
            <div className='mt-0.5 flex min-w-0 items-center justify-between gap-2'>
              <p className='truncate text-xs text-muted-foreground'>
                {skills.length} discoverable skills
              </p>
              <nav
                aria-label='Library status'
                className='flex shrink-0 items-center gap-0.5'
              >
                <ManagementShortcut
                  label='Review'
                  count={libraryHealth.reviewCount}
                  tooltip='Skills with duplicate names, invalid files, or unusually large instructions.'
                  onClick={() => {
                    onManagementViewChange('review');
                    onClearSelection();
                  }}
                />
                <span aria-hidden='true' className='text-muted-foreground/40'>
                  ·
                </span>
                <ManagementShortcut
                  label='Updates'
                  count={updateCountLabel}
                  tooltip={
                    isCheckingUpdates
                      ? 'Checking tracked GitHub sources. Local files will not be changed.'
                      : skillUpdatesError
                        ? 'The update check could not be completed. Open this view to try again.'
                        : skillUpdates.length === 0
                          ? 'No skills tracked by the skills CLI were found.'
                          : unavailableUpdateCount > 0
                            ? `${unavailableUpdateCount} tracked source${unavailableUpdateCount === 1 ? '' : 's'} could not be checked.`
                            : updateCount > 0
                              ? 'Newer remote files are available. Detection is read-only.'
                              : 'All tracked GitHub skills are current.'
                  }
                  onClick={() => {
                    onManagementViewChange('updates');
                    onClearSelection();
                  }}
                />
                <span aria-hidden='true' className='text-muted-foreground/40'>
                  ·
                </span>
                <ManagementShortcut
                  label='Disabled'
                  count={archivedSkills.length}
                  tooltip='Skills kept on disk but excluded from agent discovery.'
                  onClick={() => {
                    onManagementViewChange('archived');
                    onClearSelection();
                  }}
                />
              </nav>
            </div>
          </div>
        )}

        <label className='relative block'>
          <Search
            size={15}
            className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'
          />
          <span className='sr-only'>Search skills</span>
          <input
            type='search'
            value={searchQuery}
            onChange={event => {
              setSearchQuery(event.target.value);
              onClearSelection();
              setSelectionAnchorId(null);
            }}
            placeholder='Search names, instructions, paths…'
            className='h-9 w-full rounded-xl border bg-background pl-9 pr-3 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20'
          />
        </label>

        <fieldset className='flex min-w-0 gap-1 overflow-x-auto'>
          <legend className='sr-only'>Filter skills</legend>
          {visibleFilters.map(option => (
            <button
              key={option.value}
              type='button'
              aria-pressed={
                managementView
                  ? managementView === option.value
                  : filter === option.value
              }
              onClick={() => {
                if (
                  option.value === 'review' ||
                  option.value === 'updates' ||
                  option.value === 'archived'
                ) {
                  onManagementViewChange(option.value);
                  onClearSelection();
                  return;
                }
                setFilter(option.value);
                onClearSelection();
                setSelectionAnchorId(null);
              }}
              className={cn(
                'rig-pressable shrink-0 rounded-full px-2.5 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                (
                  managementView
                    ? managementView === option.value
                    : filter === option.value
                )
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          ))}
        </fieldset>

        {error ? (
          <div className='rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive'>
            <p className='font-medium'>Some locations could not be read</p>
            <p className='mt-0.5 line-clamp-2 opacity-80'>{error}</p>
          </div>
        ) : null}
      </div>

      <ScrollArea className='min-h-0 min-w-0 flex-1 [&_[data-radix-scroll-area-viewport]>div]:!block [&_[data-radix-scroll-area-viewport]>div]:w-full [&_[data-radix-scroll-area-viewport]>div]:max-w-full'>
        <div className='min-w-0 space-y-1 p-2'>
          {visibleSkills.length === 0 ? (
            <div className='m-2 rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground'>
              {deferredSearchQuery
                ? 'No skills match your search.'
                : managementView === 'archived'
                  ? 'No disabled skills.'
                  : managementView === 'updates'
                    ? isCheckingUpdates
                      ? 'Checking tracked sources…'
                      : unavailableUpdateCount > 0
                        ? 'Updates could not be verified. GitHub temporarily refused the check, often because its anonymous API limit was reached. Try again later.'
                        : 'No updates available.'
                    : managementView === 'review'
                      ? 'No skills need review.'
                      : 'No skills match this view.'}
            </div>
          ) : null}

          {visibleSkills.map(skill => {
            const skillIdentity = getSkillIdentity(skill);
            const isSelected = selectedSkillIds.has(skillIdentity);
            const isFocused = selectedSkill
              ? getSkillIdentity(selectedSkill) === skillIdentity
              : false;
            const usage = usageByName.get(skill.name);
            const tendency = tendencyByName.get(skill.name);
            const count = usage?.count ?? 0;
            const duplicateLocationCount =
              (skill.isArchived
                ? archivedSkillNameCounts
                : activeSkillNameCounts
              ).get(skill.name) ?? 0;
            const actionSkills =
              isSelected && selectedVisibleSkills.length > 0
                ? selectedVisibleSkills
                : [skill];
            const isRemovingSkill = actionSkills.some(actionSkill =>
              removingSkillIds.has(getSkillIdentity(actionSkill)),
            );
            const isChangingArchiveState = actionSkills.some(actionSkill =>
              changingSkillIds.has(getSkillIdentity(actionSkill)),
            );
            const reviewReasons = getSkillReviewReasons({
              skill,
              duplicateNames: duplicateSkillNames,
            });
            const updateStatus = updateByPath.get(
              normalizeFilePath(getSkillFilePath(skill)),
            );

            return (
              <ContextMenu key={skillIdentity}>
                <ContextMenuTrigger asChild>
                  <button
                    type='button'
                    aria-pressed={isSelected}
                    onClick={event => handleSkillClick(event, skill)}
                    onContextMenu={() => {
                      if (!isSelected) {
                        setSelectionAnchorId(skillIdentity);
                        onSelectionChange([skill], skill);
                      }
                    }}
                    className={cn(
                      'rig-pressable group flex w-full min-w-0 max-w-full items-center gap-3 rounded-xl border px-3 py-3 text-left',
                      'hover:bg-accent hover:text-accent-foreground',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isFocused
                        ? 'border-foreground/20 bg-background text-foreground shadow-sm ring-1 ring-inset ring-foreground/5'
                        : isSelected
                          ? 'border-blue-500/20 bg-blue-500/7 text-foreground'
                          : 'border-transparent bg-transparent',
                      isRemovingSkill && 'pointer-events-none opacity-60',
                    )}
                  >
                    <SkillUsageSparkline values={tendency?.series ?? []} />

                    <span className='min-w-0 flex-1 overflow-hidden'>
                      <span className='flex min-w-0 items-center gap-1.5'>
                        <span className='truncate text-sm font-medium'>
                          {skill.name}
                        </span>
                        {!skill.isValid ? (
                          <Badge
                            variant='destructive'
                            className='h-5 px-1.5 text-[10px]'
                          >
                            Invalid
                          </Badge>
                        ) : null}
                        {duplicateLocationCount > 1 &&
                        managementView !== 'review' ? (
                          <DuplicateSkillIndicator
                            locationCount={duplicateLocationCount}
                          />
                        ) : null}
                        {updateStatus?.state === 'updateAvailable' ? (
                          <SkillUpdateIndicator source={updateStatus.source} />
                        ) : null}
                      </span>

                      <span className='mt-1 line-clamp-1 text-xs text-muted-foreground'>
                        {skill.description || skill.relativePath}
                      </span>
                      {managementView === 'review' ? (
                        <span className='mt-1 flex flex-wrap gap-1 text-[10px]'>
                          {reviewReasons.map(reason => (
                            <span
                              key={reason}
                              className='rounded-full bg-amber-500/10 px-1.5 py-0.5 font-medium text-amber-700 dark:text-amber-300'
                            >
                              {formatReviewReason(
                                reason,
                                duplicateLocationCount,
                                skill,
                              )}
                            </span>
                          ))}
                        </span>
                      ) : null}
                      <span className='mt-1 flex min-w-0 items-center gap-1.5 text-[10px] text-muted-foreground/80'>
                        {managementView === 'archived' ? (
                          <span className='rounded-full bg-muted px-1.5 py-0.5 font-medium text-muted-foreground'>
                            Disabled · kept on disk
                          </span>
                        ) : null}
                        <span>
                          {formatTokenEstimate(
                            estimateSkillTokens(skill.content),
                          )}
                        </span>
                        <span aria-hidden='true'>·</span>
                        <span className='truncate'>
                          {managementView === 'updates' && updateStatus
                            ? updateStatus.source
                            : getSkillSourceLabel(skill)}
                        </span>
                      </span>
                    </span>

                    <span
                      className={cn(
                        'shrink-0 text-xs font-light tabular-nums',
                        isFocused
                          ? 'font-medium text-foreground'
                          : 'text-muted-foreground',
                      )}
                    >
                      {skill.isArchived ? '—' : count}
                      {!skill.isArchived ? (
                        <span className='text-muted-foreground'>×</span>
                      ) : null}
                    </span>
                  </button>
                </ContextMenuTrigger>

                <ContextMenuContent alignOffset={4} className='w-52'>
                  <ContextMenuItem
                    onSelect={() => setSkillsPendingShare(actionSkills)}
                  >
                    <Share2 />
                    {actionSkills.length === 1
                      ? 'Share skill'
                      : `Share ${actionSkills.length} skills`}
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  {skill.isArchived ? (
                    <>
                      <ContextMenuItem
                        disabled={isChangingArchiveState}
                        onSelect={() => onRestoreSkills(actionSkills)}
                      >
                        <Power />
                        {actionSkills.length === 1
                          ? 'Enable skill'
                          : `Enable ${actionSkills.length} skills`}
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        variant='destructive'
                        disabled={isRemovingSkill}
                        onSelect={() => setSkillsPendingRemoval(actionSkills)}
                      >
                        <Trash2 />
                        {actionSkills.length === 1
                          ? 'Delete skill'
                          : `Delete ${actionSkills.length} skills`}
                      </ContextMenuItem>
                    </>
                  ) : (
                    <>
                      <ContextMenuItem
                        disabled={isChangingArchiveState}
                        onSelect={() => onArchiveSkills(actionSkills)}
                      >
                        <PowerOff />
                        {actionSkills.length === 1
                          ? 'Disable skill'
                          : `Disable ${actionSkills.length} skills`}
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        variant='destructive'
                        disabled={isRemovingSkill}
                        onSelect={() => setSkillsPendingRemoval(actionSkills)}
                      >
                        <Trash2 />
                        {actionSkills.length === 1
                          ? 'Delete skill'
                          : `Delete ${actionSkills.length} skills`}
                      </ContextMenuItem>
                    </>
                  )}
                </ContextMenuContent>
              </ContextMenu>
            );
          })}
        </div>
      </ScrollArea>

      <div className='flex shrink-0 items-center justify-between gap-3 border-t px-4 py-2 text-[11px] text-muted-foreground'>
        <span className='truncate'>
          ~{formatCompactNumber(libraryHealth.totalEstimatedTokens)} tokens in
          discoverable instructions
        </span>
        <span className='shrink-0'>
          {selectedVisibleSkills.length > 1
            ? `${selectedVisibleSkills.length} selected`
            : managementView === 'archived'
              ? `${archivedSkills.length} disabled`
              : managementView === 'updates'
                ? unavailableUpdateCount > 0 && updateCount === 0
                  ? `${unavailableUpdateCount} unverified`
                  : `${updateCount} updates`
                : managementView === 'review'
                  ? `${libraryHealth.reviewCount} to review`
                  : `${skills.length} skills`}
        </span>
      </div>

      <AlertDialog
        open={skillsPendingRemoval.length > 0}
        onOpenChange={isOpen => {
          if (!isOpen) setSkillsPendingRemoval([]);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete{' '}
              {skillsPendingRemoval.length === 1
                ? 'skill'
                : `${skillsPendingRemoval.length} skills`}
              ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete
              {skillsPendingRemoval.length === 1
                ? ' '
                : ' the selected skills, including '}
              <span className='font-medium text-foreground'>
                {formatSkillNames(skillsPendingRemoval)}
              </span>{' '}
              from disk. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20'
              onClick={() => {
                if (skillsPendingRemoval.length > 0) {
                  onRemoveSkills(skillsPendingRemoval);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ShareSkillsDialog
        skills={skillsPendingShare}
        updateStatuses={skillUpdates}
        open={skillsPendingShare.length > 0}
        onOpenChange={isOpen => {
          if (!isOpen) setSkillsPendingShare([]);
        }}
      />
    </div>
  );
};

const ManagementShortcut = ({
  label,
  count,
  tooltip,
  onClick,
}: {
  label: string;
  count: number | string;
  tooltip: string;
  onClick: () => void;
}) => (
  <Tooltip delayDuration={300}>
    <TooltipTrigger asChild>
      <button
        type='button'
        onClick={onClick}
        aria-label={`${label}: ${count}`}
        className='rig-pressable inline-flex h-6 items-baseline gap-1 rounded-md px-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      >
        <span>{label}</span>
        <span className='font-medium tabular-nums text-foreground/75'>
          {count}
        </span>
      </button>
    </TooltipTrigger>
    <TooltipContent side='bottom' sideOffset={6} className='max-w-64 leading-5'>
      {tooltip}
    </TooltipContent>
  </Tooltip>
);

const DuplicateSkillIndicator = ({
  locationCount,
}: {
  locationCount: number;
}) => (
  <Tooltip delayDuration={300}>
    <TooltipTrigger asChild>
      <span
        className='inline-flex shrink-0 text-amber-500'
        role='img'
        aria-label={`Duplicate skill name found in ${locationCount} locations`}
      >
        <TriangleAlert size={13} />
      </span>
    </TooltipTrigger>
    <TooltipContent side='right' sideOffset={6} className='max-w-64 leading-5'>
      <p className='font-medium'>Duplicate skill name</p>
      <p className='mt-0.5 opacity-80'>
        Found in {locationCount} locations. Activity is grouped by name, so
        calls from these copies may appear together.
      </p>
    </TooltipContent>
  </Tooltip>
);

const SkillUpdateIndicator = ({ source }: { source: string }) => (
  <Tooltip delayDuration={300}>
    <TooltipTrigger asChild>
      <Badge
        variant='outline'
        tabIndex={0}
        className='h-5 shrink-0 border-blue-500/25 bg-blue-500/8 px-1.5 text-[10px] text-blue-700 dark:text-blue-300'
      >
        Update
      </Badge>
    </TooltipTrigger>
    <TooltipContent side='right' sideOffset={6} className='max-w-64 leading-5'>
      <p className='font-medium'>Newer remote files detected</p>
      <p className='mt-0.5 opacity-80'>
        Tracked from {source}. This check did not change your local skill.
      </p>
    </TooltipContent>
  </Tooltip>
);

const formatTokenEstimate = (tokens: number) =>
  `~${formatCompactNumber(tokens)} tokens`;

const formatReviewReason = (
  reason: string,
  duplicateLocationCount: number,
  skill: Skill,
) => {
  if (reason === 'Invalid file') return 'Invalid';
  if (reason === 'Duplicate name') {
    return `Duplicate · ${duplicateLocationCount}`;
  }
  if (reason === 'Large instructions') {
    return `Large · ${formatTokenEstimate(estimateSkillTokens(skill.content))}`;
  }
  return reason;
};

const formatCompactNumber = (value: number) =>
  new Intl.NumberFormat(undefined, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

const formatSkillNames = (skills: Skill[]) => {
  const visibleNames = skills.slice(0, 3).map(skill => skill.name);
  const remainingCount = skills.length - visibleNames.length;

  return remainingCount > 0
    ? `${visibleNames.join(', ')} and ${remainingCount} more`
    : visibleNames.join(', ');
};

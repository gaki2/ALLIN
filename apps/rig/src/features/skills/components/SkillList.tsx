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
  ListChecks,
  Power,
  PowerOff,
  Search,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import posthog from 'posthog-js';
import { useDeferredValue, useMemo, useState } from 'react';
import {
  estimateSkillTokens,
  getDuplicateSkillNames,
  getLibraryHealth,
  getSkillNameCounts,
  getSkillReviewReasons,
  getSkillSourceLabel,
  matchesSkillSearch,
} from '../insights';
import type { Skill, SkillUsage, SkillUsageSeries } from '../types';
import { getSkillIdentity } from '../useRemoveSkill';
import { SkillUsageSparkline } from './SkillUsageSparkline';

const loadingSkeletonIds = Array.from(
  { length: 6 },
  (_, index) => `skill-loading-${index}`,
);

type SkillFilter = 'all' | 'used';
type ManagementView = 'review' | 'archived';

const skillFilters: Array<{ value: SkillFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'used', label: 'Recent · 7d' },
];

export interface SkillListProps {
  skills: Skill[];
  archivedSkills: Skill[];
  selectedSkill: Skill | null;
  skillUsages: SkillUsage[];
  skillUsageTendencies: SkillUsageSeries[];
  isLoading: boolean;
  error: string | null;
  onSelectSkill: (skill: Skill) => void;
  onClearSelection: () => void;
  onRemoveSkill: (skill: Skill) => void;
  removingSkillId: string | null;
  onArchiveSkill: (skill: Skill) => void;
  onRestoreSkill: (skill: Skill) => void;
  changingSkillId: string | null;
  managementView: ManagementView | null;
  onManagementViewChange: (view: ManagementView | null) => void;
}

export const SkillList = ({
  skills,
  archivedSkills,
  selectedSkill,
  skillUsages,
  skillUsageTendencies,
  isLoading,
  error,
  onSelectSkill,
  onClearSelection,
  onRemoveSkill,
  removingSkillId,
  onArchiveSkill,
  onRestoreSkill,
  changingSkillId,
  managementView,
  onManagementViewChange,
}: SkillListProps) => {
  const [skillPendingRemoval, setSkillPendingRemoval] = useState<Skill | null>(
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
    value: SkillFilter | ManagementView;
    label: string;
  }> = managementView
    ? [
        {
          value: 'review',
          label: `Needs review · ${libraryHealth.reviewCount}`,
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
    usageByName,
  ]);

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
                  {managementView === 'archived' ? 'Disabled' : 'Needs review'}
                </h1>
                <p className='text-xs text-muted-foreground'>
                  {managementView === 'archived'
                    ? 'Kept on disk and excluded from agent discovery'
                    : 'Issues that may affect discovery or instruction size'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h1 className='text-lg font-semibold tracking-[-0.02em]'>
              Library
            </h1>
            <p className='text-xs text-muted-foreground'>
              {skills.length} discoverable skills
            </p>
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
            onChange={event => setSearchQuery(event.target.value)}
            placeholder='Search names, instructions, paths…'
            className='h-9 w-full rounded-xl border bg-background pl-9 pr-3 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20'
          />
        </label>

        <fieldset className='flex gap-1 overflow-x-auto'>
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
                if (option.value === 'review' || option.value === 'archived') {
                  onManagementViewChange(option.value);
                  onClearSelection();
                  return;
                }
                setFilter(option.value);
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

        {!managementView ? (
          <nav
            aria-label='Manage skills'
            className='grid grid-cols-2 gap-1.5 rounded-xl border bg-muted/35 p-1.5'
          >
            <ManagementShortcut
              icon={ListChecks}
              label='Review'
              count={libraryHealth.reviewCount}
              tooltip='Skills with duplicate names, invalid files, or unusually large instructions.'
              onClick={() => {
                onManagementViewChange('review');
                onClearSelection();
              }}
            />
            <ManagementShortcut
              icon={PowerOff}
              label='Disabled'
              count={archivedSkills.length}
              tooltip='Skills kept on disk but excluded from agent discovery.'
              onClick={() => {
                onManagementViewChange('archived');
                onClearSelection();
              }}
            />
          </nav>
        ) : null}

        {error ? (
          <div className='rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive'>
            <p className='font-medium'>Some locations could not be read</p>
            <p className='mt-0.5 line-clamp-2 opacity-80'>{error}</p>
          </div>
        ) : null}
      </div>

      <ScrollArea className='min-h-0 flex-1'>
        <div className='space-y-1 p-2'>
          {visibleSkills.length === 0 ? (
            <div className='m-2 rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground'>
              {deferredSearchQuery
                ? 'No skills match your search.'
                : managementView === 'archived'
                  ? 'No disabled skills.'
                  : managementView === 'review'
                    ? 'No skills need review.'
                    : 'No skills match this view.'}
            </div>
          ) : null}

          {visibleSkills.map(skill => {
            const skillIdentity = getSkillIdentity(skill);
            const isSelected = selectedSkill
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
            const isRemovingSkill = removingSkillId === skillIdentity;
            const isChangingArchiveState = changingSkillId === skillIdentity;
            const reviewReasons = getSkillReviewReasons({
              skill,
              duplicateNames: duplicateSkillNames,
            });

            return (
              <ContextMenu key={skillIdentity}>
                <ContextMenuTrigger asChild>
                  <button
                    type='button'
                    aria-current={isSelected ? 'true' : undefined}
                    onClick={() => {
                      onSelectSkill(skill);
                      posthog.capture('skill_selected', {
                        skill_name: skill.name,
                        skill_description: skill.description,
                        skill_is_valid: skill.isValid,
                        skill_usage_count: count,
                        skill_root_path: skill.rootPath,
                      });
                    }}
                    className={cn(
                      'rig-pressable group flex w-full min-w-0 items-center gap-3 rounded-xl border px-3 py-3 text-left',
                      'hover:bg-accent hover:text-accent-foreground',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isSelected
                        ? 'border-foreground/15 bg-background text-foreground shadow-sm'
                        : 'border-transparent bg-transparent',
                      isRemovingSkill && 'pointer-events-none opacity-60',
                    )}
                  >
                    <SkillUsageSparkline values={tendency?.series ?? []} />

                    <span className='min-w-0 flex-1'>
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
                          {getSkillSourceLabel(skill)}
                        </span>
                      </span>
                    </span>

                    <span
                      className={cn(
                        'shrink-0 text-xs font-light tabular-nums',
                        isSelected
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

                <ContextMenuContent alignOffset={4} className='w-40'>
                  {skill.isArchived ? (
                    <ContextMenuItem
                      disabled={isChangingArchiveState}
                      onSelect={() => onRestoreSkill(skill)}
                    >
                      <Power />
                      Enable skill
                    </ContextMenuItem>
                  ) : (
                    <>
                      <ContextMenuItem
                        disabled={isChangingArchiveState}
                        onSelect={() => onArchiveSkill(skill)}
                      >
                        <PowerOff />
                        Disable skill
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        variant='destructive'
                        disabled={isRemovingSkill}
                        onSelect={() => setSkillPendingRemoval(skill)}
                      >
                        <Trash2 />
                        Delete skill
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
          {managementView === 'archived'
            ? `${archivedSkills.length} disabled`
            : managementView === 'review'
              ? `${libraryHealth.reviewCount} to review`
              : `${skills.length} skills`}
        </span>
      </div>

      <AlertDialog
        open={skillPendingRemoval !== null}
        onOpenChange={isOpen => {
          if (!isOpen) setSkillPendingRemoval(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete skill?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{' '}
              <span className='font-medium text-foreground'>
                {skillPendingRemoval?.name}
              </span>{' '}
              from disk. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20'
              onClick={() => {
                if (skillPendingRemoval) onRemoveSkill(skillPendingRemoval);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const ManagementShortcut = ({
  icon: Icon,
  label,
  count,
  tooltip,
  onClick,
}: {
  icon: typeof ListChecks;
  label: string;
  count: number;
  tooltip: string;
  onClick: () => void;
}) => (
  <Tooltip delayDuration={300}>
    <TooltipTrigger asChild>
      <button
        type='button'
        onClick={onClick}
        aria-label={`${label}: ${count}`}
        className='rig-pressable flex min-w-0 items-center gap-2 rounded-lg border border-transparent bg-background/70 px-2.5 py-2 text-left text-xs font-medium text-muted-foreground shadow-xs hover:border-border hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      >
        <Icon size={14} className='shrink-0' />
        <span className='min-w-0 flex-1 truncate'>{label}</span>
        <span className='shrink-0 tabular-nums text-foreground'>{count}</span>
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

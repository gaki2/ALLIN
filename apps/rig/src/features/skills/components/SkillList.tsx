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
  ContextMenuTrigger,
  cn,
  ScrollArea,
} from '@allin/ui';
import { Search, Trash2 } from 'lucide-react';
import posthog from 'posthog-js';
import { useDeferredValue, useMemo, useState } from 'react';
import {
  estimateSkillTokens,
  getLibraryHealth,
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

const skillFilters: Array<{ value: SkillFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'used', label: 'Recent · 7d' },
];

export interface SkillListProps {
  skills: Skill[];
  selectedSkill: Skill | null;
  skillUsages: SkillUsage[];
  skillUsageTendencies: SkillUsageSeries[];
  isLoading: boolean;
  error: string | null;
  onSelectSkill: (skill: Skill) => void;
  onRemoveSkill: (skill: Skill) => void;
  removingSkillId: string | null;
}

export const SkillList = ({
  skills,
  selectedSkill,
  skillUsages,
  skillUsageTendencies,
  isLoading,
  error,
  onSelectSkill,
  onRemoveSkill,
  removingSkillId,
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
  const visibleSkills = useMemo(() => {
    const matchingSkills = skills.filter(skill => {
      const usage = usageByName.get(skill.name);
      const matchesQuery = matchesSkillSearch(skill, deferredSearchQuery);
      const matchesFilter =
        filter === 'all' || (filter === 'used' && (usage?.count ?? 0) > 0);

      return matchesQuery && matchesFilter;
    });

    return matchingSkills.toSorted((a, b) => {
      const aCount = usageByName.get(a.name)?.count ?? 0;
      const bCount = usageByName.get(b.name)?.count ?? 0;

      return bCount - aCount || a.name.localeCompare(b.name);
    });
  }, [deferredSearchQuery, filter, skills, usageByName]);

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
        <div>
          <h1 className='text-lg font-semibold tracking-[-0.02em]'>Library</h1>
          <p className='text-xs text-muted-foreground'>
            {skills.length} skills across your detected context
          </p>
        </div>

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
          {skillFilters.map(option => (
            <button
              key={option.value}
              type='button'
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
              className={cn(
                'rig-pressable shrink-0 rounded-full px-2.5 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                filter === option.value
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

      <ScrollArea className='min-h-0 flex-1'>
        <div className='space-y-1 p-2'>
          {visibleSkills.length === 0 ? (
            <div className='m-2 rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground'>
              No skills match this view.
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
            const isRemovingSkill = removingSkillId === skillIdentity;

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
                      </span>

                      <span className='mt-1 line-clamp-1 text-xs text-muted-foreground'>
                        {skill.description || skill.relativePath}
                      </span>
                      <span className='mt-1 flex min-w-0 gap-1.5 text-[10px] text-muted-foreground/80'>
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
                      {count}
                      <span className='text-muted-foreground'>×</span>
                    </span>
                  </button>
                </ContextMenuTrigger>

                <ContextMenuContent alignOffset={4} className='w-40'>
                  <ContextMenuItem
                    variant='destructive'
                    disabled={isRemovingSkill}
                    onSelect={() => setSkillPendingRemoval(skill)}
                  >
                    <Trash2 />
                    Delete skill
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })}
        </div>
      </ScrollArea>

      <div className='shrink-0 border-t px-4 py-2.5 text-[11px] text-muted-foreground'>
        ~{formatCompactNumber(libraryHealth.totalEstimatedTokens)} estimated
        tokens stored locally
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

const formatTokenEstimate = (tokens: number) =>
  `~${formatCompactNumber(tokens)} tokens`;

const formatCompactNumber = (value: number) =>
  new Intl.NumberFormat(undefined, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

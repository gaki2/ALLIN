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
import { Trash2 } from 'lucide-react';
import posthog from 'posthog-js';
import { useState } from 'react';
import {
  providerLabels,
  providerOrder,
  type SkillGroup,
} from '../groupSkills';
import type { Skill, SkillUsage, SkillUsageSeries } from '../types';
import { getSkillIdentity } from '../useRemoveSkill';
import { SkillUsageSparkline } from './SkillUsageSparkline';

const loadingSkeletonIds = Array.from(
  { length: 6 },
  (_, index) => `skill-loading-${index}`,
);

export interface SkillListProps {
  skillGroups: SkillGroup[];
  selectedSkillGroup: SkillGroup | null;
  skillUsages: SkillUsage[];
  skillUsageTendencies: SkillUsageSeries[];
  isLoading: boolean;
  error: string | null;
  onSelectSkillGroup: (skillGroup: SkillGroup) => void;
  onRemoveSkill: (skill: Skill) => void;
  removingSkillId: string | null;
}

export const SkillList = ({
  skillGroups,
  selectedSkillGroup,
  skillUsages,
  skillUsageTendencies,
  isLoading,
  error,
  onSelectSkillGroup,
  onRemoveSkill,
  removingSkillId,
}: SkillListProps) => {
  const [skillPendingRemoval, setSkillPendingRemoval] = useState<Skill | null>(
    null,
  );

  if (isLoading) {
    return (
      <div className='space-y-2 p-3'>
        {loadingSkeletonIds.map(skeletonId => (
          <div
            key={skeletonId}
            className='h-16 animate-pulse rounded-lg bg-muted'
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className='p-4 text-sm text-destructive'>
        <p className='font-medium'>Failed to load skills</p>
        <p className='mt-1 text-xs opacity-80'>{error}</p>
      </div>
    );
  }

  const usageByName = new Map(skillUsages.map(usage => [usage.name, usage]));
  const tendencyByName = new Map(
    skillUsageTendencies.map(tendency => [tendency.name, tendency]),
  );
  const totalFires = skillGroups.reduce(
    (total, group) => total + (usageByName.get(group.name)?.count ?? 0),
    0,
  );
  const sortedSkillGroups = skillGroups.toSorted((a, b) => {
    const aCount = usageByName.get(a.name)?.count ?? 0;
    const bCount = usageByName.get(b.name)?.count ?? 0;

    return bCount - aCount || a.name.localeCompare(b.name);
  });

  return (
    <div className='flex h-full min-h-0 flex-col'>
      <div className='shrink-0 border-b px-5 py-4'>
        <div className='flex items-baseline gap-2'>
          <h2 className='text-xl font-semibold tracking-tight'>Skills</h2>
          <p className='text-sm text-muted-foreground'>
            {skillGroups.length} skills · {totalFires} fires
          </p>
        </div>
      </div>
      <ScrollArea className='min-h-0 flex-1'>
        <div className='space-y-1'>
          {sortedSkillGroups.length === 0 && (
            <div className='p-1 text-sm text-muted-foreground'>
              No skills found in this scope.
            </div>
          )}

          {sortedSkillGroups.map(skillGroup => {
            const isSelected = selectedSkillGroup?.id === skillGroup.id;
            const usage = usageByName.get(skillGroup.name);
            const tendency = tendencyByName.get(skillGroup.name);
            const count = usage?.count ?? 0;
            const isRemovingSkill = skillGroup.instances.some(
              skill => removingSkillId === getSkillIdentity(skill),
            );

            return (
              <ContextMenu key={skillGroup.id}>
                <ContextMenuTrigger asChild>
                  <button
                    type='button'
                    aria-current={isSelected ? 'true' : undefined}
                    onClick={() => {
                      onSelectSkillGroup(skillGroup);
                      posthog.capture('skill_selected', {
                        skill_name: skillGroup.name,
                        skill_description: skillGroup.description,
                        skill_is_valid: skillGroup.instances.every(
                          skill => skill.isValid,
                        ),
                        skill_usage_count:
                          usageByName.get(skillGroup.name)?.count ?? 0,
                        skill_providers: skillGroup.providers,
                      });
                    }}
                    className={cn(
                      'flex w-full max-w-76 mx-auto min-w-0 items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
                      'hover:bg-accent hover:text-accent-foreground',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isSelected
                        ? 'border-primary bg-accent text-accent-foreground'
                        : 'border-transparent bg-transparent',
                      isRemovingSkill && 'pointer-events-none opacity-60',
                    )}
                  >
                    <SkillUsageSparkline values={tendency?.series ?? []} />

                    <span className='min-w-0 flex-1'>
                      <span className='flex min-w-0 items-center gap-2'>
                        <span className='truncate text-sm font-medium'>
                          {skillGroup.name}
                        </span>
                        {skillGroup.instances.some(skill => !skill.isValid) && (
                          <Badge
                            variant='destructive'
                            className='h-5 px-1.5 text-[10px]'
                          >
                            Invalid
                          </Badge>
                        )}
                      </span>

                      <span className='mt-1 line-clamp-1 text-xs text-muted-foreground'>
                        {formatProviders(skillGroup)}
                      </span>
                    </span>

                    <span
                      className={cn(
                        'shrink-0 text-xs font-light tabular-nums',
                        isSelected
                          ? 'text-primary font-medium'
                          : 'text-muted-foreground',
                      )}
                    >
                      {count}
                      <span className='text-xs text-muted-foreground'>×</span>
                    </span>
                  </button>
                </ContextMenuTrigger>

                <ContextMenuContent alignOffset={4} className='w-48'>
                  {skillGroup.instances.map(skill => (
                    <ContextMenuItem
                      key={getSkillIdentity(skill)}
                      variant='destructive'
                      disabled={isRemovingSkill}
                      onSelect={() => setSkillPendingRemoval(skill)}
                    >
                      <Trash2 />
                      Delete from {providerLabels[skill.provider]}
                    </ContextMenuItem>
                  ))}
                </ContextMenuContent>
              </ContextMenu>
            );
          })}
        </div>
      </ScrollArea>

      <AlertDialog
        open={skillPendingRemoval !== null}
        onOpenChange={isOpen => {
          if (!isOpen) {
            setSkillPendingRemoval(null);
          }
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
              from {skillPendingRemoval ? providerLabels[skillPendingRemoval.provider] : 'disk'}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20'
              onClick={() => {
                if (skillPendingRemoval) {
                  onRemoveSkill(skillPendingRemoval);
                }
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

const formatProviders = (skillGroup: SkillGroup) => {
  return skillGroup.providers
    .toSorted((a, b) => providerOrder.indexOf(a) - providerOrder.indexOf(b))
    .map(provider => providerLabels[provider])
    .join(' · ');
};

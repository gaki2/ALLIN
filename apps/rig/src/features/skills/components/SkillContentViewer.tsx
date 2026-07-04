import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ScrollArea,
} from '@allin/ui';
import { useQuery } from '@tanstack/react-query';
import { Effect } from 'effect';
import { useMemo, useState } from 'react';
import {
  getDefaultProviderSkill,
  providerLabels,
  providerOrder,
  type Skill,
} from '../skillModel';
import { listSkillUsageEvents, listSkillUsages } from '../api';
import type { ProviderSkill, SkillProvider, SkillRoot, SkillUsageEvent } from '../types';
import { useInstallSkill } from '../useInstallSkill';

interface SkillContentViewerProps {
  skill: Skill | null;
  roots: SkillRoot[];
}

export const SkillContentViewer = ({ skill, roots }: SkillContentViewerProps) => {
  const skillName = skill?.name ?? '';
  const defaultProviderSkill = skill ? getDefaultProviderSkill(skill) : null;
  const installSkillMutation = useInstallSkill();
  const [installTargetRoot, setInstallTargetRoot] = useState<SkillRoot | null>(null);
  const [selectedSourceProvider, setSelectedSourceProvider] =
    useState<SkillProvider | null>(null);
  const {
    data: recentEvents = [],
    error: eventsError,
    isLoading: isEventsLoading,
  } = useQuery({
    queryKey: ['skill-usage-events', skillName, 20],
    queryFn: () => Effect.runPromise(listSkillUsageEvents(skillName, 20)),
    enabled: skill !== null,
  });
  const { data: monthUsages = [] } = useQuery({
    queryKey: ['skill-usages', 'month'],
    queryFn: () => Effect.runPromise(listSkillUsages('month')),
    enabled: skill !== null,
  });
  const { data: allUsages = [] } = useQuery({
    queryKey: ['skill-usages', 'all'],
    queryFn: () => Effect.runPromise(listSkillUsages('all')),
    enabled: skill !== null,
  });

  if (!skill || !defaultProviderSkill) {
    return (
      <div className='flex h-full items-center justify-center text-sm text-muted-foreground'>
        Select a skill to view its usage.
      </div>
    );
  }

  const providerSkills = Object.values(skill.providerSkills);
  const installSourceSkills = useMemo(
    () =>
      providerOrder.flatMap(provider => {
        const providerSkill = skill.providerSkills[provider];
        return providerSkill ? [providerSkill] : [];
      }),
    [skill],
  );
  const selectedSourceSkill = selectedSourceProvider
    ? skill.providerSkills[selectedSourceProvider]
    : (installSourceSkills[0] ?? null);
  const monthUsage = monthUsages.find(usage => usage.name === skill.name);
  const allUsage = allUsages.find(usage => usage.name === skill.name);
  const lastUsedAt = recentEvents[0]?.usedAt ?? allUsage?.lastUsedAt ?? null;

  return (
    <div className='flex h-full min-h-0 flex-col'>
      <div className='shrink-0 border-b px-6 py-4'>
        <div className='flex min-w-0 items-center gap-2'>
          <h1 className='truncate text-lg font-semibold tracking-tight'>
            {skill.name}
          </h1>
          {providerSkills.some(providerSkill => !providerSkill.isValid) && (
            <Badge variant='destructive'>Invalid</Badge>
          )}
        </div>

        <p className='mt-1 max-w-5xl font-mono text-sm text-muted-foreground'>
          {skill.description}
        </p>

        {defaultProviderSkill.validationError && (
          <p className='mt-2 text-sm text-destructive'>
            {defaultProviderSkill.validationError.message}
          </p>
        )}
      </div>

      <ScrollArea className='min-h-0 flex-1'>
        <div className='space-y-6 p-6'>
          <div className='grid gap-3 sm:grid-cols-3'>
            <UsageMetric
              label='Total fires'
              value={`${allUsage?.count ?? 0}×`}
            />
            <UsageMetric
              label='Last 30 days'
              value={`${monthUsage?.count ?? 0}×`}
            />
            <UsageMetric
              label='Last fired'
              value={formatLastFired(lastUsedAt)}
            />
          </div>

          <ProviderMatrix
            skill={skill}
            roots={roots}
            onInstallToRoot={root => {
              setInstallTargetRoot(root);
              setSelectedSourceProvider(installSourceSkills[0]?.provider ?? null);
            }}
            installingTargetRootId={installSkillMutation.installingTargetRootId}
          />

          <section className='rounded-xl border bg-card'>
            <div className='border-b px-4 py-3'>
              <h2 className='text-sm font-semibold'>Recent calls</h2>
              <p className='mt-1 text-xs text-muted-foreground'>
                Latest recorded invocations for this skill.
              </p>
            </div>

            <div className='divide-y'>
              {isEventsLoading && (
                <div className='space-y-3 p-4'>
                  {loadingRowIds.map(rowId => (
                    <div key={rowId} className='space-y-2'>
                      <div className='h-4 w-40 animate-pulse rounded bg-muted' />
                      <div className='h-3 w-24 animate-pulse rounded bg-muted' />
                    </div>
                  ))}
                </div>
              )}

              {!isEventsLoading && eventsError && (
                <div className='p-4 text-sm text-destructive'>
                  Failed to load usage events: {String(eventsError)}
                </div>
              )}

              {!isEventsLoading &&
                !eventsError &&
                recentEvents.length === 0 && (
                  <div className='p-4 text-sm text-muted-foreground'>
                    No usage events recorded yet.
                  </div>
                )}

              {!isEventsLoading &&
                !eventsError &&
                recentEvents.map(event => (
                  <UsageEventRow
                    key={`${event.usedAt}:${event.source}`}
                    event={event}
                  />
                ))}
            </div>
          </section>
        </div>
      </ScrollArea>

      <InstallSkillDialog
        open={installTargetRoot !== null}
        skillName={skill.name}
        sourceSkills={installSourceSkills}
        targetRoot={installTargetRoot}
        selectedSourceProvider={selectedSourceSkill?.provider ?? null}
        isInstalling={installSkillMutation.isInstalling}
        onOpenChange={isOpen => {
          if (!isOpen) {
            setInstallTargetRoot(null);
            setSelectedSourceProvider(null);
          }
        }}
        onSelectSourceProvider={setSelectedSourceProvider}
        onInstall={() => {
          if (!selectedSourceSkill || !installTargetRoot) {
            return;
          }

          installSkillMutation.installSkill(
            { sourceSkill: selectedSourceSkill, targetRoot: installTargetRoot },
            {
              onSuccess: () => {
                setInstallTargetRoot(null);
                setSelectedSourceProvider(null);
              },
            },
          );
        }}
      />
    </div>
  );
};

const ProviderMatrix = ({
  skill,
  roots,
  onInstallToRoot,
  installingTargetRootId,
}: {
  skill: Skill;
  roots: SkillRoot[];
  onInstallToRoot: (root: SkillRoot) => void;
  installingTargetRootId: string | null;
}) => {
  const orderedRoots = roots.toSorted(
    (a, b) => providerOrder.indexOf(a.provider) - providerOrder.indexOf(b.provider),
  );

  return (
    <section className='rounded-xl border bg-card'>
      <div className='border-b px-4 py-3'>
        <h2 className='text-sm font-semibold'>Provider inventory</h2>
        <p className='mt-1 text-xs text-muted-foreground'>
          Where this skill exists in the current scope.
        </p>
      </div>

      <div className='divide-y'>
        {orderedRoots.map(root => {
          const providerSkill = skill.providerSkills[root.provider];

          return (
            <div
              key={root.id}
              className='flex items-start justify-between gap-4 px-4 py-3'
            >
              <div className='min-w-0 flex-1'>
                <div className='flex items-center gap-2'>
                  <p className='text-sm font-medium'>
                    {providerLabels[root.provider]}
                  </p>
                  <Badge variant={providerSkill ? 'secondary' : 'outline'}>
                    {providerSkill ? 'Installed' : 'Missing'}
                  </Badge>
                </div>
                <p className='mt-1 truncate font-mono text-xs text-muted-foreground'>
                  {providerSkill
                    ? `${providerSkill.rootPath}/${providerSkill.relativePath}`
                    : root.path}
                </p>
              </div>

              {!providerSkill && (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  disabled={installingTargetRootId === root.id}
                  onClick={() => onInstallToRoot(root)}
                >
                  {installingTargetRootId === root.id ? 'Installing...' : 'Install'}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

const InstallSkillDialog = ({
  open,
  skillName,
  sourceSkills,
  targetRoot,
  selectedSourceProvider,
  isInstalling,
  onOpenChange,
  onSelectSourceProvider,
  onInstall,
}: {
  open: boolean;
  skillName: string;
  sourceSkills: ProviderSkill[];
  targetRoot: SkillRoot | null;
  selectedSourceProvider: SkillProvider | null;
  isInstalling: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectSourceProvider: (provider: SkillProvider) => void;
  onInstall: () => void;
}) => {
  const selectedSourceSkill = selectedSourceProvider
    ? sourceSkills.find(sourceSkill => sourceSkill.provider === selectedSourceProvider)
    : (sourceSkills[0] ?? null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Install skill</DialogTitle>
          <DialogDescription>
            Choose an existing provider as the source. Rig will install this skill into the missing provider for the current scope.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='rounded-lg border bg-muted/30 p-3'>
            <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
              Skill
            </p>
            <p className='mt-1 font-mono text-sm font-medium'>{skillName}</p>
          </div>

          <label className='block space-y-2 text-sm'>
            <span className='font-medium'>Source provider</span>
            <select
              className='h-10 w-full rounded-md border bg-background px-3 text-sm'
              value={selectedSourceSkill?.provider ?? ''}
              onChange={event =>
                onSelectSourceProvider(event.target.value as SkillProvider)
              }
            >
              {sourceSkills.map(sourceSkill => (
                <option key={sourceSkill.provider} value={sourceSkill.provider}>
                  {providerLabels[sourceSkill.provider]}
                </option>
              ))}
            </select>
          </label>

          <PathPreview
            label='Source'
            providerSkill={selectedSourceSkill}
            fallback='Select a source provider'
          />
          <PathPreview
            label='Target'
            path={
              targetRoot && selectedSourceSkill
                ? `${targetRoot.path}/${selectedSourceSkill.relativePath}`
                : (targetRoot?.path ?? 'Select a target provider')
            }
            fallback='Select a target provider'
          />
        </div>

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            disabled={isInstalling}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type='button'
            disabled={!selectedSourceSkill || !targetRoot || isInstalling}
            onClick={onInstall}
          >
            {isInstalling
              ? 'Installing...'
              : `Install to ${targetRoot ? providerLabels[targetRoot.provider] : 'provider'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const PathPreview = ({
  label,
  providerSkill,
  path,
  fallback,
}: {
  label: string;
  providerSkill?: ProviderSkill | null;
  path?: string;
  fallback: string;
}) => {
  const previewPath = providerSkill
    ? `${providerSkill.rootPath}/${providerSkill.relativePath}`
    : path;

  return (
    <div className='rounded-lg border bg-muted/30 p-3'>
      <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
        {label}
      </p>
      <p className='mt-1 break-all font-mono text-xs'>
        {previewPath ?? fallback}
      </p>
    </div>
  );
};

const loadingRowIds = Array.from(
  { length: 4 },
  (_, index) => `usage-event-loading-${index}`,
);

const UsageMetric = ({ label, value }: { label: string; value: string }) => {
  return (
    <div className='rounded-xl border bg-card p-4'>
      <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
        {label}
      </p>
      <p className='mt-2 truncate text-2xl font-semibold tracking-tight'>
        {value}
      </p>
    </div>
  );
};

const UsageEventRow = ({ event }: { event: SkillUsageEvent }) => {
  return (
    <div className='flex items-start justify-between gap-4 px-4 py-3'>
      <div className='min-w-0'>
        <p className='text-sm font-medium'>{formatDateTime(event.usedAt)}</p>
        <p className='mt-1 text-xs text-muted-foreground'>
          {formatRelativeTime(event.usedAt)}
        </p>
      </div>

      <Badge variant='outline' className='shrink-0 font-mono text-[11px]'>
        {event.source}
      </Badge>
    </div>
  );
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) {
    return 'Never';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const formatLastFired = (value: string | null | undefined) => {
  if (!value) {
    return 'Never';
  }

  return formatRelativeTime(value);
};

const formatRelativeTime = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
  ];

  for (const [unit, secondsInUnit] of units) {
    if (Math.abs(diffSeconds) >= secondsInUnit) {
      return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(
        Math.round(diffSeconds / secondsInUnit),
        unit,
      );
    }
  }

  return 'just now';
};

import { Badge, ScrollArea } from '@allin/ui';
import { useQuery } from '@tanstack/react-query';
import { Effect } from 'effect';
import {
  providerLabels,
  providerOrder,
  type SkillGroup,
} from '../groupSkills';
import { listSkillUsageEvents, listSkillUsages } from '../api';
import type { SkillRoot, SkillUsageEvent } from '../types';

interface SkillContentViewerProps {
  skillGroup: SkillGroup | null;
  roots: SkillRoot[];
}

export const SkillContentViewer = ({
  skillGroup,
  roots,
}: SkillContentViewerProps) => {
  const skillName = skillGroup?.name ?? '';
  const primarySkill = skillGroup?.primarySkill ?? null;
  const {
    data: recentEvents = [],
    error: eventsError,
    isLoading: isEventsLoading,
  } = useQuery({
    queryKey: ['skill-usage-events', skillName, 20],
    queryFn: () => Effect.runPromise(listSkillUsageEvents(skillName, 20)),
    enabled: skillGroup !== null,
  });
  const { data: monthUsages = [] } = useQuery({
    queryKey: ['skill-usages', 'month'],
    queryFn: () => Effect.runPromise(listSkillUsages('month')),
    enabled: skillGroup !== null,
  });
  const { data: allUsages = [] } = useQuery({
    queryKey: ['skill-usages', 'all'],
    queryFn: () => Effect.runPromise(listSkillUsages('all')),
    enabled: skillGroup !== null,
  });

  if (!skillGroup || !primarySkill) {
    return (
      <div className='flex h-full items-center justify-center text-sm text-muted-foreground'>
        Select a skill to view its usage.
      </div>
    );
  }

  const monthUsage = monthUsages.find(usage => usage.name === skillGroup.name);
  const allUsage = allUsages.find(usage => usage.name === skillGroup.name);
  const lastUsedAt = recentEvents[0]?.usedAt ?? allUsage?.lastUsedAt ?? null;

  return (
    <div className='flex h-full min-h-0 flex-col'>
      <div className='shrink-0 border-b px-6 py-4'>
        <div className='flex min-w-0 items-center gap-2'>
          <h1 className='truncate text-lg font-semibold tracking-tight'>
            {skillGroup.name}
          </h1>
          {skillGroup.instances.some(skill => !skill.isValid) && (
            <Badge variant='destructive'>Invalid</Badge>
          )}
        </div>

        <p className='mt-1 max-w-5xl font-mono text-sm text-muted-foreground'>
          {skillGroup.description}
        </p>

        {primarySkill.validationError && (
          <p className='mt-2 text-sm text-destructive'>
            {primarySkill.validationError.message}
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

          <ProviderMatrix skillGroup={skillGroup} roots={roots} />

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
    </div>
  );
};

const ProviderMatrix = ({
  skillGroup,
  roots,
}: {
  skillGroup: SkillGroup;
  roots: SkillRoot[];
}) => {
  const instanceByProvider = new Map(
    skillGroup.instances.map(instance => [instance.provider, instance]),
  );
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
          const instance = instanceByProvider.get(root.provider);

          return (
            <div
              key={root.id}
              className='flex items-start justify-between gap-4 px-4 py-3'
            >
              <div className='min-w-0'>
                <div className='flex items-center gap-2'>
                  <p className='text-sm font-medium'>
                    {providerLabels[root.provider]}
                  </p>
                  <Badge variant={instance ? 'secondary' : 'outline'}>
                    {instance ? 'Installed' : 'Missing'}
                  </Badge>
                </div>
                <p className='mt-1 truncate font-mono text-xs text-muted-foreground'>
                  {instance
                    ? `${instance.rootPath}/${instance.relativePath}`
                    : root.path}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
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

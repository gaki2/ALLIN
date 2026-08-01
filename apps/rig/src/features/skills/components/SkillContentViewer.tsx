import { Badge, cn, ScrollArea, toast } from '@allin/ui';
import { useQuery } from '@tanstack/react-query';
import { Effect } from 'effect';
import {
  Activity,
  ArrowLeft,
  BookOpenText,
  Check,
  Clipboard,
  Code2,
  FileWarning,
} from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeExternalLinks from 'rehype-external-links';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { listSkillUsageEvents, listSkillUsages } from '../api';
import {
  estimateSkillTokens,
  getLibraryHealth,
  getSkillSourceLabel,
} from '../insights';
import type { Skill, SkillUsage, SkillUsageEvent } from '../types';
import { getSkillIdentity } from '../useRemoveSkill';

interface SkillContentViewerProps {
  skill: Skill | null;
  skills: Skill[];
  weekUsages: SkillUsage[];
  onSelectSkill: (skill: Skill) => void;
  onBack: () => void;
}

export const SkillContentViewer = ({
  skill,
  skills,
  weekUsages,
  onSelectSkill,
  onBack,
}: SkillContentViewerProps) => {
  if (!skill) {
    return (
      <LibraryOverview
        skills={skills}
        weekUsages={weekUsages}
        onSelectSkill={onSelectSkill}
      />
    );
  }

  return (
    <SkillInspector
      key={getSkillIdentity(skill)}
      skill={skill}
      weekUsages={weekUsages}
      onBack={onBack}
    />
  );
};

const SkillInspector = ({
  skill,
  weekUsages,
  onBack,
}: {
  skill: Skill;
  weekUsages: SkillUsage[];
  onBack: () => void;
}) => {
  const [activeTab, setActiveTab] = useState<InspectorTab>(
    skill.isValid ? 'rendered' : 'source',
  );
  const [didCopy, setDidCopy] = useState(false);
  const skillName = skill.name;
  const {
    data: recentEvents = [],
    error: eventsError,
    isLoading: isEventsLoading,
  } = useQuery({
    queryKey: ['skill-usage-events', skillName, 20],
    queryFn: () => Effect.runPromise(listSkillUsageEvents(skillName, 20)),
    enabled: activeTab === 'activity',
  });
  const { data: allUsages = [] } = useQuery({
    queryKey: ['skill-usages', 'all'],
    queryFn: () => Effect.runPromise(listSkillUsages('all')),
  });
  const weekUsage = weekUsages.find(usage => usage.name === skill.name);
  const allUsage = allUsages.find(usage => usage.name === skill.name);
  const lastUsedAt = allUsage?.lastUsedAt ?? null;
  const description = skill.description || 'No description provided.';

  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(skill.content);
      setDidCopy(true);
      window.setTimeout(() => setDidCopy(false), 1_500);
    } catch {
      toast.error('Could not copy skill content');
    }
  };

  return (
    <div className='flex h-full min-h-0 flex-col bg-background'>
      <header className='shrink-0 border-b bg-background/90 px-6 py-2.5 backdrop-blur-lg'>
        <div className='mx-auto max-w-5xl'>
          <button
            type='button'
            onClick={onBack}
            className='rig-pressable mb-2 -ml-2 inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden'
          >
            <ArrowLeft size={16} />
            Library
          </button>
          <div className='flex min-w-0 items-center gap-3'>
            <h1 className='max-w-[35%] shrink-0 truncate text-lg font-semibold tracking-[-0.025em]'>
              {skill.name}
            </h1>
            {!skill.isValid ? (
              <Badge variant='destructive' className='shrink-0'>
                Invalid
              </Badge>
            ) : null}
            <p
              className='min-w-0 flex-1 truncate text-sm text-muted-foreground'
              title={description}
            >
              {description}
            </p>
            <button
              type='button'
              onClick={copyContent}
              className='rig-pressable inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg border bg-background px-2 text-xs font-medium shadow-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            >
              {didCopy ? <Check size={13} /> : <Clipboard size={13} />}
              <span className='hidden sm:inline'>
                {didCopy ? 'Copied' : 'Copy'}
              </span>
            </button>
          </div>

          <div className='mt-2 flex min-w-0 items-center gap-4'>
            <div
              className='flex shrink-0 gap-1'
              role='tablist'
              aria-label='Skill content view'
            >
              <InspectorTabButton
                icon={<BookOpenText size={14} />}
                label='Instructions'
                value='rendered'
                isSelected={activeTab === 'rendered'}
                disabled={!skill.isValid}
                onSelect={setActiveTab}
              />
              <InspectorTabButton
                icon={<Code2 size={14} />}
                label='Source'
                value='source'
                isSelected={activeTab === 'source'}
                onSelect={setActiveTab}
              />
              <InspectorTabButton
                icon={<Activity size={14} />}
                label='Activity'
                value='activity'
                isSelected={activeTab === 'activity'}
                onSelect={setActiveTab}
              />
            </div>
            <p
              className='ml-auto hidden min-w-0 truncate text-right text-xs text-muted-foreground sm:block'
              title={`${getSkillSourceLabel(skill)} · ${skill.relativePath}/SKILL.md · ~${formatCompactNumber(estimateSkillTokens(skill.content))} estimated tokens${skill.updatedAt ? ` · Updated ${formatRelativeTime(skill.updatedAt)}` : ''}`}
            >
              {getSkillSourceLabel(skill)}
              <span aria-hidden='true'> · </span>~
              {formatCompactNumber(estimateSkillTokens(skill.content))} tokens
              <span aria-hidden='true'> · </span>
              {weekUsage?.count ?? 0}× / 7d
              <span aria-hidden='true'> · </span>
              {lastUsedAt ? formatRelativeTime(lastUsedAt) : 'no calls'}
            </p>
          </div>
        </div>
      </header>

      <ScrollArea className='min-h-0 flex-1'>
        <main className='mx-auto w-full max-w-5xl px-6 py-5'>
          {skill.validationError ? (
            <div className='mb-5 flex gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive'>
              <FileWarning size={18} className='mt-0.5 shrink-0' />
              <div>
                <p className='font-semibold'>This skill needs attention</p>
                <p className='mt-1 leading-6'>
                  {skill.validationError.message}
                </p>
              </div>
            </div>
          ) : null}

          <section
            role='tabpanel'
            aria-label={
              activeTab === 'rendered'
                ? 'Rendered instructions'
                : activeTab === 'source'
                  ? 'Skill source'
                  : 'Recent skill activity'
            }
          >
            {activeTab === 'rendered' ? (
              <SkillMarkdown content={skill.content} />
            ) : activeTab === 'source' ? (
              <pre className='overflow-x-auto whitespace-pre-wrap break-words rounded-2xl border bg-muted/35 p-5 font-mono text-[13px] leading-6 text-foreground'>
                <code>
                  {skill.content || 'This skill has no readable content.'}
                </code>
              </pre>
            ) : (
              <ActivityPanel
                events={recentEvents}
                error={eventsError}
                isLoading={isEventsLoading}
              />
            )}
          </section>
        </main>
      </ScrollArea>
    </div>
  );
};

export const SkillMarkdown = ({ content }: { content: string }) => (
  <article className='prose prose-neutral max-w-[76ch] dark:prose-invert prose-headings:tracking-[-0.02em] prose-a:text-blue-600 prose-pre:overflow-x-auto'>
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[
        rehypeSanitize,
        [rehypeExternalLinks, { target: '_blank', rel: ['noreferrer'] }],
      ]}
    >
      {content}
    </ReactMarkdown>
  </article>
);

const LibraryOverview = ({
  skills,
  weekUsages,
  onSelectSkill,
}: {
  skills: Skill[];
  weekUsages: SkillUsage[];
  onSelectSkill: (skill: Skill) => void;
}) => {
  const libraryHealth = getLibraryHealth(skills);
  const recentlyUsed = skills
    .filter(
      skill =>
        (weekUsages.find(usage => usage.name === skill.name)?.count ?? 0) > 0,
    )
    .toSorted((a, b) => {
      const aCount =
        weekUsages.find(usage => usage.name === a.name)?.count ?? 0;
      const bCount =
        weekUsages.find(usage => usage.name === b.name)?.count ?? 0;
      return bCount - aCount;
    })
    .slice(0, 6);
  const callsThisWeek = weekUsages.reduce(
    (total, usage) => total + usage.count,
    0,
  );

  return (
    <ScrollArea className='h-full'>
      <div className='mx-auto flex min-h-full max-w-5xl flex-col justify-center px-8 py-10'>
        <div className='max-w-2xl'>
          <h2 className='text-3xl font-semibold tracking-[-0.04em]'>
            Choose a skill to inspect.
          </h2>
          <p className='mt-3 max-w-xl text-base leading-7 text-muted-foreground'>
            Read its instructions, compare the source, or open recent activity
            without leaving the library.
          </p>
        </div>

        <div className='mt-8 grid gap-3 md:grid-cols-3'>
          <OverviewMetric label='Skills discovered' value={skills.length} />
          <OverviewMetric
            label='Calls this week'
            value={callsThisWeek}
            detail={`${recentlyUsed.length} skills used in the last 7 days`}
          />
          <OverviewMetric
            label='Instructions stored'
            value={`~${formatCompactNumber(libraryHealth.totalEstimatedTokens)}`}
            detail='Estimated tokens'
          />
        </div>

        <div className='mt-7'>
          <OverviewList
            title='Used this week'
            empty='Usage appears here after an agent connection records calls.'
            skills={recentlyUsed}
            onSelectSkill={onSelectSkill}
          />
        </div>
      </div>
    </ScrollArea>
  );
};

const OverviewMetric = ({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) => (
  <div className='rounded-2xl border bg-card p-4 shadow-xs'>
    <p className='text-xs font-medium text-muted-foreground'>{label}</p>
    <p className='mt-2 text-2xl font-semibold tracking-[-0.03em]'>{value}</p>
    {detail ? (
      <p className='mt-1 text-xs text-muted-foreground'>{detail}</p>
    ) : null}
  </div>
);

const OverviewList = ({
  title,
  empty,
  skills,
  onSelectSkill,
}: {
  title: string;
  empty: string;
  skills: Skill[];
  onSelectSkill: (skill: Skill) => void;
}) => (
  <section>
    <h3 className='text-sm font-semibold'>{title}</h3>
    <div className='mt-2 overflow-hidden rounded-2xl border bg-card'>
      {skills.length === 0 ? (
        <p className='p-4 text-sm leading-6 text-muted-foreground'>{empty}</p>
      ) : (
        skills.map(skill => (
          <button
            key={getSkillIdentity(skill)}
            type='button'
            onClick={() => onSelectSkill(skill)}
            className='rig-pressable flex w-full items-center justify-between gap-3 border-b px-4 py-3 text-left last:border-b-0 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'
          >
            <span className='min-w-0'>
              <span className='block truncate text-sm font-medium'>
                {skill.name}
              </span>
              <span className='mt-0.5 block truncate text-xs text-muted-foreground'>
                {getSkillSourceLabel(skill)} · {skill.relativePath}
              </span>
            </span>
            <span className='text-xs text-muted-foreground'>Open</span>
          </button>
        ))
      )}
    </div>
  </section>
);

type InspectorTab = 'rendered' | 'source' | 'activity';

const InspectorTabButton = ({
  icon,
  label,
  value,
  isSelected,
  disabled,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  value: InspectorTab;
  isSelected: boolean;
  disabled?: boolean;
  onSelect: (value: InspectorTab) => void;
}) => (
  <button
    type='button'
    role='tab'
    aria-selected={isSelected}
    disabled={disabled}
    onClick={() => onSelect(value)}
    className={cn(
      'rig-pressable inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40',
      isSelected
        ? 'bg-foreground text-background'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
    )}
  >
    {icon}
    {label}
  </button>
);

const ActivityPanel = ({
  events,
  error,
  isLoading,
}: {
  events: SkillUsageEvent[];
  error: unknown;
  isLoading: boolean;
}) => (
  <div
    className='overflow-hidden rounded-2xl border bg-card'
    aria-live='polite'
  >
    <div className='border-b px-4 py-3'>
      <h2 className='text-sm font-semibold'>Recent calls</h2>
      <p className='mt-0.5 text-xs text-muted-foreground'>
        The latest 20 recorded calls for this skill name.
      </p>
    </div>
    <div className='divide-y px-4'>
      {isLoading ? (
        <div className='py-5 text-sm text-muted-foreground'>
          Loading activity…
        </div>
      ) : null}
      {!isLoading && error ? (
        <div className='py-5 text-sm text-destructive'>
          Failed to load calls: {String(error)}
        </div>
      ) : null}
      {!isLoading && !error && events.length === 0 ? (
        <div className='py-5 text-sm text-muted-foreground'>
          No calls have been recorded for this skill name.
        </div>
      ) : null}
      {!isLoading && !error
        ? events.map(event => (
            <UsageEventRow
              key={`${event.usedAt}:${event.source}`}
              event={event}
            />
          ))
        : null}
    </div>
  </div>
);

const UsageEventRow = ({ event }: { event: SkillUsageEvent }) => (
  <div className='flex items-center justify-between gap-4 py-3'>
    <div className='min-w-0'>
      <p className='text-sm font-medium'>{formatDateTime(event.usedAt)}</p>
      <p className='mt-0.5 text-xs text-muted-foreground'>
        {formatRelativeTime(event.usedAt)}
      </p>
    </div>
    <Badge variant='outline' className='shrink-0 font-mono text-[11px]'>
      {event.source}
    </Badge>
  </div>
);

const formatCompactNumber = (value: number) =>
  new Intl.NumberFormat(undefined, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const formatRelativeTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1_000);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ];

  for (const [unit, seconds] of units) {
    if (Math.abs(diffSeconds) >= seconds) {
      return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(
        Math.round(diffSeconds / seconds),
        unit,
      );
    }
  }

  return 'just now';
};

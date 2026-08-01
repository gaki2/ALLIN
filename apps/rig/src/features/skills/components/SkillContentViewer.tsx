import { Badge, cn, ScrollArea, toast } from '@allin/ui';
import { useQuery } from '@tanstack/react-query';
import { Effect } from 'effect';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpenText,
  Check,
  ChevronDown,
  Clipboard,
  Code2,
  FileWarning,
  Layers3,
} from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeExternalLinks from 'rehype-external-links';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { listSkillUsageEvents, listSkillUsages } from '../api';
import {
  estimateSkillTokens,
  getDuplicateSkillNames,
  getLibraryHealth,
  getSkillReviewReasons,
  getSkillSourceLabel,
} from '../insights';
import type { Skill, SkillUsage, SkillUsageEvent } from '../types';
import { getSkillIdentity } from '../useRemoveSkill';

interface SkillContentViewerProps {
  skill: Skill | null;
  skills: Skill[];
  monthUsages: SkillUsage[];
  onSelectSkill: (skill: Skill) => void;
  onBack: () => void;
}

export const SkillContentViewer = ({
  skill,
  skills,
  monthUsages,
  onSelectSkill,
  onBack,
}: SkillContentViewerProps) => {
  if (!skill) {
    return (
      <LibraryOverview
        skills={skills}
        monthUsages={monthUsages}
        onSelectSkill={onSelectSkill}
      />
    );
  }

  return (
    <SkillInspector
      key={getSkillIdentity(skill)}
      skill={skill}
      skills={skills}
      monthUsages={monthUsages}
      onBack={onBack}
    />
  );
};

const SkillInspector = ({
  skill,
  skills,
  monthUsages,
  onBack,
}: {
  skill: Skill;
  skills: Skill[];
  monthUsages: SkillUsage[];
  onBack: () => void;
}) => {
  const [activeTab, setActiveTab] = useState<InspectorTab>(
    skill.isValid ? 'rendered' : 'source',
  );
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [didCopy, setDidCopy] = useState(false);
  const skillName = skill.name;
  const {
    data: recentEvents = [],
    error: eventsError,
    isLoading: isEventsLoading,
  } = useQuery({
    queryKey: ['skill-usage-events', skillName, 20],
    queryFn: () => Effect.runPromise(listSkillUsageEvents(skillName, 20)),
    enabled: isActivityOpen,
  });
  const { data: allUsages = [] } = useQuery({
    queryKey: ['skill-usages', 'all'],
    queryFn: () => Effect.runPromise(listSkillUsages('all')),
  });
  const monthUsage = monthUsages.find(usage => usage.name === skill.name);
  const allUsage = allUsages.find(usage => usage.name === skill.name);
  const lastUsedAt = recentEvents[0]?.usedAt ?? allUsage?.lastUsedAt ?? null;
  const reviewReasons = getSkillReviewReasons({
    skill,
    duplicateNames: getDuplicateSkillNames(skills),
  });

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
      <header className='shrink-0 border-b bg-background/90 px-6 py-4 backdrop-blur-lg'>
        <div className='mx-auto max-w-5xl'>
          <button
            type='button'
            onClick={onBack}
            className='rig-pressable mb-3 -ml-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden'
          >
            <ArrowLeft size={16} />
            Library
          </button>
          <div className='flex min-w-0 items-start justify-between gap-4'>
            <div className='min-w-0'>
              <div className='flex min-w-0 items-center gap-2'>
                <h1 className='truncate text-xl font-semibold tracking-[-0.025em]'>
                  {skill.name}
                </h1>
                {!skill.isValid ? (
                  <Badge variant='destructive'>Invalid</Badge>
                ) : null}
              </div>
              <p className='mt-1 line-clamp-2 max-w-3xl text-sm leading-6 text-muted-foreground'>
                {skill.description || 'No description provided.'}
              </p>
            </div>

            <button
              type='button'
              onClick={copyContent}
              className='rig-pressable inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border bg-background px-2.5 text-xs font-medium shadow-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            >
              {didCopy ? <Check size={14} /> : <Clipboard size={14} />}
              {didCopy ? 'Copied' : 'Copy'}
            </button>
          </div>

          <div className='mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground'>
            <span className='font-mono'>{getSkillSourceLabel(skill)}</span>
            <span aria-hidden='true'>·</span>
            <span className='font-mono'>{skill.relativePath}/SKILL.md</span>
            <span aria-hidden='true'>·</span>
            <span>
              ~{formatCompactNumber(estimateSkillTokens(skill.content))}{' '}
              estimated tokens
            </span>
            {skill.updatedAt ? (
              <>
                <span aria-hidden='true'>·</span>
                <span>Updated {formatRelativeTime(skill.updatedAt)}</span>
              </>
            ) : null}
          </div>

          {reviewReasons.length > 0 ? (
            <ul
              className='mt-3 flex flex-wrap gap-1.5'
              aria-label='Library review findings'
            >
              {reviewReasons.map(reason => (
                <li
                  key={reason}
                  className='inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/8 px-2 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300'
                >
                  <AlertTriangle size={11} />
                  {getReviewEvidence(reason, skill, skills)}
                </li>
              ))}
            </ul>
          ) : null}

          <div className='mt-4 flex items-end justify-between gap-4'>
            <div
              className='flex gap-1'
              role='tablist'
              aria-label='Skill content view'
            >
              <InspectorTabButton
                icon={<BookOpenText size={14} />}
                label='Rendered'
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
            </div>
            <p className='hidden text-right text-xs text-muted-foreground sm:block'>
              Used {monthUsage?.count ?? 0}× in 30 days
              <span aria-hidden='true'> · </span>
              {lastUsedAt
                ? `last ${formatRelativeTime(lastUsedAt)}`
                : 'no recorded calls'}
            </p>
          </div>
        </div>
      </header>

      <ScrollArea className='min-h-0 flex-1'>
        <main className='mx-auto w-full max-w-5xl px-6 py-7'>
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
                : 'Skill source'
            }
          >
            {activeTab === 'rendered' ? (
              <SkillMarkdown content={skill.content} />
            ) : (
              <pre className='overflow-x-auto whitespace-pre-wrap break-words rounded-2xl border bg-muted/35 p-5 font-mono text-[13px] leading-6 text-foreground'>
                <code>
                  {skill.content || 'This skill has no readable content.'}
                </code>
              </pre>
            )}
          </section>

          <section className='mt-8 border-t pt-3'>
            <button
              type='button'
              aria-expanded={isActivityOpen}
              onClick={() => setIsActivityOpen(current => !current)}
              className='rig-pressable flex min-h-11 w-full items-center justify-between rounded-xl px-2 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            >
              <span>
                <span className='text-sm font-semibold'>Recent calls</span>
                <span className='ml-2 text-xs text-muted-foreground'>
                  Diagnostic activity, kept out of the way
                </span>
              </span>
              <ChevronDown
                size={16}
                className={cn(
                  'text-muted-foreground transition-transform duration-150',
                  isActivityOpen && 'rotate-180',
                )}
              />
            </button>

            {isActivityOpen ? (
              <div className='rig-fade-in divide-y px-2' aria-live='polite'>
                {isEventsLoading ? (
                  <div className='py-4 text-sm text-muted-foreground'>
                    Loading activity…
                  </div>
                ) : null}
                {!isEventsLoading && eventsError ? (
                  <div className='py-4 text-sm text-destructive'>
                    Failed to load calls: {String(eventsError)}
                  </div>
                ) : null}
                {!isEventsLoading &&
                !eventsError &&
                recentEvents.length === 0 ? (
                  <div className='py-4 text-sm text-muted-foreground'>
                    No calls have been recorded for this skill name.
                  </div>
                ) : null}
                {!isEventsLoading && !eventsError
                  ? recentEvents.map(event => (
                      <UsageEventRow
                        key={`${event.usedAt}:${event.source}`}
                        event={event}
                      />
                    ))
                  : null}
              </div>
            ) : null}
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
  monthUsages,
  onSelectSkill,
}: {
  skills: Skill[];
  monthUsages: SkillUsage[];
  onSelectSkill: (skill: Skill) => void;
}) => {
  const libraryHealth = getLibraryHealth(skills);
  const duplicateNames = getDuplicateSkillNames(skills);
  const recentlyUsed = skills
    .filter(
      skill =>
        (monthUsages.find(usage => usage.name === skill.name)?.count ?? 0) > 0,
    )
    .toSorted((a, b) => {
      const aCount =
        monthUsages.find(usage => usage.name === a.name)?.count ?? 0;
      const bCount =
        monthUsages.find(usage => usage.name === b.name)?.count ?? 0;
      return bCount - aCount;
    })
    .slice(0, 4);
  const reviewSkills = skills.filter(
    skill => getSkillReviewReasons({ skill, duplicateNames }).length > 0,
  );

  return (
    <ScrollArea className='h-full'>
      <div className='mx-auto flex min-h-full max-w-5xl flex-col justify-center px-8 py-10'>
        <div className='max-w-2xl'>
          <div className='mb-5 flex size-11 items-center justify-center rounded-2xl border bg-muted/50 text-foreground shadow-sm'>
            <Layers3 size={20} />
          </div>
          <p className='text-sm font-medium text-blue-600 dark:text-blue-300'>
            Your local skill control plane
          </p>
          <h2 className='mt-2 text-3xl font-semibold tracking-[-0.04em]'>
            Inspect what your agents know.
          </h2>
          <p className='mt-3 max-w-xl text-base leading-7 text-muted-foreground'>
            Select a skill to read its complete instructions, understand where
            it comes from, and review concrete library issues without sending
            content anywhere.
          </p>
        </div>

        <div className='mt-8 grid gap-3 md:grid-cols-3'>
          <OverviewMetric label='Skills discovered' value={skills.length} />
          <OverviewMetric
            label='Library review'
            value={libraryHealth.reviewCount}
            detail={
              libraryHealth.reviewCount > 0
                ? `${libraryHealth.reviewCount} need review`
                : 'No inventory issues'
            }
          />
          <OverviewMetric
            label='Instructions stored'
            value={`~${formatCompactNumber(libraryHealth.totalEstimatedTokens)}`}
            detail='Estimated tokens · local only'
          />
        </div>

        <div className='mt-7 grid gap-6 lg:grid-cols-2'>
          <OverviewList
            title='Used recently'
            empty='Usage appears here after an agent connection records calls.'
            skills={recentlyUsed}
            onSelectSkill={onSelectSkill}
          />
          <OverviewList
            title='Needs review'
            empty='No invalid, duplicate-name, or unusually large skills.'
            skills={reviewSkills.slice(0, 4)}
            onSelectSkill={onSelectSkill}
            isWarning
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
  isWarning = false,
}: {
  title: string;
  empty: string;
  skills: Skill[];
  onSelectSkill: (skill: Skill) => void;
  isWarning?: boolean;
}) => (
  <section>
    <h3 className='flex items-center gap-2 text-sm font-semibold'>
      {isWarning ? (
        <AlertTriangle size={15} className='text-amber-500' />
      ) : null}
      {title}
    </h3>
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

type InspectorTab = 'rendered' | 'source';

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
      'rig-pressable inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40',
      isSelected
        ? 'bg-foreground text-background'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
    )}
  >
    {icon}
    {label}
  </button>
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

const getReviewEvidence = (reason: string, skill: Skill, skills: Skill[]) => {
  if (reason === 'Duplicate name') {
    const locationCount = skills.filter(
      candidate => candidate.name === skill.name,
    ).length;
    return `Same name in ${locationCount} locations`;
  }

  if (reason === 'Large instructions') {
    return `${formatCompactNumber(skill.content.length)} characters`;
  }

  return reason;
};

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

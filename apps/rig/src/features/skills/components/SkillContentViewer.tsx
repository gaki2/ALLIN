import {
  Badge,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  toast,
} from '@allin/ui';
import { useQuery } from '@tanstack/react-query';
import { Effect } from 'effect';
import {
  ArrowLeft,
  Clipboard,
  FileWarning,
  LoaderCircle,
  MoreHorizontal,
  Power,
  PowerOff,
  RefreshCw,
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
  getSkillFilePath,
  getSkillSourceLabel,
  LARGE_SKILL_CHARACTER_THRESHOLD,
} from '../insights';
import { getSkillSourceId } from '../skillSources';
import type {
  Skill,
  SkillManagementView,
  SkillUpdateStatus,
  SkillUsage,
  SkillUsageEvent,
} from '../types';
import { getSkillIdentity } from '../useRemoveSkill';
import { ShareSkillDialog } from './ShareSkillDialog';
import { SkillHistoryPanel } from './SkillHistoryPanel';
import { SkillProviderIcon } from './SkillProviderIcon';
import { UpdateSkillDialog } from './UpdateSkillDialog';

interface SkillContentViewerProps {
  skill: Skill | null;
  skills: Skill[];
  weekUsages: SkillUsage[];
  skillUpdates: SkillUpdateStatus[];
  isCheckingUpdates: boolean;
  onCheckUpdates: () => void;
  onSelectSkill: (skill: Skill) => void;
  onBack: () => void;
  onArchiveSkill: (skill: Skill) => void;
  onRestoreSkill: (skill: Skill) => void;
  isChangingArchiveState: boolean;
  managementView: SkillManagementView | null;
}

export const SkillContentViewer = ({
  skill,
  skills,
  weekUsages,
  skillUpdates,
  isCheckingUpdates,
  onCheckUpdates,
  onSelectSkill,
  onBack,
  onArchiveSkill,
  onRestoreSkill,
  isChangingArchiveState,
  managementView,
}: SkillContentViewerProps) => {
  if (!skill) {
    const activeSkills = skills.filter(candidate => !candidate.isArchived);

    if (managementView) {
      return (
        <ManagementOverview
          mode={managementView}
          hasItems={
            managementView === 'archived'
              ? skills.some(candidate => candidate.isArchived)
              : managementView === 'updates'
                ? skillUpdates.some(
                    update => update.state === 'updateAvailable',
                  )
                : getLibraryHealth(activeSkills).reviewCount > 0
          }
          isCheckingUpdates={isCheckingUpdates}
          onCheckUpdates={onCheckUpdates}
          isUpdateCheckUnavailable={
            managementView === 'updates' &&
            skillUpdates.some(update => update.state === 'checkUnavailable')
          }
        />
      );
    }

    return (
      <LibraryOverview
        skills={activeSkills}
        weekUsages={weekUsages}
        onSelectSkill={onSelectSkill}
      />
    );
  }

  return (
    <SkillInspector
      key={getSkillIdentity(skill)}
      skill={skill}
      updateStatus={skillUpdates.find(
        update =>
          normalizeFilePath(update.installPath) ===
          normalizeFilePath(getSkillFilePath(skill)),
      )}
      weekUsages={weekUsages}
      duplicateLocationCount={
        skills.filter(
          candidate =>
            candidate.name === skill.name &&
            candidate.isArchived === skill.isArchived,
        ).length
      }
      onBack={onBack}
      onArchiveSkill={onArchiveSkill}
      onRestoreSkill={onRestoreSkill}
      isChangingArchiveState={isChangingArchiveState}
    />
  );
};

const SkillInspector = ({
  skill,
  updateStatus,
  weekUsages,
  duplicateLocationCount,
  onBack,
  onArchiveSkill,
  onRestoreSkill,
  isChangingArchiveState,
}: {
  skill: Skill;
  updateStatus?: SkillUpdateStatus;
  weekUsages: SkillUsage[];
  duplicateLocationCount: number;
  onBack: () => void;
  onArchiveSkill: (skill: Skill) => void;
  onRestoreSkill: (skill: Skill) => void;
  isChangingArchiveState: boolean;
}) => {
  const [activeTab, setActiveTab] = useState<InspectorTab>(
    skill.isValid ? 'rendered' : 'source',
  );
  const [detailsOpen, setDetailsOpen] = useState(false);
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
    enabled: activeTab === 'activity',
  });
  const weekUsage = weekUsages.find(usage => usage.name === skill.name);
  const allUsage = allUsages.find(usage => usage.name === skill.name);
  const lastUsedAt = allUsage?.lastUsedAt ?? null;
  const description = skill.description || 'No description provided.';
  const skillFilePath = getSkillFilePath(skill);
  const estimatedTokens = estimateSkillTokens(skill.content);
  const isLargeSkill = skill.content.length >= LARGE_SKILL_CHARACTER_THRESHOLD;

  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(skill.content);
      toast.success('Instructions copied');
    } catch {
      toast.error('Could not copy skill content');
    }
  };

  const copyFilePath = async () => {
    try {
      await navigator.clipboard.writeText(skillFilePath);
      toast.success('File path copied');
    } catch {
      toast.error('Could not copy the skill path');
    }
  };

  return (
    <div className='flex h-full min-h-0 flex-col bg-background'>
      <header className='shrink-0 border-b bg-background/90 px-6 pt-3 backdrop-blur-lg'>
        <div className='mx-auto max-w-5xl'>
          <button
            type='button'
            onClick={onBack}
            className='rig-pressable mb-2 -ml-2 inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden'
          >
            <ArrowLeft size={16} />
            Library
          </button>
          <div className='flex min-w-0 items-start gap-4'>
            <div className='min-w-0 flex-1'>
              <div className='flex min-w-0 items-center gap-2'>
                <h1 className='truncate text-lg font-semibold tracking-[-0.025em]'>
                  {skill.name}
                </h1>
                {!skill.isValid ? (
                  <Badge variant='destructive' className='shrink-0'>
                    Invalid
                  </Badge>
                ) : null}
                {skill.isArchived ? (
                  <Badge variant='secondary' className='shrink-0 text-[10px]'>
                    Disabled
                  </Badge>
                ) : null}
                {duplicateLocationCount > 1 ? (
                  <DuplicateSkillBadge
                    locationCount={duplicateLocationCount}
                    onShowDetails={() => setDetailsOpen(true)}
                  />
                ) : null}
                {updateStatus?.state === 'updateAvailable' ? (
                  <SkillUpdateBadge update={updateStatus} />
                ) : null}
                {isLargeSkill ? (
                  <Badge variant='outline' className='shrink-0 text-[10px]'>
                    Large · ~{formatCompactNumber(estimatedTokens)} tokens
                  </Badge>
                ) : null}
              </div>
              <p
                className='mt-1 line-clamp-1 max-w-2xl text-sm leading-5 text-muted-foreground'
                title={description}
              >
                {description}
              </p>
            </div>

            <div className='flex shrink-0 items-center gap-2'>
              {updateStatus?.state === 'updateAvailable' &&
              !skill.isArchived ? (
                <UpdateSkillDialog
                  skill={skill}
                  updateStatus={updateStatus}
                  onUpdated={() => setActiveTab('history')}
                />
              ) : null}
              <ShareSkillDialog skill={skill} updateStatus={updateStatus} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type='button'
                    aria-label='More skill actions'
                    className='rig-pressable inline-flex size-7 shrink-0 items-center justify-center rounded-lg border bg-background shadow-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                  >
                    <MoreHorizontal size={14} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end' className='w-52'>
                  <DropdownMenuItem onSelect={() => void copyContent()}>
                    <Clipboard />
                    Copy instructions
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => void copyFilePath()}>
                    <Clipboard />
                    Copy file path
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={isChangingArchiveState}
                    className='items-start'
                    onSelect={() =>
                      skill.isArchived
                        ? onRestoreSkill(skill)
                        : onArchiveSkill(skill)
                    }
                  >
                    {isChangingArchiveState ? (
                      <LoaderCircle className='animate-spin' />
                    ) : skill.isArchived ? (
                      <Power />
                    ) : (
                      <PowerOff />
                    )}
                    <span>
                      <span className='block'>
                        {isChangingArchiveState
                          ? skill.isArchived
                            ? 'Enabling…'
                            : 'Disabling…'
                          : skill.isArchived
                            ? 'Enable skill'
                            : 'Disable skill'}
                      </span>
                      {!isChangingArchiveState ? (
                        <span className='mt-0.5 block text-[11px] text-muted-foreground'>
                          {skill.isArchived
                            ? 'Return it to agent discovery'
                            : 'Hide it from agent discovery'}
                        </span>
                      ) : null}
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className='mt-2 flex h-10 min-w-0 items-end justify-between gap-4'>
            <div
              className='flex h-full shrink-0 items-end gap-5'
              role='tablist'
              aria-label='Skill content view'
            >
              <InspectorTabButton
                label='Instructions'
                value='rendered'
                isSelected={activeTab === 'rendered'}
                disabled={!skill.isValid}
                onSelect={setActiveTab}
              />
              <InspectorTabButton
                label='Source'
                value='source'
                isSelected={activeTab === 'source'}
                onSelect={setActiveTab}
              />
              <InspectorTabButton
                label='Activity'
                value='activity'
                isSelected={activeTab === 'activity'}
                onSelect={setActiveTab}
              />
              <InspectorTabButton
                label='History'
                value='history'
                isSelected={activeTab === 'history'}
                onSelect={setActiveTab}
              />
            </div>
            <Popover open={detailsOpen} onOpenChange={setDetailsOpen}>
              <PopoverTrigger asChild>
                <button
                  type='button'
                  aria-label='Show skill details'
                  className='rig-pressable mb-1.5 inline-flex h-7 items-center rounded-lg px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                >
                  Details
                </button>
              </PopoverTrigger>
              <PopoverContent
                align='end'
                sideOffset={6}
                className='skill-details-popover w-[360px] p-3'
              >
                <div className='grid grid-cols-[84px_minmax(0,1fr)] gap-x-3 gap-y-3 text-sm'>
                  <span className='text-muted-foreground'>Source</span>
                  <span className='flex min-w-0 items-center gap-1.5 font-medium'>
                    <SkillProviderIcon
                      sourceId={getSkillSourceId(skill)}
                      size={13}
                    />
                    <span className='truncate'>
                      {getSkillSourceLabel(skill)}
                    </span>
                  </span>
                  <span className='text-muted-foreground'>Location</span>
                  <button
                    type='button'
                    onClick={copyFilePath}
                    title={skillFilePath}
                    className='rig-pressable flex min-w-0 items-center gap-1.5 rounded-md text-left font-mono text-xs hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                  >
                    <span className='truncate'>
                      {abbreviateHomePath(skillFilePath)}
                    </span>
                    <Clipboard size={12} className='shrink-0' />
                  </button>
                  <span className='text-muted-foreground'>Estimated size</span>
                  <span>
                    About {formatCompactNumber(estimatedTokens)} tokens
                  </span>
                  {skill.updatedAt ? (
                    <>
                      <span className='text-muted-foreground'>Modified</span>
                      <span>{formatRelativeTime(skill.updatedAt)}</span>
                    </>
                  ) : null}
                </div>
                <p className='mt-3 border-t pt-3 text-xs leading-5 text-muted-foreground'>
                  Token count is estimated from file length and may differ by
                  model.
                </p>
              </PopoverContent>
            </Popover>
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
                  : activeTab === 'activity'
                    ? 'Recent skill activity'
                    : 'Skill version history'
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
            ) : activeTab === 'activity' ? (
              <ActivityPanel
                events={recentEvents}
                error={eventsError}
                isLoading={isEventsLoading}
                hasDuplicateNames={duplicateLocationCount > 1}
                weekUsage={weekUsage}
                lastUsedAt={lastUsedAt}
              />
            ) : (
              <SkillHistoryPanel skill={skill} />
            )}
          </section>
        </main>
      </ScrollArea>
    </div>
  );
};

const ManagementOverview = ({
  mode,
  hasItems,
  isCheckingUpdates,
  isUpdateCheckUnavailable,
  onCheckUpdates,
}: {
  mode: SkillManagementView;
  hasItems: boolean;
  isCheckingUpdates: boolean;
  isUpdateCheckUnavailable: boolean;
  onCheckUpdates: () => void;
}) => {
  const isDisabled = mode === 'archived';
  const isUpdates = mode === 'updates';

  return (
    <div className='flex h-full items-center justify-center px-8 py-10'>
      <div className='max-w-md text-center'>
        <div className='mx-auto flex size-11 items-center justify-center rounded-2xl border bg-card shadow-xs'>
          {isDisabled ? (
            <Power size={19} />
          ) : isUpdates ? (
            <RefreshCw size={19} />
          ) : (
            <FileWarning size={19} />
          )}
        </div>
        <h2 className='mt-4 text-2xl font-semibold tracking-[-0.035em]'>
          {hasItems
            ? isDisabled
              ? 'Choose a disabled skill.'
              : isUpdates
                ? 'Choose a skill with an update.'
                : 'Choose a skill to review.'
            : isDisabled
              ? 'No disabled skills.'
              : isUpdates
                ? isUpdateCheckUnavailable
                  ? 'Update check unavailable.'
                  : 'Tracked skills are current.'
                : 'Nothing needs review.'}
        </h2>
        <p className='mt-2 text-sm leading-6 text-muted-foreground'>
          {hasItems
            ? isDisabled
              ? 'Inspect its instructions and source before enabling it for agent discovery again.'
              : isUpdates
                ? 'Inspect the local instructions and tracked source. Update detection never changes files.'
                : 'Review the evidence before disabling anything. Disabled skill files stay on disk.'
            : isDisabled
              ? 'Skills disabled from this scope will stay available here so you can enable them again.'
              : isUpdates
                ? isUpdateCheckUnavailable
                  ? 'Rig could not verify the tracked GitHub sources. Anonymous API rate limits are a common cause; retry later without changing any local files.'
                  : 'Rig compared each installed folder hash with its tracked GitHub source.'
                : 'No invalid, duplicate, or unusually large instructions were found in this scope.'}
        </p>
        {isUpdates && !hasItems ? (
          <button
            type='button'
            onClick={onCheckUpdates}
            disabled={isCheckingUpdates}
            className='rig-pressable mx-auto mt-4 inline-flex h-8 items-center gap-2 rounded-lg border bg-background px-3 text-xs font-medium shadow-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-50'
          >
            <RefreshCw
              size={14}
              className={cn(isCheckingUpdates && 'animate-spin')}
            />
            {isCheckingUpdates ? 'Checking…' : 'Check again'}
          </button>
        ) : null}
      </div>
    </div>
  );
};

const DuplicateSkillBadge = ({
  locationCount,
  onShowDetails,
}: {
  locationCount: number;
  onShowDetails: () => void;
}) => (
  <Tooltip delayDuration={300}>
    <TooltipTrigger asChild>
      <button
        type='button'
        onClick={onShowDetails}
        className='rig-pressable inline-flex h-5 shrink-0 items-center rounded-full border border-amber-500/30 bg-amber-500/8 px-2 text-[10px] font-semibold text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-amber-300'
      >
        Duplicate · {locationCount}
      </button>
    </TooltipTrigger>
    <TooltipContent sideOffset={6} className='max-w-64 leading-5'>
      <p className='font-medium'>Duplicate skill name</p>
      <p className='mt-0.5 opacity-80'>
        This name exists in {locationCount} locations. Open Details to confirm
        this file&apos;s location. Activity is grouped by skill name.
      </p>
    </TooltipContent>
  </Tooltip>
);

const SkillUpdateBadge = ({ update }: { update: SkillUpdateStatus }) => (
  <Tooltip delayDuration={300}>
    <TooltipTrigger asChild>
      <Badge
        variant='outline'
        tabIndex={0}
        className='shrink-0 border-blue-500/25 bg-blue-500/8 text-[10px] text-blue-700 dark:text-blue-300'
      >
        Update available
      </Badge>
    </TooltipTrigger>
    <TooltipContent sideOffset={6} className='max-w-72 leading-5'>
      <p className='font-medium'>Newer files at {update.source}</p>
      <p className='mt-0.5 opacity-80'>
        Rig compared folder hashes only. Your local skill has not been changed.
      </p>
    </TooltipContent>
  </Tooltip>
);

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
              <span className='mt-0.5 flex min-w-0 items-center gap-1 text-xs text-muted-foreground'>
                <SkillProviderIcon
                  sourceId={getSkillSourceId(skill)}
                  size={12}
                />
                <span className='shrink-0'>{getSkillSourceLabel(skill)}</span>
                <span aria-hidden='true'>·</span>
                <span className='truncate'>{skill.relativePath}</span>
              </span>
            </span>
            <span className='text-xs text-muted-foreground'>Open</span>
          </button>
        ))
      )}
    </div>
  </section>
);

type InspectorTab = 'rendered' | 'source' | 'activity' | 'history';

const InspectorTabButton = ({
  label,
  value,
  isSelected,
  disabled,
  onSelect,
}: {
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
      'rig-pressable relative inline-flex h-10 items-center text-xs font-medium after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-center after:rounded-full after:bg-foreground after:transition-transform after:duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40',
      isSelected
        ? 'text-foreground after:scale-x-100'
        : 'text-muted-foreground after:scale-x-0 hover:text-foreground',
    )}
  >
    {label}
  </button>
);

const ActivityPanel = ({
  events,
  error,
  isLoading,
  hasDuplicateNames,
  weekUsage,
  lastUsedAt,
}: {
  events: SkillUsageEvent[];
  error: unknown;
  isLoading: boolean;
  hasDuplicateNames: boolean;
  weekUsage?: SkillUsage;
  lastUsedAt: string | null;
}) => (
  <div
    className='overflow-hidden rounded-2xl border bg-card'
    aria-live='polite'
  >
    <div className='border-b px-4 py-3'>
      <h2 className='text-sm font-semibold'>
        {weekUsage?.count
          ? `${weekUsage.count} ${weekUsage.count === 1 ? 'call' : 'calls'} in the last 7 days`
          : lastUsedAt
            ? 'No calls in the last 7 days'
            : 'No recorded calls'}
      </h2>
      <p className='mt-0.5 text-xs text-muted-foreground'>
        {lastUsedAt
          ? `Last called ${formatRelativeTime(lastUsedAt)}. Showing the latest 20 calls.`
          : 'Rig has not recorded a call for this skill yet.'}
      </p>
      {hasDuplicateNames ? (
        <p className='mt-1 text-xs text-amber-700'>
          Same-name skills share activity because agents do not report the
          selected file path.
        </p>
      ) : null}
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
      {formatUsageSource(event.source)}
    </Badge>
  </div>
);

const formatUsageSource = (source: string) => {
  if (source === 'codex') return 'Codex · Explicit';
  if (source === 'claude-code') return 'Claude Code';
  if (source === 'opencode') return 'OpenCode';
  return source;
};

const formatCompactNumber = (value: number) =>
  new Intl.NumberFormat(undefined, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

const abbreviateHomePath = (value: string) =>
  value
    .replace(/^\/Users\/[^/]+(?=\/)/, '~')
    .replace(/^\/home\/[^/]+(?=\/)/, '~')
    .replace(/^[A-Za-z]:\\Users\\[^\\]+(?=\\)/, '~');

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

const normalizeFilePath = (value: string) =>
  value.replaceAll('\\', '/').replace(/\/+$/, '');

import type { Metadata } from 'next';
import Image from 'next/image';
import claudeIcon from '../../rig/public/application_icon/claude-ai.svg';
import codexIcon from '../../rig/public/application_icon/openai.webp';
import openCodeDarkIcon from '../../rig/public/application_icon/opencode-dark.webp';
import openCodeLightIcon from '../../rig/public/application_icon/opencode-light.webp';
import appIcon from '../../rig/src-tauri/icons/icon.png';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Rig — Know which agent skills actually get used',
  description:
    'Track skill usage across Claude Code, Codex, and OpenCode. Share, update, compare, and restore every SKILL.md from one local desktop workspace.',
  openGraph: {
    title: 'Know which agent skills actually get used.',
    description:
      'Track usage across agents, share skills, update safely, and restore local versions.',
    type: 'website',
  },
};

const latestReleaseUrl =
  'https://github.com/builder-mafia/rig/releases/latest/download/latest.json';
const fallbackDownloadUrl =
  'https://github.com/builder-mafia/rig/releases/latest';

interface LatestRelease {
  version: string;
  platforms?: {
    'darwin-aarch64'?: {
      url?: string;
    };
  };
}

const getReleaseInfo = async () => {
  try {
    const response = await fetch(latestReleaseUrl, {
      next: { revalidate },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch latest release: ${response.status}`);
    }

    const latestRelease = (await response.json()) as LatestRelease;
    const releaseVersion = latestRelease.version;
    const updaterUrl = latestRelease.platforms?.['darwin-aarch64']?.url;
    const downloadUrl =
      typeof updaterUrl === 'string' && updaterUrl.length > 0
        ? updaterUrl.replace(
            '/Rig.app.tar.gz',
            `/Rig_${releaseVersion}_aarch64.dmg`,
          )
        : `https://github.com/builder-mafia/rig/releases/download/v${releaseVersion}/Rig_${releaseVersion}_aarch64.dmg`;

    return { downloadUrl, releaseVersion };
  } catch {
    return { downloadUrl: fallbackDownloadUrl, releaseVersion: 'latest' };
  }
};

const skillRows = [
  {
    name: 'accessibility',
    description: 'Audit and improve web accessibility…',
    provider: 'Codex',
    source: 'codex',
    meta: '~3.2K tokens',
    selected: true,
  },
  {
    name: 'agent-browser',
    description: 'Browser automation for AI agents…',
    provider: 'Claude Code',
    source: 'claude',
    meta: '~579 tokens',
  },
  {
    name: 'vercel-react-best-practices',
    description: 'React and Next.js performance…',
    provider: 'Codex',
    source: 'codex',
    meta: '~1.7K tokens',
    update: true,
  },
  {
    name: 'review-animations',
    description: 'Review motion against a high craft bar…',
    provider: 'OpenCode',
    source: 'opencode',
    meta: '~2.1K tokens',
  },
];

const providerRows = [
  {
    name: 'Claude Code',
    source: 'claude',
    description: 'Native skill-call tracking with the Rig plugin.',
    action: 'Copy Claude Code setup',
  },
  {
    name: 'Codex',
    source: 'codex',
    description: 'Track explicit $skill mentions with a local hook.',
    action: 'Copy Codex setup',
    badge: 'Explicit tracking · Beta',
  },
  {
    name: 'OpenCode',
    source: 'opencode',
    description: 'Track native skill tool calls with the Rig plugin.',
    action: 'Copy OpenCode setup',
  },
];

const ProviderIcon = ({
  source,
  size = 18,
}: {
  source: string;
  size?: number;
}) => {
  if (source === 'claude') {
    return <Image src={claudeIcon} alt='' width={size} height={size} />;
  }

  if (source === 'opencode') {
    return (
      <>
        <Image
          src={openCodeLightIcon}
          alt=''
          width={size}
          height={size}
          className='dark:hidden'
        />
        <Image
          src={openCodeDarkIcon}
          alt=''
          width={size}
          height={size}
          className='hidden dark:block'
        />
      </>
    );
  }

  return <Image src={codexIcon} alt='' width={size} height={size} />;
};

const DownloadButton = ({
  downloadUrl,
  label = 'Download for macOS',
}: {
  downloadUrl: string;
  label?: string;
}) => (
  <a
    href={downloadUrl}
    target='_blank'
    rel='noreferrer noopener'
    className='rig-pressable inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#17181b] px-5 text-sm font-semibold text-white shadow-sm transition-[background-color,transform] duration-150 hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5267f8] focus-visible:ring-offset-2 dark:bg-white dark:text-[#121316] dark:hover:bg-neutral-100 dark:focus-visible:ring-offset-[#0d0e10]'
  >
    <Image
      src='/apple-white.webp'
      alt=''
      width={32}
      height={32}
      className='h-4 w-auto dark:invert'
    />
    {label}
  </a>
);

const ArrowIcon = () => (
  <svg aria-hidden='true' viewBox='0 0 20 20' className='size-4' fill='none'>
    <path
      d='M4 10h11m-4-4 4 4-4 4'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);

const CheckIcon = () => (
  <svg aria-hidden='true' viewBox='0 0 18 18' className='size-4' fill='none'>
    <path
      d='m4.25 9.25 3 3 6.5-7'
      stroke='currentColor'
      strokeWidth='1.6'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);

const SearchIcon = () => (
  <svg aria-hidden='true' viewBox='0 0 20 20' className='size-4' fill='none'>
    <circle
      cx='8.75'
      cy='8.75'
      r='5.25'
      stroke='currentColor'
      strokeWidth='1.4'
    />
    <path
      d='m12.5 12.5 4 4'
      stroke='currentColor'
      strokeWidth='1.4'
      strokeLinecap='round'
    />
  </svg>
);

const SkillRow = ({ skill }: { skill: (typeof skillRows)[number] }) => (
  <div
    className={`grid grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-black/[0.055] px-3 py-3.5 dark:border-white/[0.07] ${
      skill.selected
        ? 'bg-black/[0.035] dark:bg-white/[0.06]'
        : 'bg-transparent'
    }`}
  >
    <span
      className={`h-px w-4 ${skill.selected ? 'bg-[#5267f8]' : 'bg-black/20 dark:bg-white/20'}`}
    />
    <div className='min-w-0'>
      <div className='flex min-w-0 items-center gap-1.5'>
        <span className='truncate text-[11px] font-semibold text-[#202126] dark:text-white'>
          {skill.name}
        </span>
        {skill.update ? (
          <span className='shrink-0 rounded-md border border-[#5267f8]/25 bg-[#5267f8]/8 px-1 py-0.5 text-[8px] font-medium text-[#4055e7] dark:text-[#aab4ff]'>
            Update
          </span>
        ) : null}
      </div>
      <p className='mt-0.5 truncate text-[9px] text-[#777a82] dark:text-[#9a9da5]'>
        {skill.description}
      </p>
      <p className='mt-1 truncate text-[8px] text-[#92959c] dark:text-[#858891]'>
        <span className='inline-flex items-center gap-1.5'>
          <ProviderIcon source={skill.source} size={10} />
          {skill.provider} · {skill.meta}
        </span>
      </p>
    </div>
    <span className='text-[9px] tabular-nums text-[#888b92]'>0×</span>
  </div>
);

const ProductWindow = () => (
  <figure className='rig-product-frame mx-auto mt-14 w-full max-w-[1180px] overflow-hidden rounded-[18px] border border-black/[0.13] bg-white shadow-[0_1px_2px_rgba(0,0,0,.04),0_24px_70px_rgba(20,22,28,.13),0_70px_150px_rgba(20,22,28,.08)] dark:border-white/[0.12] dark:bg-[#141518]'>
    <div className='flex h-12 items-center gap-2 overflow-hidden border-b border-black/[0.08] px-3 dark:border-white/[0.08]'>
      <span className='inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-[#17181b] px-3 text-[10px] font-medium text-white dark:bg-white dark:text-[#151518]'>
        <span className='grid size-3 place-items-center'>◇</span>
        All skills
      </span>
      <span className='inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-black/[0.1] px-3 text-[10px] font-medium text-[#303137] dark:border-white/[0.12] dark:text-[#ececef]'>
        <span aria-hidden='true'>▱</span>
        acme-web
      </span>
      <span className='inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-dashed border-black/15 px-2.5 text-[10px] text-[#6f727a] dark:border-white/15 dark:text-[#a9abb2]'>
        <span className='text-sm leading-none'>+</span>
        Add project
      </span>
      <span className='ml-auto grid size-7 shrink-0 place-items-center rounded-full border border-black/[0.09] text-[11px] text-[#686b72] dark:border-white/[0.1]'>
        ⚙
      </span>
    </div>

    <div className='rig-product-layout grid min-h-[500px] grid-cols-[31%_69%]'>
      <div className='rig-product-sidebar border-r border-black/[0.08] bg-[#fbfbfa] dark:border-white/[0.08] dark:bg-[#111214]'>
        <div className='border-b border-black/[0.07] px-4 pb-3 pt-4 dark:border-white/[0.08]'>
          <h3 className='text-sm font-semibold tracking-[-0.02em] text-[#1f2024] dark:text-white'>
            Library
          </h3>
          <div className='mt-1 flex items-baseline gap-2 text-[9px] text-[#74777e] dark:text-[#9699a1]'>
            <span className='mr-auto'>22 discoverable skills</span>
            <span>
              Review{' '}
              <b className='font-medium text-[#34353a] dark:text-[#d8d8dc]'>
                2
              </b>
            </span>
            <span>
              Updates{' '}
              <b className='font-medium text-[#34353a] dark:text-[#d8d8dc]'>
                9
              </b>
            </span>
          </div>
          <div className='mt-3 flex h-8 items-center gap-2 rounded-lg border border-black/[0.1] bg-white px-2.5 text-[9px] text-[#898c93] dark:border-white/[0.1] dark:bg-[#18191c]'>
            <SearchIcon />
            Search names, instructions, paths…
          </div>
          <div className='mt-2.5 flex items-center gap-3 text-[9px]'>
            <span className='rounded-full bg-[#17181b] px-2.5 py-1 font-medium text-white dark:bg-white dark:text-[#16171a]'>
              All
            </span>
            <span className='text-[#73767d] dark:text-[#9699a1]'>
              Recent · 7d
            </span>
          </div>
        </div>
        <div>
          {skillRows.map(skill => (
            <SkillRow key={`${skill.name}-${skill.provider}`} skill={skill} />
          ))}
        </div>
        <div className='flex items-center justify-between border-t border-black/[0.08] px-4 py-2 text-[8px] text-[#85888f] dark:border-white/[0.08]'>
          <span>~43.9K tokens in discoverable instructions</span>
          <span>22 skills</span>
        </div>
      </div>

      <div className='rig-product-content bg-white dark:bg-[#141518]'>
        <div className='border-b border-black/[0.08] px-7 py-5 dark:border-white/[0.08]'>
          <div className='flex items-start gap-4'>
            <div className='min-w-0 flex-1'>
              <div className='flex items-center gap-2'>
                <h3 className='text-lg font-semibold tracking-[-0.025em] text-[#1c1d21] dark:text-white'>
                  accessibility
                </h3>
                <span className='inline-flex items-center gap-1.5 rounded-full bg-[#eef0ff] px-2 py-0.5 text-[9px] font-medium text-[#4558dd] dark:bg-[#5267f8]/20 dark:text-[#b9c1ff]'>
                  <ProviderIcon source='codex' size={10} />
                  Codex
                </span>
              </div>
              <p className='mt-1 max-w-2xl text-[11px] leading-5 text-[#696c73] dark:text-[#a6a8af]'>
                Audit and improve web accessibility following WCAG 2.2
                guidelines.
              </p>
              <p className='mt-2 truncate font-mono text-[9px] text-[#898c93] dark:text-[#858891]'>
                ~/.codex/skills/accessibility/SKILL.md · ~3.2K tokens
              </p>
            </div>
            <span className='shrink-0 rounded-lg border border-black/[0.1] px-3 py-1.5 text-[9px] font-medium text-[#34353a] dark:border-white/[0.12] dark:text-[#e8e8eb]'>
              Copy
            </span>
          </div>
          <div className='mt-4 flex items-center gap-1 text-[9px]'>
            <span className='px-3 py-1.5 text-[#73767d] dark:text-[#999ca3]'>
              Instructions
            </span>
            <span className='px-3 py-1.5 text-[#73767d] dark:text-[#999ca3]'>
              Source
            </span>
            <span className='rounded-lg bg-[#17181b] px-3 py-1.5 font-medium text-white dark:bg-white dark:text-[#16171a]'>
              Activity
            </span>
            <span className='px-3 py-1.5 text-[#73767d] dark:text-[#999ca3]'>
              History
            </span>
          </div>
        </div>
        <div className='mx-auto max-w-3xl px-8 py-7 text-left text-[#27282d] dark:text-[#e7e7ea]'>
          <div className='flex items-start justify-between gap-4'>
            <div>
              <p className='text-[10px] font-medium uppercase tracking-[0.08em] text-[#5267f8] dark:text-[#9eabff]'>
                Last 7 days
              </p>
              <h4 className='mt-2 text-2xl font-semibold tracking-[-0.03em]'>
                12 uses
              </h4>
            </div>
            <span className='rounded-full bg-[#edf8f0] px-2.5 py-1 text-[9px] font-medium text-[#34704a] dark:bg-[#34704a]/15 dark:text-[#86c79c]'>
              Tracking connected
            </span>
          </div>
          <svg
            viewBox='0 0 600 130'
            className='mt-5 h-32 w-full'
            role='img'
            aria-label='Usage activity over seven days'
          >
            <path
              d='M2 112 C62 109, 88 82, 142 91 S236 105, 288 67 S378 39, 428 70 S520 83, 598 20'
              fill='none'
              stroke='#5267f8'
              strokeWidth='3'
              strokeLinecap='round'
            />
            {[112, 82, 52, 22].map(y => (
              <line
                key={y}
                x1='0'
                x2='600'
                y1={y}
                y2={y}
                stroke='currentColor'
                opacity='.07'
              />
            ))}
          </svg>
          <div className='mt-3 overflow-hidden rounded-xl border border-black/[0.08] dark:border-white/[0.09]'>
            {[
              ['Codex', 'Explicit mention', 'Today, 14:32', 'codex'],
              ['Claude Code', 'Skill call', 'Yesterday, 16:08', 'claude'],
              ['OpenCode', 'Skill call', 'Aug 1, 09:41', 'opencode'],
            ].map(([provider, event, time, source]) => (
              <div
                key={`${provider}-${time}`}
                className='flex items-center gap-2.5 border-b border-black/[0.06] px-3 py-2.5 text-[10px] last:border-b-0 dark:border-white/[0.07]'
              >
                <ProviderIcon source={source} size={13} />
                <span className='font-medium'>{provider}</span>
                <span className='text-[#85888f]'>{event}</span>
                <span className='ml-auto text-[#85888f]'>{time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    <figcaption className='sr-only'>
      Rig Library showing provider-aware skills, update status, and local usage
      activity for the selected skill.
    </figcaption>
  </figure>
);

const SectionHeading = ({
  eyebrow,
  title,
  body,
  inverse = false,
}: {
  eyebrow: string;
  title: string;
  body: string;
  inverse?: boolean;
}) => (
  <div className='max-w-xl'>
    <p
      className={`text-xs font-semibold tracking-[0.08em] ${
        inverse ? 'text-[#9ca8ff]' : 'text-[#5267f8] dark:text-[#9ca8ff]'
      }`}
    >
      {eyebrow}
    </p>
    <h2
      className={`mt-4 text-[clamp(2.25rem,4.6vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.045em] ${
        inverse ? 'text-white' : 'text-[#15161a] dark:text-white'
      }`}
    >
      {title}
    </h2>
    <p
      className={`mt-5 text-base leading-7 ${
        inverse ? 'text-white/60' : 'text-[#666970] dark:text-[#a5a8af]'
      }`}
    >
      {body}
    </p>
  </div>
);

const LibraryVisual = () => (
  <div className='overflow-hidden rounded-2xl border border-black/[0.1] bg-white shadow-[0_18px_50px_rgba(22,24,30,.08)] dark:border-white/[0.1] dark:bg-[#151619]'>
    <div className='flex items-center gap-2 border-b border-black/[0.07] px-4 py-3 dark:border-white/[0.08]'>
      <div className='flex h-9 flex-1 items-center gap-2 rounded-xl bg-[#f3f3f0] px-3 text-xs text-[#777a82] dark:bg-[#202125] dark:text-[#999ca4]'>
        <SearchIcon />
        Search “accessibility”
      </div>
      <span className='rounded-lg border border-black/[0.09] px-2.5 py-2 text-[10px] text-[#696c73] dark:border-white/[0.1] dark:text-[#a4a7ae]'>
        All projects
      </span>
    </div>
    <div className='grid min-h-[360px] sm:grid-cols-[48%_52%]'>
      <div className='border-r border-black/[0.07] dark:border-white/[0.08]'>
        {skillRows.slice(0, 3).map(skill => (
          <SkillRow key={`${skill.name}-feature`} skill={skill} />
        ))}
      </div>
      <div className='hidden p-6 sm:block'>
        <span className='rounded-full bg-[#eef0ff] px-2 py-1 text-[9px] font-medium text-[#4558dd] dark:bg-[#5267f8]/20 dark:text-[#bbc3ff]'>
          Codex
        </span>
        <h3 className='mt-4 text-xl font-semibold tracking-[-0.03em]'>
          accessibility
        </h3>
        <p className='mt-2 text-xs leading-5 text-[#74777e] dark:text-[#9fa2aa]'>
          Complete instructions, source details, and the exact local file
          path—together.
        </p>
        <div className='mt-5 space-y-2 text-[10px]'>
          {['Instructions', 'Source', 'Activity', 'History'].map(
            (item, index) => (
              <div
                key={item}
                className='flex items-center justify-between border-b border-black/[0.06] py-2.5 dark:border-white/[0.07]'
              >
                <span>{item}</span>
                <span
                  className={index === 0 ? 'text-[#5267f8]' : 'text-[#9a9da4]'}
                >
                  {index === 0 ? 'Open' : '→'}
                </span>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  </div>
);

const HealthVisual = () => (
  <div className='rounded-2xl border border-black/[0.1] bg-[#f3f3f0] p-3 dark:border-white/[0.1] dark:bg-[#17181b]'>
    <div className='rounded-xl border border-black/[0.08] bg-white p-4 dark:border-white/[0.08] dark:bg-[#111214]'>
      <div className='flex items-start justify-between gap-4'>
        <div>
          <p className='text-sm font-semibold'>Available updates</p>
          <p className='mt-1 text-[10px] text-[#7d8087] dark:text-[#999ca3]'>
            Checked against each tracked remote source.
          </p>
        </div>
        <span className='rounded-full bg-[#fff4de] px-2 py-1 text-[9px] font-medium text-[#9d5f12] dark:bg-[#b86a12]/15 dark:text-[#e4a95e]'>
          9 updates
        </span>
      </div>
      <div className='mt-4 space-y-2'>
        {[
          [
            'effect-ts',
            'Update available',
            'Local changes preserved until you approve',
          ],
          [
            'vercel-react-best-practices',
            'Update available',
            'New version found in the tracked repository',
          ],
        ].map(([name, status, description]) => (
          <div
            key={name}
            className='flex items-center gap-3 rounded-xl border border-black/[0.07] p-3 dark:border-white/[0.08]'
          >
            <span className='grid size-8 shrink-0 place-items-center rounded-lg bg-[#fff4de] text-[#a46312] dark:bg-[#b86a12]/15 dark:text-[#e4a95e]'>
              ↑
            </span>
            <div className='min-w-0 flex-1'>
              <div className='flex flex-wrap items-center gap-2'>
                <p className='truncate text-xs font-semibold'>{name}</p>
                <span className='text-[9px] font-medium text-[#9d5f12] dark:text-[#e4a95e]'>
                  {status}
                </span>
              </div>
              <p className='mt-1 truncate text-[10px] text-[#85888f]'>
                {description}
              </p>
            </div>
            <span className='text-[10px] font-medium text-[#676a71] dark:text-[#a5a8af]'>
              Preview
            </span>
          </div>
        ))}
      </div>
    </div>
    <div className='mt-3 grid gap-3 sm:grid-cols-2'>
      <div className='rounded-xl border border-black/[0.08] bg-white p-4 dark:border-white/[0.08] dark:bg-[#111214]'>
        <p className='text-[10px] text-[#85888f]'>Bulk maintenance</p>
        <p className='mt-2 text-sm font-semibold'>Update selected skills</p>
        <div className='mt-4 flex items-center justify-between rounded-lg bg-[#f3f3f0] px-3 py-2 text-[10px] dark:bg-[#1c1d21]'>
          <span className='text-[#777a82]'>3 skills selected</span>
          <span className='font-medium'>Update all</span>
        </div>
      </div>
      <div className='rounded-xl border border-black/[0.08] bg-white p-4 dark:border-white/[0.08] dark:bg-[#111214]'>
        <p className='text-[10px] text-[#85888f]'>Before anything changes</p>
        <p className='mt-2 text-sm font-semibold'>Preview the source</p>
        <div className='mt-4 flex items-center gap-2'>
          <span className='rounded-full bg-[#17181b] px-2.5 py-1.5 text-[9px] text-white dark:bg-white dark:text-[#17181b]'>
            Current
          </span>
          <span className='rounded-full border border-black/[0.08] px-2.5 py-1.5 text-[9px] text-[#777a82] line-through dark:border-white/[0.1]'>
            Remote
          </span>
        </div>
      </div>
    </div>
  </div>
);

const HistoryVisual = () => (
  <div className='grid overflow-hidden rounded-2xl border border-white/[0.12] bg-[#17181b] shadow-[0_26px_90px_rgba(0,0,0,.28)] md:grid-cols-[34%_66%]'>
    <div className='border-b border-white/[0.09] p-5 md:border-b-0 md:border-r'>
      <div className='flex items-center justify-between'>
        <p className='text-sm font-semibold text-white'>Version history</p>
        <span className='rounded-md border border-white/10 px-2 py-1 text-[9px] text-white/55'>
          3 saved
        </span>
      </div>
      <div className='mt-5 space-y-1'>
        {[
          ['Current', 'After update', true],
          ['Today, 14:32', 'Before update', false],
          ['Jul 28, 09:18', 'Restored version', false],
        ].map(([time, event, current]) => (
          <div
            key={time as string}
            className={`rounded-xl p-3 ${current ? 'bg-white/[0.08]' : ''}`}
          >
            <div className='flex items-center gap-2'>
              <span
                className={`size-1.5 rounded-full ${current ? 'bg-[#8392ff]' : 'bg-white/25'}`}
              />
              <p className='text-[11px] font-medium text-white'>{time}</p>
            </div>
            <p className='ml-3.5 mt-1 text-[9px] text-white/45'>{event}</p>
          </div>
        ))}
      </div>
      <span className='mt-6 flex h-9 w-full items-center justify-center rounded-lg border border-white/12 text-[10px] font-medium text-white/80'>
        Restore this version
      </span>
    </div>
    <div className='min-w-0 bg-[#202126] font-mono text-[10px] leading-5'>
      <div className='flex h-12 items-center justify-between border-b border-white/[0.08] px-4 text-white/55'>
        <span>SKILL.md</span>
        <span>Current ↔ Previous</span>
      </div>
      <div className='overflow-x-auto py-3 text-white/65'>
        <div className='min-w-[520px]'>
          <p className='bg-[#2f2430] px-4 text-[#f1a5af]'>
            <span className='mr-4 text-white/25'>12</span>- Run every audit
            automatically.
          </p>
          <p className='bg-[#203029] px-4 text-[#9ee0b5]'>
            <span className='mr-4 text-white/25'>12</span>+ Ask before running a
            full audit.
          </p>
          <p className='px-4'>
            <span className='mr-4 text-white/25'>13</span>&nbsp;
          </p>
          <p className='px-4'>
            <span className='mr-4 text-white/25'>14</span>## Review order
          </p>
          <p className='px-4'>
            <span className='mr-4 text-white/25'>15</span>1. Semantic structure
          </p>
          <p className='bg-[#203029] px-4 text-[#9ee0b5]'>
            <span className='mr-4 text-white/25'>16</span>+ 2. Keyboard and
            focus flow
          </p>
          <p className='bg-[#203029] px-4 text-[#9ee0b5]'>
            <span className='mr-4 text-white/25'>17</span>+ 3. Contrast and
            motion
          </p>
          <p className='px-4'>
            <span className='mr-4 text-white/25'>18</span>&nbsp;
          </p>
          <p className='px-4'>
            <span className='mr-4 text-white/25'>19</span>Keep findings concrete
            and actionable.
          </p>
        </div>
      </div>
    </div>
  </div>
);

const ActivityShareVisual = () => (
  <div className='grid gap-4 sm:grid-cols-2'>
    <div className='rounded-2xl border border-black/[0.1] bg-white p-5 dark:border-white/[0.1] dark:bg-[#151619]'>
      <div className='flex items-start justify-between'>
        <div>
          <p className='text-xs font-semibold'>Activity</p>
          <p className='mt-1 text-[10px] text-[#85888f]'>
            Stored locally · Last 7 days
          </p>
        </div>
        <span className='rounded-full bg-[#edf8f0] px-2 py-1 text-[9px] font-medium text-[#34704a] dark:bg-[#34704a]/15 dark:text-[#86c79c]'>
          Connected
        </span>
      </div>
      <svg
        viewBox='0 0 300 90'
        className='mt-6 h-24 w-full'
        role='img'
        aria-label='A seven day skill usage trend'
      >
        <path
          d='M2 78 C35 75, 42 48, 72 54 S115 70, 140 42 S185 24, 210 44 S258 58, 298 12'
          fill='none'
          stroke='#5267f8'
          strokeWidth='2.5'
          strokeLinecap='round'
        />
        <path
          d='M2 78 C35 75, 42 48, 72 54 S115 70, 140 42 S185 24, 210 44 S258 58, 298 12 L298 90 L2 90 Z'
          fill='url(#usage-fill)'
          opacity='.18'
        />
        <defs>
          <linearGradient id='usage-fill' x1='0' y1='0' x2='0' y2='1'>
            <stop stopColor='#5267f8' />
            <stop offset='1' stopColor='#5267f8' stopOpacity='0' />
          </linearGradient>
        </defs>
      </svg>
      <div className='mt-3 flex items-center justify-between border-t border-black/[0.06] pt-3 text-[10px] dark:border-white/[0.08]'>
        <span className='font-medium'>accessibility</span>
        <span className='tabular-nums text-[#74777e]'>12 uses</span>
      </div>
    </div>
    <div className='rounded-2xl border border-black/[0.1] bg-white p-5 dark:border-white/[0.1] dark:bg-[#151619]'>
      <div>
        <p className='text-xs font-semibold'>Share a skill</p>
        <p className='mt-1 text-[10px] text-[#85888f]'>
          Two clear ways to install.
        </p>
      </div>
      <div className='mt-5 space-y-3'>
        <div className='rounded-xl border border-black/[0.08] p-3 dark:border-white/[0.09]'>
          <p className='text-[11px] font-semibold'>Install with npx</p>
          <p className='mt-1 text-[9px] leading-4 text-[#7d8087]'>
            For skills with a tracked source.
          </p>
          <span className='mt-3 inline-flex rounded-lg bg-[#17181b] px-3 py-2 font-mono text-[9px] text-white dark:bg-white dark:text-[#17181b]'>
            Copy npx command
          </span>
        </div>
        <div className='rounded-xl border border-black/[0.08] p-3 dark:border-white/[0.09]'>
          <p className='text-[11px] font-semibold'>Install with AI</p>
          <p className='mt-1 text-[9px] leading-4 text-[#7d8087]'>
            Paste one prompt into your coding agent.
          </p>
          <span className='mt-3 inline-flex rounded-lg border border-black/[0.1] px-3 py-2 text-[9px] font-medium dark:border-white/[0.12]'>
            Copy install prompt
          </span>
        </div>
      </div>
    </div>
  </div>
);

const HomePage = async () => {
  const { downloadUrl, releaseVersion } = await getReleaseInfo();

  return (
    <main
      id='nextra-skip-nav'
      className='rig-home overflow-hidden bg-[#f8f8f6] text-[#15161a] dark:bg-[#0d0e10] dark:text-[#f4f4f5]'
    >
      <section className='rig-grid-background border-b border-black/[0.07] px-5 pb-20 pt-[clamp(5rem,9vw,8rem)] dark:border-white/[0.08] sm:px-8 lg:px-12'>
        <div className='mx-auto max-w-[1280px] text-center'>
          <p className='text-xs font-semibold tracking-[0.08em] text-[#5267f8] dark:text-[#9ca8ff]'>
            Usage tracking for agent skills
          </p>
          <h1 className='mx-auto mt-6 max-w-5xl text-[clamp(3.25rem,7.2vw,5.75rem)] font-semibold leading-[0.96] tracking-[-0.055em] text-[#121316] dark:text-white'>
            Know which skills
            <br />
            your agents actually use.
          </h1>
          <p className='mx-auto mt-7 max-w-3xl text-[clamp(1.0625rem,1.5vw,1.25rem)] leading-8 text-[#666970] dark:text-[#a5a8af]'>
            Connect Claude Code, Codex, and OpenCode to one local skill
            workspace. Track usage, share what works, update remote skills, and
            restore a version when you need it.
          </p>
          <div className='mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center'>
            <DownloadButton downloadUrl={downloadUrl} />
            <a
              href='#product'
              className='rig-pressable inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-black/[0.12] bg-white/70 px-5 text-sm font-semibold text-[#292a2f] transition-[background-color,transform] duration-150 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5267f8] focus-visible:ring-offset-2 dark:border-white/[0.13] dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.1] dark:focus-visible:ring-offset-[#0d0e10]'
            >
              See usage tracking <ArrowIcon />
            </a>
          </div>
          <p className='mt-4 text-xs text-[#85888f] dark:text-[#8d9098]'>
            Apple silicon · Version {releaseVersion} · Open source · No account
            required
          </p>
          <ProductWindow />
        </div>
      </section>

      <section
        aria-label='Supported coding agents'
        className='border-b border-black/[0.07] bg-white/50 px-5 dark:border-white/[0.08] dark:bg-white/[0.02] sm:px-8 lg:px-12'
      >
        <div className='mx-auto flex max-w-[1180px] flex-col items-center justify-between gap-5 py-7 md:flex-row'>
          <div>
            <p className='text-center text-sm font-medium md:text-left'>
              One view across the agents you actually use
            </p>
            <p className='mt-1 text-center text-xs text-[#85888f] md:text-left'>
              Connect one provider or all three. Your files stay in place.
            </p>
          </div>
          <div className='flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm font-medium text-[#5e6168] dark:text-[#b5b7bd]'>
            {[
              ['Claude Code', 'claude'],
              ['Codex', 'codex'],
              ['OpenCode', 'opencode'],
            ].map(([provider, source]) => (
              <span key={provider} className='flex items-center gap-2'>
                <span className='grid size-8 place-items-center rounded-lg border border-black/[0.09] bg-white dark:border-white/[0.1] dark:bg-[#17181b]'>
                  <ProviderIcon source={source} size={17} />
                </span>
                {provider}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section
        id='capabilities'
        className='scroll-mt-20 px-5 py-[clamp(7.5rem,10vw,10rem)] sm:px-8 lg:px-12'
      >
        <div className='mx-auto max-w-[1180px]'>
          <header className='grid lg:grid-cols-12 lg:gap-x-8'>
            <div className='max-w-[800px] lg:col-span-9 lg:col-start-3'>
              <p className='text-sm font-semibold leading-5 text-[#5267f8] dark:text-[#9ca8ff]'>
                What Rig helps you do
              </p>
              <h2 className='mt-4 text-[clamp(2.65rem,5.4vw,4.75rem)] font-semibold leading-[0.98] tracking-[-0.05em] text-[#15161a] dark:text-white'>
                <span className='block'>See what’s installed.</span>
                <span className='block'>Know what’s used.</span>
                <span className='block'>Keep it current.</span>
              </h2>
              <div className='mt-7 flex flex-wrap gap-2'>
                {[
                  ['Claude Code', 'claude'],
                  ['Codex', 'codex'],
                  ['OpenCode', 'opencode'],
                ].map(([provider, source]) => (
                  <span
                    key={provider}
                    className='inline-flex items-center gap-2 rounded-full border border-black/[0.09] bg-white px-3 py-1.5 text-xs font-medium text-[#5f6269] dark:border-white/[0.1] dark:bg-[#151619] dark:text-[#b0b2b8]'
                  >
                    <ProviderIcon source={source} size={13} />
                    {provider}
                  </span>
                ))}
                <span className='inline-flex items-center rounded-full border border-black/[0.09] bg-white px-3 py-1.5 font-mono text-[11px] font-medium text-[#5f6269] dark:border-white/[0.1] dark:bg-[#151619] dark:text-[#b0b2b8]'>
                  Project SKILL.md
                </span>
              </div>
            </div>
          </header>

          <ol className='mt-14 border-t border-black/[0.1] dark:border-white/[0.12] lg:mt-20'>
            {[
              [
                'Usage tracking',
                'See which skill ran, when it ran, and which agent called it.',
              ],
              [
                'Claude, Codex & OpenCode',
                'Browse agent and project skills without losing track of their source.',
              ],
              [
                'Skill sharing',
                'Copy an npx command or install prompt—no zip files.',
              ],
              [
                'Skill updates',
                'Find newer remote versions and update only when you choose.',
              ],
              [
                'Version history',
                'Compare Rig snapshots and restore the version that worked.',
              ],
            ].map(([title, body], index) => (
              <li
                key={title}
                className='grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-4 gap-y-1.5 border-b border-black/[0.1] py-7 dark:border-white/[0.12] sm:grid-cols-[4.75rem_minmax(0,1fr)] lg:grid-cols-12 lg:items-center lg:gap-x-8 lg:py-9'
              >
                <span className='col-start-1 text-[2rem] font-medium leading-none tracking-[-0.06em] tabular-nums text-[#5267f8] dark:text-[#9ca8ff] sm:text-[2.5rem] lg:col-span-2 lg:text-[3rem]'>
                  0{index + 1}
                </span>
                <h3 className='col-start-2 text-xl font-semibold leading-7 tracking-[-0.025em] lg:col-span-4 lg:col-start-3 lg:text-[1.375rem]'>
                  {title}
                </h3>
                <p className='col-start-2 max-w-[54ch] text-[15px] leading-6 text-[#5f6269] dark:text-[#b0b2b8] lg:col-span-6 lg:col-start-7 lg:text-base lg:leading-7'>
                  {body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        id='product'
        className='scroll-mt-20 border-y border-black/[0.07] bg-white px-5 py-[clamp(7.5rem,10vw,10rem)] dark:border-white/[0.08] dark:bg-[#111214] sm:px-8 lg:px-12'
      >
        <div className='mx-auto grid max-w-[1180px] items-center gap-14 lg:grid-cols-12 lg:gap-8'>
          <div className='lg:col-span-5'>
            <SectionHeading
              eyebrow='01 · Multiple providers'
              title='Claude, Codex, OpenCode. One skill view.'
              body='Rig reads the provider folders already on your Mac and keeps each copy identifiable by icon, source, and exact path. Add a project only when you want its local skills in view.'
            />
            <ul className='mt-8 space-y-3 text-sm text-[#5f6269] dark:text-[#b0b2b8]'>
              {[
                'Provider icons on every skill',
                'Global and project folders',
                'Full instructions and exact file paths',
              ].map(point => (
                <li key={point} className='flex items-center gap-3'>
                  <span className='text-[#5267f8]'>
                    <CheckIcon />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <div className='lg:col-span-7'>
            <LibraryVisual />
          </div>
        </div>
      </section>

      <section className='px-5 py-[clamp(7.5rem,10vw,10rem)] sm:px-8 lg:px-12'>
        <div className='mx-auto grid max-w-[1180px] items-center gap-14 lg:grid-cols-12 lg:gap-8'>
          <div className='lg:order-2 lg:col-span-5 lg:pl-8'>
            <SectionHeading
              eyebrow='02 · Skill updates'
              title='See what changed before you update.'
              body='Rig checks skills with a tracked remote source, shows which ones have newer versions, and lets you update one skill or a selection when you are ready.'
            />
            <p className='mt-7 border-l-2 border-[#5267f8]/35 pl-4 text-sm leading-6 text-[#73767d] dark:text-[#9fa2a9]'>
              An update is never installed just because Rig found it. You keep
              the decision—and Rig saves a recovery version around the change.
            </p>
          </div>
          <div className='lg:order-1 lg:col-span-7'>
            <HealthVisual />
          </div>
        </div>
      </section>

      <section className='bg-[#0d0e10] px-5 py-[clamp(7.5rem,10vw,10rem)] text-white sm:px-8 lg:px-12'>
        <div className='mx-auto max-w-[1180px]'>
          <div className='grid items-end gap-8 lg:grid-cols-[1fr_0.75fr]'>
            <SectionHeading
              inverse
              eyebrow='03 · Version history'
              title='Every Rig-made change has a way back.'
              body='When Rig updates or restores a skill, it saves recoverable versions before and after the change. Compare the markdown diff, then restore the snapshot you trust.'
            />
            <p className='text-sm leading-6 text-white/50 lg:pb-1'>
              History covers updates and restores performed in Rig. External
              file edits are not recorded automatically.
            </p>
          </div>
          <div className='mt-14'>
            <HistoryVisual />
          </div>
        </div>
      </section>

      <section className='border-b border-black/[0.07] bg-white px-5 py-[clamp(7.5rem,10vw,10rem)] dark:border-white/[0.08] dark:bg-[#111214] sm:px-8 lg:px-12'>
        <div className='mx-auto grid max-w-[1180px] items-center gap-14 lg:grid-cols-12 lg:gap-8'>
          <div className='lg:col-span-5'>
            <SectionHeading
              eyebrow='04 · Usage tracking and sharing'
              title='Know what runs. Share what works.'
              body='Connected agents append local skill activity that Rig shows by provider and time. When a skill proves useful, share it as an npx command or an AI-ready install prompt—not a zip file.'
            />
            <p className='mt-7 text-sm leading-6 text-[#73767d] dark:text-[#9fa2a9]'>
              Install prompts include the current{' '}
              <code className='font-mono text-[0.9em]'>SKILL.md</code> content.
              Share them only with people and services you trust.
            </p>
          </div>
          <div className='lg:col-span-7'>
            <ActivityShareVisual />
          </div>
        </div>
      </section>

      <section
        id='privacy'
        className='scroll-mt-20 px-5 py-[clamp(7.5rem,10vw,10rem)] sm:px-8 lg:px-12'
      >
        <div className='mx-auto max-w-[1180px]'>
          <div className='grid gap-12 lg:grid-cols-2 lg:gap-20'>
            <SectionHeading
              eyebrow='Local by default'
              title='Your skill files stay where your agents use them.'
              body='Rig reads and manages the SKILL.md files already on your Mac. Adding a project gives Rig another folder to scan—it does not copy your skills into a hosted workspace.'
            />
            <div className='rounded-2xl border border-black/[0.1] bg-white p-5 dark:border-white/[0.1] dark:bg-[#151619]'>
              <div className='space-y-3 font-mono text-[11px] text-[#6f7279] dark:text-[#a4a7ae]'>
                {[
                  '~/.claude/skills',
                  '~/.agents/skills',
                  'project/.agents/skills',
                ].map(path => (
                  <div key={path} className='flex items-center gap-3'>
                    <span className='size-2 rounded-full bg-[#5267f8]' />
                    <span>{path}</span>
                    <span className='ml-auto text-[#a5a8ae]'>──┐</span>
                  </div>
                ))}
              </div>
              <div className='my-5 flex items-center gap-3'>
                <span className='h-px flex-1 bg-black/[0.08] dark:bg-white/[0.1]' />
                <span className='grid size-12 place-items-center overflow-hidden rounded-xl shadow-sm'>
                  <Image src={appIcon} alt='Rig' width={48} height={48} />
                </span>
                <span className='h-px flex-1 bg-black/[0.08] dark:bg-white/[0.1]' />
              </div>
              <div className='grid grid-cols-3 gap-2 text-center text-[10px]'>
                {['Activity', 'Updates', 'History'].map(item => (
                  <span
                    key={item}
                    className='rounded-lg bg-[#f3f3f0] px-2 py-2.5 font-medium dark:bg-[#202125]'
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className='mt-14 grid gap-px overflow-hidden rounded-2xl border border-black/[0.1] bg-black/[0.08] dark:border-white/[0.1] dark:bg-white/[0.1] md:grid-cols-3'>
            {[
              [
                'Files stay on disk',
                'Rig reads known local roots and does not move files when you add a project.',
              ],
              [
                'Usage stays local',
                'Connected agents write skill names and timestamps to a local usage log—not prompt text.',
              ],
              [
                'Sharing is deliberate',
                'Skill content is exposed only when you choose to copy and send an install prompt.',
              ],
            ].map(([title, body]) => (
              <div key={title} className='bg-white p-6 dark:bg-[#151619]'>
                <h3 className='text-sm font-semibold'>{title}</h3>
                <p className='mt-3 text-sm leading-6 text-[#73767d] dark:text-[#9fa2a9]'>
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id='integrations'
        className='scroll-mt-20 border-y border-black/[0.07] bg-white px-5 py-[clamp(7.5rem,10vw,10rem)] dark:border-white/[0.08] dark:bg-[#111214] sm:px-8 lg:px-12'
      >
        <div className='mx-auto max-w-[1180px]'>
          <div className='mx-auto max-w-2xl text-center'>
            <SectionHeading
              eyebrow='05 · Agent connections'
              title='Install tracking without leaving the agent.'
              body='Rig gives you one setup prompt per provider. Paste it into the matching agent, review the requested changes, then verify the first call in Activity.'
            />
          </div>
          <div className='mt-12 grid gap-4 lg:grid-cols-3'>
            {providerRows.map(provider => (
              <article
                key={provider.name}
                className='flex min-h-64 flex-col rounded-2xl border border-black/[0.1] bg-[#f8f8f6] p-6 dark:border-white/[0.1] dark:bg-[#17181b]'
              >
                <div className='flex items-start justify-between gap-3'>
                  <span className='grid size-11 place-items-center rounded-xl border border-black/[0.09] bg-white shadow-sm dark:border-white/[0.1] dark:bg-[#111214]'>
                    <ProviderIcon source={provider.source} size={22} />
                  </span>
                  {provider.badge ? (
                    <span className='rounded-full bg-[#eef0ff] px-2 py-1 text-[9px] font-medium text-[#4558dd] dark:bg-[#5267f8]/20 dark:text-[#bdc5ff]'>
                      {provider.badge}
                    </span>
                  ) : null}
                </div>
                <h3 className='mt-6 text-lg font-semibold tracking-[-0.025em]'>
                  {provider.name}
                </h3>
                <p className='mt-3 text-sm leading-6 text-[#73767d] dark:text-[#9fa2a9]'>
                  {provider.description}
                </p>
                <span className='mt-auto pt-7 text-xs font-semibold text-[#3f54e3] dark:text-[#a9b3ff]'>
                  {provider.action} →
                </span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className='px-5 py-[clamp(7.5rem,10vw,10rem)] sm:px-8 lg:px-12'>
        <div className='mx-auto max-w-[900px]'>
          <div className='text-center'>
            <p className='text-xs font-semibold tracking-[0.08em] text-[#5267f8] dark:text-[#9ca8ff]'>
              Questions, answered
            </p>
            <h2 className='mt-4 text-[clamp(2.25rem,4.6vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.045em]'>
              Know what Rig changes.
            </h2>
          </div>
          <div className='mt-12 divide-y divide-black/[0.08] border-y border-black/[0.08] dark:divide-white/[0.1] dark:border-white/[0.1]'>
            {[
              [
                'Does Rig copy my skills into its own library?',
                'No. Rig reads skills from their existing folders. Adding a project gives Rig another folder to scan; it does not duplicate the files.',
              ],
              [
                'Do I need to connect every supported agent?',
                'No. Connect only the agents you use. Discovery and usage tracking are separate, so you can inspect skills without installing a tracking integration.',
              ],
              [
                'What does Codex tracking support?',
                'The Codex integration is a beta that records explicit $skill-name mentions. It cannot reliably detect implicit skill activation yet.',
              ],
              [
                'What does version history include?',
                'Rig records recovery versions for updates and restores performed inside Rig. Changes made directly in another editor are not silently tracked.',
              ],
            ].map(([question, answer]) => (
              <details key={question} className='group py-1'>
                <summary className='flex min-h-16 cursor-pointer list-none items-center justify-between gap-6 py-4 text-left text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5267f8]'>
                  {question}
                  <span className='text-xl font-light text-[#777a82] transition-transform duration-150 group-open:rotate-45'>
                    +
                  </span>
                </summary>
                <p className='max-w-3xl pb-6 pr-10 text-sm leading-7 text-[#73767d] dark:text-[#9fa2a9]'>
                  {answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className='px-5 pb-20 sm:px-8 lg:px-12'>
        <div className='rig-grid-background mx-auto max-w-[1180px] overflow-hidden rounded-[24px] border border-black/[0.1] bg-white px-6 py-16 text-center shadow-[0_24px_80px_rgba(20,22,28,.08)] dark:border-white/[0.1] dark:bg-[#151619] sm:px-10 sm:py-20'>
          <p className='text-xs font-semibold tracking-[0.08em] text-[#5267f8] dark:text-[#9ca8ff]'>
            Ready when you are
          </p>
          <h2 className='mx-auto mt-5 max-w-3xl text-[clamp(2.5rem,5vw,4.25rem)] font-semibold leading-[1] tracking-[-0.05em]'>
            Make every skill earn its context.
          </h2>
          <p className='mx-auto mt-6 max-w-xl text-base leading-7 text-[#73767d] dark:text-[#9fa2a9]'>
            Track what your agents use, share the skills that work, and update
            the library without losing a trusted version.
          </p>
          <div className='mt-8 flex flex-col justify-center gap-3 sm:flex-row'>
            <DownloadButton
              downloadUrl={downloadUrl}
              label='Download Rig for macOS'
            />
            <a
              href='/docs/usage-tracking'
              className='rig-pressable inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-black/[0.12] bg-white px-5 text-sm font-semibold transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5267f8] dark:border-white/[0.13] dark:bg-white/[0.06]'
            >
              Set up usage tracking <ArrowIcon />
            </a>
          </div>
          <p className='mt-4 text-xs text-[#85888f]'>
            Free to download · Apple silicon
          </p>
        </div>
      </section>
    </main>
  );
};

export default HomePage;

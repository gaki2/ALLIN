import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Switch,
  toast,
} from '@allin/ui';
import {
  Bot,
  Check,
  Clipboard,
  Folder,
  FolderSearch,
  PlugZap,
  Settings2,
} from 'lucide-react';
import { useState } from 'react';
import {
  SKILL_SOURCES,
  type SkillSourceId,
} from '@/features/skills/skillSources';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hiddenSkillSourceIds: ReadonlySet<SkillSourceId>;
  onSkillSourceVisibilityChange: (
    sourceId: SkillSourceId,
    isVisible: boolean,
  ) => boolean;
}

type AgentId = 'claude-code' | 'codex' | 'opencode';
type SettingsSection = 'agents' | 'sources';

const agents: Array<{
  id: AgentId;
  name: string;
  description: string;
  buttonLabel: string;
  prompt: string;
}> = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    description:
      'Adds the Rig marketplace and installs its Claude Code plugin. Rig can then show Claude Code skill usage in Activity.',
    buttonLabel: 'Copy Claude Code setup',
    prompt: `Set up Rig skill usage tracking for Claude Code on this Mac.

1. Run /plugin marketplace add builder-mafia/rig
2. Run /plugin install rig-claude-code@rig
3. Verify the plugin appears in /plugin list.

Preserve my existing Claude Code settings. If anything fails, explain the exact error and stop before making unrelated changes.`,
  },
  {
    id: 'codex',
    name: 'Codex',
    description:
      'Uses the shared .agents skill folders so Codex and Rig discover the same skills. This does not enable usage tracking.',
    buttonLabel: 'Copy Codex setup',
    prompt: `Set up my skills so Codex and Rig can use the same library.

1. Inspect my existing personal and project skills without deleting or moving anything.
2. Use ~/.agents/skills for personal skills and .agents/skills for project skills, following the official Codex Agent Skills locations.
3. If skills exist only in another location, propose a safe copy or symlink plan and ask before changing files.
4. Confirm each skill has a SKILL.md with valid name and description frontmatter.

Do not use ~/.codex/skills; that is not the documented Codex skills location.`,
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    description:
      'Adds rig-opencode to your existing configuration. Rig can then show OpenCode skill usage in Activity.',
    buttonLabel: 'Copy OpenCode setup',
    prompt: `Set up Rig skill usage tracking for OpenCode on this Mac.

1. Inspect ~/.config/opencode/opencode.json and opencode.jsonc if present.
2. Add "rig-opencode" to the existing plugin array without overwriting any other settings or plugins.
3. If the config is JSONC, preserve its comments and formatting.
4. Verify the resulting configuration is valid and report the exact file changed.

Do not replace the full configuration file.`,
  },
];

const SettingsNavigation = ({
  section,
  onSectionChange,
  isMobile = false,
}: {
  section: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  isMobile?: boolean;
}) => (
  <nav
    className={cn(
      isMobile ? 'flex gap-1 border-b p-2 sm:hidden' : 'mt-2 space-y-1',
    )}
    aria-label='Settings sections'
  >
    <SettingsNavigationButton
      icon={<PlugZap size={14} />}
      label='Agents'
      isSelected={section === 'agents'}
      isMobile={isMobile}
      onClick={() => onSectionChange('agents')}
    />
    <SettingsNavigationButton
      icon={<FolderSearch size={14} />}
      label='Skill sources'
      isSelected={section === 'sources'}
      isMobile={isMobile}
      onClick={() => onSectionChange('sources')}
    />
  </nav>
);

const SettingsNavigationButton = ({
  icon,
  label,
  isSelected,
  isMobile,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  isSelected: boolean;
  isMobile: boolean;
  onClick: () => void;
}) => (
  <button
    type='button'
    aria-current={isSelected ? 'page' : undefined}
    onClick={onClick}
    className={cn(
      'rig-pressable relative flex items-center gap-2.5 overflow-hidden rounded-xl px-2.5 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      isMobile && 'flex-1 justify-center',
      isSelected
        ? 'border border-foreground/10 bg-foreground/[0.07] font-semibold shadow-xs before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-full before:bg-foreground'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
    )}
  >
    <span
      className={cn(
        'flex size-7 shrink-0 items-center justify-center rounded-lg',
        isSelected && 'bg-foreground text-background shadow-xs',
      )}
    >
      {icon}
    </span>
    <span>{label}</span>
  </button>
);

export const SettingsDialog = ({
  open,
  onOpenChange,
  hiddenSkillSourceIds,
  onSkillSourceVisibilityChange,
}: SettingsDialogProps) => {
  const [section, setSection] = useState<SettingsSection>('agents');
  const [copiedAgentId, setCopiedAgentId] = useState<AgentId | null>(null);

  const copySetupPrompt = async (agentId: AgentId, prompt: string) => {
    const agent = agents.find(candidate => candidate.id === agentId);

    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedAgentId(agentId);
      window.setTimeout(() => setCopiedAgentId(null), 1_500);
      toast.success(`${agent?.name ?? 'Agent'} setup copied`, {
        description: `Paste it into a new ${agent?.name ?? 'agent'} conversation.`,
      });
    } catch {
      toast.error('Couldn’t copy the setup prompt.', {
        description: 'Check clipboard access and try again.',
      });
    }
  };

  const updateSourceVisibility = (
    sourceId: SkillSourceId,
    isVisible: boolean,
  ) => {
    if (onSkillSourceVisibilityChange(sourceId, isVisible)) return;

    toast.error('Couldn’t update skill sources.', {
      description: 'Your previous setting is still in use.',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='h-[min(680px,calc(100dvh-2rem))] w-[calc(100vw-2rem)] overflow-hidden rounded-3xl p-0 sm:max-w-4xl'>
        <div className='grid h-full min-h-0 grid-cols-[180px_minmax(0,1fr)] max-sm:grid-cols-1'>
          <aside className='border-r bg-muted/25 p-3 max-sm:hidden'>
            <div className='flex items-center gap-2 px-2 py-2 text-sm font-semibold'>
              <Settings2 size={16} />
              Settings
            </div>
            <SettingsNavigation
              section={section}
              onSectionChange={setSection}
            />
          </aside>

          <section className='flex min-h-0 flex-col overflow-hidden'>
            <SettingsNavigation
              section={section}
              onSectionChange={setSection}
              isMobile
            />

            {section === 'agents' ? (
              <AgentSetup
                copiedAgentId={copiedAgentId}
                onCopySetupPrompt={copySetupPrompt}
              />
            ) : (
              <SkillSourceSettings
                hiddenSkillSourceIds={hiddenSkillSourceIds}
                onSourceVisibilityChange={updateSourceVisibility}
              />
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const AgentSetup = ({
  copiedAgentId,
  onCopySetupPrompt,
}: {
  copiedAgentId: AgentId | null;
  onCopySetupPrompt: (agentId: AgentId, prompt: string) => void;
}) => (
  <div className='flex min-h-0 flex-1 flex-col'>
    <DialogHeader className='border-b px-6 py-5 text-left'>
      <DialogTitle className='text-lg font-semibold tracking-[-0.02em]'>
        Agent setup
      </DialogTitle>
      <DialogDescription className='mt-1 max-w-xl leading-5'>
        Copy a setup prompt and paste it into the matching agent. Review the
        requested changes before approving them.
      </DialogDescription>
      <p className='text-xs font-medium text-foreground'>
        Only set up the agents you use.
      </p>
    </DialogHeader>

    <div className='min-h-0 flex-1 space-y-3 overflow-y-auto p-6'>
      {agents.map(agent => {
        const didCopy = copiedAgentId === agent.id;

        return (
          <article
            key={agent.id}
            className='flex items-center gap-4 rounded-2xl border bg-background p-4 shadow-xs max-sm:flex-col max-sm:items-stretch'
          >
            <span className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted'>
              <Bot size={18} />
            </span>
            <div className='min-w-0 flex-1'>
              <h3 className='text-sm font-semibold'>{agent.name}</h3>
              <p className='mt-1 text-xs leading-5 text-muted-foreground'>
                {agent.description}
              </p>
            </div>
            <Button
              type='button'
              variant='outline'
              className='rig-pressable shrink-0 rounded-xl'
              onClick={() => onCopySetupPrompt(agent.id, agent.prompt)}
            >
              {didCopy ? <Check /> : <Clipboard />}
              {didCopy ? 'Setup copied' : agent.buttonLabel}
            </Button>
          </article>
        );
      })}
    </div>
  </div>
);

const SkillSourceSettings = ({
  hiddenSkillSourceIds,
  onSourceVisibilityChange,
}: {
  hiddenSkillSourceIds: ReadonlySet<SkillSourceId>;
  onSourceVisibilityChange: (
    sourceId: SkillSourceId,
    isVisible: boolean,
  ) => void;
}) => (
  <div className='flex min-h-0 flex-1 flex-col'>
    <DialogHeader className='border-b px-6 py-5 text-left'>
      <DialogTitle className='text-lg font-semibold tracking-[-0.02em]'>
        Skill sources
      </DialogTitle>
      <DialogDescription className='mt-1 max-w-xl leading-5'>
        Choose which provider folders Rig scans and shows.
      </DialogDescription>
    </DialogHeader>

    <div className='min-h-0 flex-1 overflow-y-auto p-6'>
      <section className='overflow-hidden rounded-2xl border bg-background shadow-xs'>
        <div className='border-b px-4 py-3.5'>
          <h3 className='text-sm font-semibold'>Provider folders</h3>
          <p className='mt-1 text-xs leading-5 text-muted-foreground'>
            Turn off a source to hide its skills from Rig. Files stay on disk
            and remain available to the agent.
          </p>
        </div>

        <div className='divide-y'>
          {SKILL_SOURCES.map(source => {
            const isVisible = !hiddenSkillSourceIds.has(source.id);

            return (
              <div
                key={source.id}
                className='flex items-center gap-4 px-4 py-3.5'
              >
                <span className='flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted'>
                  <Folder size={16} />
                </span>
                <div className='min-w-0 flex-1'>
                  <label
                    htmlFor={`skill-source-${source.id}`}
                    className='text-sm font-semibold'
                  >
                    Show {source.name} skills
                  </label>
                  <p className='mt-0.5 truncate font-mono text-[11px] text-muted-foreground'>
                    {source.path}
                  </p>
                </div>
                <span className='text-right text-xs text-muted-foreground max-sm:hidden'>
                  {isVisible ? 'Shown in Rig' : 'Hidden from Rig'}
                </span>
                <Switch
                  id={`skill-source-${source.id}`}
                  checked={isVisible}
                  aria-label={`Show ${source.name} skills in Rig`}
                  onCheckedChange={checked =>
                    onSourceVisibilityChange(source.id, checked)
                  }
                />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  </div>
);

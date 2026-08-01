import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  toast,
} from '@allin/ui';
import { Bot, Check, Clipboard, PlugZap, Settings2 } from 'lucide-react';
import { useState } from 'react';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type AgentId = 'claude-code' | 'codex' | 'opencode';

const agents: Array<{
  id: AgentId;
  name: string;
  description: string;
  prompt: string;
}> = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    description:
      'Installs the Rig marketplace plugin so Claude Code can record skill calls.',
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
      'Uses Codex’s native Agent Skills locations so Rig can discover the same skills.',
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
      'Adds the Rig usage plugin while preserving the rest of your OpenCode config.',
    prompt: `Set up Rig skill usage tracking for OpenCode on this Mac.

1. Inspect ~/.config/opencode/opencode.json and opencode.jsonc if present.
2. Add "rig-opencode" to the existing plugin array without overwriting any other settings or plugins.
3. If the config is JSONC, preserve its comments and formatting.
4. Verify the resulting configuration is valid and report the exact file changed.

Do not replace the full configuration file.`,
  },
];

export const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
  const [copiedAgentId, setCopiedAgentId] = useState<AgentId | null>(null);

  const copySetupPrompt = async (agentId: AgentId, prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedAgentId(agentId);
      window.setTimeout(() => setCopiedAgentId(null), 1_500);
      toast.success('Setup prompt copied', {
        description: `Paste it into ${agents.find(agent => agent.id === agentId)?.name}.`,
      });
    } catch {
      toast.error('Could not copy the setup prompt');
    }
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
            <nav className='mt-2' aria-label='Settings sections'>
              <div
                aria-current='page'
                className='relative flex items-center gap-2.5 overflow-hidden rounded-xl border border-foreground/10 bg-foreground/[0.07] py-2 pl-3 pr-2.5 text-sm font-semibold shadow-xs before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-full before:bg-foreground'
              >
                <span className='flex size-7 shrink-0 items-center justify-center rounded-lg bg-foreground text-background shadow-xs'>
                  <PlugZap size={14} />
                </span>
                <span>Connections</span>
              </div>
            </nav>
          </aside>

          <section className='min-h-0 overflow-y-auto'>
            <DialogHeader className='border-b px-6 py-5 text-left'>
              <DialogTitle className='text-lg font-semibold tracking-[-0.02em]'>
                Connections
              </DialogTitle>
              <DialogDescription className='mt-1 max-w-xl leading-5'>
                Copy the setup prompt for the agent you use, then paste it into
                a new conversation. You only need to configure your own tools.
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-3 p-6'>
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
                      onClick={() => copySetupPrompt(agent.id, agent.prompt)}
                    >
                      {didCopy ? <Check /> : <Clipboard />}
                      {didCopy ? 'Copied' : 'Copy setup prompt'}
                    </Button>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};

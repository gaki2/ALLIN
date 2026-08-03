import { Badge, Button, ScrollArea } from '@allin/ui';
import {
  AppWindow,
  Bot,
  FileText,
  Settings2,
  type LucideIcon,
} from 'lucide-react';
import { appPaths } from '@/app/navigation';
import { ContentLayout } from '@/layouts/ContentLayout';
import { SidebarLayout } from '@/layouts/SidebarLayout';
import type { PluginTarget } from '@/features/plugins/types';

type ResourceSection = typeof appPaths.agents | typeof appPaths.apps;

interface ResourceRootProps {
  section: ResourceSection;
  pluginTargets: PluginTarget[];
  onOpenPluginSetup: () => void;
}

export const ResourceRoot = ({
  section,
  pluginTargets,
  onOpenPluginSetup,
}: ResourceRootProps) => {
  const view =
    section === appPaths.agents
      ? getAgentsView()
      : getAppsView(pluginTargets, onOpenPluginSetup);
  const ContentIcon = view.icon;

  return (
    <div className='flex min-h-0 flex-1'>
      <SidebarLayout>
        <div className='flex h-full min-h-0 flex-col'>
          <div className='shrink-0 border-b px-5 py-4'>
            <div className='flex items-baseline gap-2'>
              <h2 className='text-xl font-semibold tracking-tight'>
                {view.sidebarTitle}
              </h2>
              <p className='text-sm text-muted-foreground'>
                {view.items.length} items
              </p>
            </div>
          </div>

          <ScrollArea className='min-h-0 flex-1'>
            <div className='space-y-1 p-2'>
              {view.items.map(item => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    type='button'
                    className='flex w-full max-w-76 mx-auto min-w-0 items-start gap-3 rounded-xl border border-transparent px-3 py-3 text-left transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                  >
                    <span className='mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground'>
                      <Icon size={16} />
                    </span>
                    <span className='min-w-0 flex-1'>
                      <span className='flex min-w-0 items-center gap-2'>
                        <span className='truncate text-sm font-medium'>
                          {item.title}
                        </span>
                        {item.badge ? (
                          <Badge
                            variant={item.badge.variant}
                            className='h-5 px-1.5 text-[10px]'
                          >
                            {item.badge.label}
                          </Badge>
                        ) : null}
                      </span>
                      <span className='mt-1 line-clamp-2 text-xs text-muted-foreground'>
                        {item.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </SidebarLayout>

      <ContentLayout>
        <div className='flex h-full min-h-0 flex-col'>
          <div className='shrink-0 border-b px-6 py-4'>
            <div className='flex min-w-0 items-center gap-2'>
              <ContentIcon size={18} className='text-muted-foreground' />
              <h1 className='truncate text-lg font-semibold tracking-tight'>
                {view.contentTitle}
              </h1>
            </div>
            <p className='mt-1 max-w-3xl text-sm text-muted-foreground'>
              {view.contentDescription}
            </p>
          </div>

          <ScrollArea className='min-h-0 flex-1'>
            <div className='grid gap-4 p-6 lg:grid-cols-2'>
              {view.cards.map(card => (
                <section key={card.title} className='rounded-xl border bg-card'>
                  <div className='border-b px-4 py-3'>
                    <h2 className='text-sm font-semibold'>{card.title}</h2>
                    <p className='mt-1 text-xs text-muted-foreground'>
                      {card.description}
                    </p>
                  </div>
                  <div className='space-y-3 p-4'>{card.content}</div>
                </section>
              ))}
            </div>
          </ScrollArea>
        </div>
      </ContentLayout>
    </div>
  );
};

type ResourceBadge = {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost';
};

interface ResourceItem {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  badge?: ResourceBadge;
}

interface ResourceCard {
  title: string;
  description: string;
  content: React.ReactNode;
}

interface ResourceView {
  sidebarTitle: string;
  contentTitle: string;
  contentDescription: string;
  icon: LucideIcon;
  items: ResourceItem[];
  cards: ResourceCard[];
}

const getAgentsView = (): ResourceView => ({
  sidebarTitle: 'Agents',
  contentTitle: 'Agent instructions',
  contentDescription:
    'Browse the files that shape how agents behave in this workspace.',
  icon: Bot,
  items: [
    {
      id: 'agents-md',
      title: 'AGENTS.md',
      description: 'Repository-level agent instructions.',
      icon: FileText,
      badge: { label: 'Soon', variant: 'outline' },
    },
    {
      id: 'cursor-rules',
      title: 'Cursor rules',
      description: 'Persistent guidance from .cursor/rules.',
      icon: FileText,
      badge: { label: 'Soon', variant: 'outline' },
    },
  ],
  cards: [
    {
      title: 'Instruction files',
      description: 'AGENTS.md and rule files will appear here.',
      content: (
        <EmptyResourceMessage>
          Connect a workspace instruction scanner to preview and edit agent
          guidance from this panel.
        </EmptyResourceMessage>
      ),
    },
    {
      title: 'Precedence',
      description: 'Show which instruction source applies first.',
      content: (
        <div className='space-y-2 text-sm text-muted-foreground'>
          <p>1. Project-specific instructions</p>
          <p>2. Cursor rules</p>
          <p>3. Installed agent defaults</p>
        </div>
      ),
    },
  ],
});

const getAppsView = (
  pluginTargets: PluginTarget[],
  onOpenPluginSetup: () => void,
): ResourceView => ({
  sidebarTitle: 'Apps',
  contentTitle: 'Installed apps',
  contentDescription:
    'Check agent app integrations and prepare a place for their settings.',
  icon: AppWindow,
  items: [
    ...pluginTargets.map(target => ({
      id: target.id,
      title: target.name,
      description: target.isInstalled
        ? 'Plugin installed and ready.'
        : 'Plugin setup is incomplete.',
      icon: AppWindow,
      badge: {
        label: target.isInstalled ? 'Installed' : 'Setup',
        variant: target.isInstalled ? 'secondary' : 'outline',
      } satisfies ResourceBadge,
    })),
    {
      id: 'app-settings',
      title: 'App settings',
      description: 'Settings files for installed agent apps.',
      icon: Settings2,
      badge: { label: 'Soon', variant: 'outline' },
    },
  ],
  cards: [
    {
      title: 'Plugin status',
      description: 'Current integrations detected by Rig.',
      content:
        pluginTargets.length > 0 ? (
          <div className='space-y-2'>
            {pluginTargets.map(target => (
              <div
                key={target.id}
                className='flex items-center justify-between gap-3 rounded-lg border px-3 py-2'
              >
                <span className='min-w-0 truncate text-sm font-medium'>
                  {target.name}
                </span>
                <Badge variant={target.isInstalled ? 'secondary' : 'outline'}>
                  {target.isInstalled ? 'Installed' : 'Setup needed'}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <EmptyResourceMessage>
            No app integrations have been detected yet.
          </EmptyResourceMessage>
        ),
    },
    {
      title: 'Settings',
      description: 'Configuration previews can be added here next.',
      content: (
        <div className='space-y-3'>
          <EmptyResourceMessage>
            Add an app settings scanner to list config files for Claude Code,
            opencode, and other installed apps.
          </EmptyResourceMessage>
          <Button type='button' variant='outline' onClick={onOpenPluginSetup}>
            Manage plugins
          </Button>
        </div>
      ),
    },
  ],
});

const EmptyResourceMessage = ({ children }: { children: React.ReactNode }) => {
  return (
    <p className='rounded-lg border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground'>
      {children}
    </p>
  );
};

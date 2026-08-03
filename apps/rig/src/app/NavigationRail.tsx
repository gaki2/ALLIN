import {
  cn,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@allin/ui';
import {
  AppWindow,
  BarChart3,
  Bot,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { appPaths, type AppPath } from './navigation';

interface NavigationRailProps {
  currentPath: AppPath;
  onNavigate: (path: AppPath) => void;
}

const navigationItems: Array<{
  path: AppPath;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    path: appPaths.skills,
    label: 'Skills',
    description: 'Installed agent skills',
    icon: Sparkles,
  },
  {
    path: appPaths.agents,
    label: 'Agents',
    description: 'AGENTS.md and instructions',
    icon: Bot,
  },
  {
    path: appPaths.apps,
    label: 'Apps',
    description: 'Installed apps and settings',
    icon: AppWindow,
  },
  {
    path: appPaths.dashboard,
    label: 'Dashboard',
    description: 'Skill usage analytics',
    icon: BarChart3,
  },
];

export const NavigationRail = ({
  currentPath,
  onNavigate,
}: NavigationRailProps) => {
  return (
    <nav
      aria-label='Navigation'
      className='flex w-16 shrink-0 flex-col items-center gap-2 border-r bg-muted/30 px-2 py-3'
    >
      {navigationItems.map(item => {
        const Icon = item.icon;
        const isSelected = currentPath === item.path;

        return (
          <Tooltip key={item.path}>
            <TooltipTrigger asChild>
              <div className='relative flex h-10 w-full items-center justify-center'>
                <button
                  type='button'
                  aria-label={item.label}
                  aria-current={isSelected ? 'page' : undefined}
                  onClick={() => onNavigate(item.path)}
                  className={cn(
                    'flex size-10 items-center justify-center rounded-xl text-muted-foreground',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    !isSelected && 'hover:bg-accent hover:text-accent-foreground',
                    isSelected &&
                      'border-1 border-blue-300 bg-blue-300/20 text-blue-500',
                  )}
                >
                  <Icon size={18} strokeWidth={isSelected ? 2.5 : 2} />
                </button>
              </div>
            </TooltipTrigger>
            <TooltipContent side='right' sideOffset={8}>
              <div className='space-y-0.5'>
                <p className='font-medium'>{item.label}</p>
                <p className='text-[11px] opacity-80'>{item.description}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
};

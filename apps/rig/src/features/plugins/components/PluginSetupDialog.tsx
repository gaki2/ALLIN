import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Spinner,
} from '@allin/ui';
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  PlugZap,
  RefreshCw,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import type { PluginTarget, PluginToolId } from '../types';

interface PluginSetupDialogProps {
  open: boolean;
  pluginTargets: PluginTarget[];
  onOpenChange: (open: boolean) => void;
  onInstallPlugin: (pluginId: PluginToolId) => void;
  onCheckAgain: () => void;
  isChecking: boolean;
  isInstalling: boolean;
  installingPluginId: PluginToolId | null;
  errorMessage: string | null;
}

export const PluginSetupDialog = ({
  open,
  pluginTargets,
  onOpenChange,
  onInstallPlugin,
  onCheckAgain,
  isChecking,
  isInstalling,
  installingPluginId,
  errorMessage,
}: PluginSetupDialogProps) => {
  const installedCount = pluginTargets.filter(
    target => target.isInstalled,
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='w-[calc(100vw-2rem)] max-w-2xl overflow-hidden rounded-3xl p-0'>
        <DialogHeader className='border-b bg-muted/25 px-6 py-5'>
          <div className='flex items-start gap-3 pr-8'>
            <span className='flex size-10 shrink-0 items-center justify-center rounded-2xl border bg-background shadow-sm'>
              <PlugZap size={18} />
            </span>
            <div>
              <DialogTitle className='text-lg font-semibold tracking-[-0.02em]'>
                Agent connections
              </DialogTitle>
              <DialogDescription className='mt-1 leading-5'>
                Connect the coding agents already on this Mac so Rig can record
                skill calls locally. {installedCount} of {pluginTargets.length}{' '}
                connected.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className='space-y-3 px-6 py-5'>
          <div className='flex items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-200'>
            <span className='flex items-center gap-2'>
              <ShieldCheck size={15} />
              Skill content and call history stay on this device.
            </span>
            <button
              type='button'
              onClick={onCheckAgain}
              disabled={isChecking}
              className='rig-pressable inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 font-semibold hover:bg-emerald-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:opacity-50'
            >
              <RefreshCw
                size={13}
                className={isChecking ? 'animate-spin' : ''}
              />
              Check again
            </button>
          </div>

          {errorMessage ? (
            <div
              role='alert'
              className='rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive'
            >
              <p className='font-semibold'>Connection check failed</p>
              <p className='mt-1 break-words text-xs leading-5'>
                {errorMessage}
              </p>
            </div>
          ) : null}

          {isChecking && pluginTargets.length === 0 ? (
            <output
              className='space-y-3'
              aria-label='Checking agent connections'
            >
              {['connection-loading-a', 'connection-loading-b'].map(id => (
                <div
                  key={id}
                  className='h-24 animate-pulse rounded-2xl border bg-muted/40'
                />
              ))}
            </output>
          ) : (
            pluginTargets.map(target => (
              <AgentConnectionRow
                key={target.id}
                target={target}
                onInstallPlugin={onInstallPlugin}
                isChecking={isChecking}
                isInstalling={isInstalling && installingPluginId === target.id}
                isAnyInstalling={isInstalling}
              />
            ))
          )}
        </div>

        <DialogFooter className='border-t bg-muted/20 px-6 py-4'>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const AgentConnectionRow = ({
  target,
  onInstallPlugin,
  isChecking,
  isInstalling,
  isAnyInstalling,
}: {
  target: PluginTarget;
  onInstallPlugin: (pluginId: PluginToolId) => void;
  isChecking: boolean;
  isInstalling: boolean;
  isAnyInstalling: boolean;
}) => (
  <div className='flex flex-col gap-4 rounded-2xl border bg-background p-4 shadow-xs sm:flex-row sm:items-center'>
    <span className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground'>
      <Terminal size={18} />
    </span>

    <div className='min-w-0 flex-1'>
      <div className='flex flex-wrap items-center gap-2'>
        <h3 className='text-sm font-semibold'>{target.name}</h3>
        <ConnectionStatus
          isChecking={isChecking}
          isInstalling={isInstalling}
          isInstalled={target.isInstalled}
        />
      </div>
      <p className='mt-1 text-xs leading-5 text-muted-foreground'>
        {getConnectionDescription(target)}
      </p>
      <a
        href={getManualInstallUrl(target)}
        target='_blank'
        rel='noreferrer'
        className='mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      >
        Setup details <ExternalLink size={11} />
      </a>
    </div>

    {!target.isInstalled ? (
      <Button
        type='button'
        className='rig-pressable w-full rounded-xl sm:w-auto'
        disabled={isAnyInstalling || isChecking}
        onClick={() => onInstallPlugin(target.id)}
      >
        {isInstalling ? <Spinner /> : <PlugZap />}
        {isInstalling ? 'Connecting…' : 'Connect'}
      </Button>
    ) : null}
  </div>
);

const ConnectionStatus = ({
  isChecking,
  isInstalling,
  isInstalled,
}: {
  isChecking: boolean;
  isInstalling: boolean;
  isInstalled: boolean;
}) => {
  if (isChecking) {
    return (
      <span className='text-xs font-medium text-muted-foreground'>
        Checking
      </span>
    );
  }

  if (isInstalling) {
    return (
      <span className='text-xs font-medium text-blue-600 dark:text-blue-300'>
        Connecting
      </span>
    );
  }

  return (
    <span
      className={
        isInstalled
          ? 'inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-300'
          : 'inline-flex items-center gap-1 text-xs font-medium text-muted-foreground'
      }
    >
      {isInstalled ? <CheckCircle2 size={12} /> : <Circle size={10} />}
      {isInstalled ? 'Connected' : 'Not connected'}
    </span>
  );
};

const getConnectionDescription = (target: PluginTarget) => {
  switch (target.id) {
    case 'claude-code':
      return 'Installs Rig through the Claude Code marketplace and verifies the plugin.';
    case 'opencode':
      return 'Adds the local Rig usage hook to your OpenCode configuration.';
  }
};

const getManualInstallUrl = (target: PluginTarget) => {
  switch (target.id) {
    case 'claude-code':
      return 'https://www.allin.sh/docs/getting-started#claude-code';
    case 'opencode':
      return 'https://www.allin.sh/docs/getting-started#opencode';
  }
};

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  cn,
  toast,
} from '@allin/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Effect } from 'effect';
import { Clock3, LoaderCircle, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import {
  listSkillVersions,
  ManageSkillVersionError,
  readSkillVersion,
  restoreSkillVersion,
} from '../api';
import type { Skill, SkillHistoryError } from '../types';
import { getSkillIdentity } from '../useRemoveSkill';
import { SkillDiff } from './SkillDiff';

export const SkillHistoryPanel = ({ skill }: { skill: Skill }) => {
  const queryClient = useQueryClient();
  const identity = getSkillIdentity(skill);
  const [requestedVersionId, setRequestedVersionId] = useState<string | null>(
    null,
  );
  const [restoreVersionId, setRestoreVersionId] = useState<string | null>(null);
  const versionsQuery = useQuery({
    queryKey: ['skill-versions', identity],
    queryFn: () => Effect.runPromise(listSkillVersions(skill)),
  });
  const versions = versionsQuery.data ?? [];
  const defaultVersion =
    versions.find(version => version.action.startsWith('before')) ??
    versions.at(0) ??
    null;
  const selectedVersionId = versions.some(
    version => version.id === requestedVersionId,
  )
    ? requestedVersionId
    : (defaultVersion?.id ?? null);
  const selectedVersion = versions.find(
    version => version.id === selectedVersionId,
  );
  const detailQuery = useQuery({
    queryKey: ['skill-version', identity, selectedVersionId],
    queryFn: () =>
      Effect.runPromise(readSkillVersion(skill, selectedVersionId ?? '')),
    enabled: selectedVersionId != null,
  });
  const restoreMutation = useMutation({
    mutationFn: (versionId: string) =>
      Effect.runPromise(restoreSkillVersion(skill, versionId)),
    onSuccess: () => {
      setRestoreVersionId(null);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['skills'] }),
        queryClient.invalidateQueries({ queryKey: ['skill-updates'] }),
        queryClient.invalidateQueries({
          queryKey: ['skill-versions', identity],
        }),
      ]);
      toast.success('Previous version restored', {
        description: 'Rig saved the version you replaced as a recovery point.',
      });
    },
    onError: error =>
      toast.error('Could not restore this version', {
        description: getHistoryErrorMessage(error),
      }),
  });

  if (versionsQuery.isLoading) {
    return (
      <div className='flex items-center gap-2 py-8 text-sm text-muted-foreground'>
        <LoaderCircle size={16} className='animate-spin' />
        Loading version history…
      </div>
    );
  }

  if (versionsQuery.error) {
    return (
      <p className='rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive'>
        {getHistoryErrorMessage(versionsQuery.error)}
      </p>
    );
  }

  if (versions.length === 0) {
    return (
      <div className='rounded-2xl border border-dashed px-6 py-10 text-center'>
        <Clock3 className='mx-auto text-muted-foreground' size={22} />
        <h2 className='mt-3 text-sm font-semibold'>No Rig versions yet</h2>
        <p className='mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground'>
          Rig records a recoverable version before and after it updates or
          restores this skill. External file changes are not silently tracked.
        </p>
      </div>
    );
  }

  const isCurrent = detailQuery.data?.content === skill.content;

  return (
    <>
      <div className='grid min-h-[420px] gap-5 lg:grid-cols-[220px_minmax(0,1fr)]'>
        <aside>
          <div className='mb-2 flex items-center justify-between gap-3'>
            <h2 className='text-sm font-semibold'>Rig versions</h2>
            <span className='text-xs text-muted-foreground'>Local only</span>
          </div>
          <div className='overflow-hidden rounded-xl border bg-card'>
            {versions.map(version => (
              <button
                key={version.id}
                type='button'
                onClick={() => setRequestedVersionId(version.id)}
                className={cn(
                  'rig-pressable block w-full border-b px-3 py-3 text-left last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                  selectedVersionId === version.id
                    ? 'bg-muted text-foreground'
                    : 'hover:bg-muted/60',
                )}
              >
                <span className='flex items-center justify-between gap-2'>
                  <span className='truncate text-xs font-medium'>
                    {version.label}
                  </span>
                  {version.action === 'restored' ? (
                    <Badge variant='outline' className='px-1.5 text-[9px]'>
                      Restored
                    </Badge>
                  ) : null}
                </span>
                <span className='mt-1 block text-[11px] text-muted-foreground'>
                  {formatVersionTime(version.createdAt)}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <div className='min-w-0'>
          <div className='mb-3 flex min-h-8 items-center justify-between gap-4'>
            <div className='min-w-0'>
              <h2 className='truncate text-sm font-semibold'>
                {selectedVersion?.label ?? 'Saved version'} → Current
              </h2>
              <p className='mt-0.5 text-xs text-muted-foreground'>
                Stacked diff · lines wrap to fit this window
              </p>
            </div>
            <button
              type='button'
              disabled={detailQuery.isLoading || isCurrent}
              onClick={() => setRestoreVersionId(selectedVersionId)}
              className='rig-pressable inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border bg-background px-2.5 text-xs font-medium shadow-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40'
            >
              <RotateCcw size={13} />
              {isCurrent ? 'Current' : 'Restore'}
            </button>
          </div>

          {detailQuery.isLoading ? (
            <div className='flex items-center gap-2 rounded-xl border p-5 text-sm text-muted-foreground'>
              <LoaderCircle size={16} className='animate-spin' />
              Preparing diff…
            </div>
          ) : detailQuery.error ? (
            <p className='rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive'>
              {getHistoryErrorMessage(detailQuery.error)}
            </p>
          ) : detailQuery.data ? (
            <SkillDiff
              before={detailQuery.data.content}
              after={skill.content}
            />
          ) : null}
        </div>
      </div>

      <AlertDialog
        open={restoreVersionId != null}
        onOpenChange={open => {
          if (!open && !restoreMutation.isPending) setRestoreVersionId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this version?</AlertDialogTitle>
            <AlertDialogDescription>
              Rig will save your current files as a recovery version, then
              replace this skill with the selected snapshot. You can undo this
              restore from History.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoreMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={restoreMutation.isPending}
              onClick={event => {
                event.preventDefault();
                if (restoreVersionId) restoreMutation.mutate(restoreVersionId);
              }}
            >
              {restoreMutation.isPending ? (
                <LoaderCircle className='animate-spin' />
              ) : (
                <RotateCcw />
              )}
              Restore version
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const formatVersionTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export const getHistoryErrorMessage = (error: unknown) => {
  if (
    error instanceof ManageSkillVersionError &&
    error.kind === 'SkillHistoryError'
  ) {
    return (error.cause as SkillHistoryError).message;
  }
  return error instanceof Error ? error.message : String(error);
};

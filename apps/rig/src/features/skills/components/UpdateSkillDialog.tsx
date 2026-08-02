import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  toast,
} from '@allin/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Effect } from 'effect';
import { LoaderCircle, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { updateSkill } from '../api';
import type { Skill, SkillUpdateStatus } from '../types';
import { getSkillIdentity } from '../useRemoveSkill';
import { getHistoryErrorMessage } from './SkillHistoryPanel';

export const UpdateSkillDialog = ({
  skill,
  updateStatus,
  onUpdated,
}: {
  skill: Skill;
  updateStatus: SkillUpdateStatus;
  onUpdated: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const identity = getSkillIdentity(skill);
  const mutation = useMutation({
    mutationFn: () => Effect.runPromise(updateSkill(skill.name)),
    onSuccess: () => {
      setOpen(false);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['skills'] }),
        queryClient.invalidateQueries({ queryKey: ['skill-updates'] }),
        queryClient.invalidateQueries({
          queryKey: ['skill-versions', identity],
        }),
      ]);
      toast.success(`${skill.name} updated`, {
        description: 'The before and after versions are available in History.',
      });
      onUpdated();
    },
  });

  return (
    <>
      <button
        type='button'
        onClick={() => setOpen(true)}
        className='rig-pressable inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg bg-foreground px-2.5 text-xs font-medium text-background shadow-xs hover:bg-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      >
        <RefreshCw size={13} />
        Update
      </button>
      <Dialog
        open={open}
        onOpenChange={nextOpen => {
          if (!mutation.isPending) {
            setOpen(nextOpen);
            if (!nextOpen) mutation.reset();
          }
        }}
      >
        <DialogContent showCloseButton={!mutation.isPending}>
          <DialogHeader>
            <DialogTitle>Update {skill.name}?</DialogTitle>
            <DialogDescription>
              Rig will save the current skill as a recovery version, run the
              official Skills CLI update, validate SKILL.md, and restore your
              files automatically if anything fails.
            </DialogDescription>
          </DialogHeader>

          <div className='rounded-xl border bg-muted/35 p-3 text-sm'>
            <div className='flex justify-between gap-4'>
              <span className='text-muted-foreground'>Source</span>
              <span className='truncate font-medium'>
                {updateStatus.source}
              </span>
            </div>
            <div className='mt-2 flex justify-between gap-4'>
              <span className='text-muted-foreground'>History</span>
              <span className='font-medium'>Before + after snapshots</span>
            </div>
          </div>

          {mutation.error ? (
            <p className='rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm leading-6 text-destructive'>
              {getHistoryErrorMessage(mutation.error)}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              disabled={mutation.isPending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type='button'
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? (
                <LoaderCircle className='animate-spin' />
              ) : (
                <RefreshCw />
              )}
              {mutation.isPending ? 'Updating…' : 'Update skill'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

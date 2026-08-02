import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Effect } from 'effect';
import { useMemo, useState } from 'react';
import { ContentLayout } from '@/layouts/ContentLayout';
import { SidebarLayout } from '@/layouts/SidebarLayout';
import {
  checkSkillUpdates,
  listSkillUsages,
  listSkillUsagesTendency,
} from '../api';
import type {
  SkillManagementView,
  SkillRoot as SkillRootModel,
} from '../types';
import { useFetchArchivedSkills } from '../useFetchArchivedSkills';
import { useFetchSkills } from '../useFetchSkills';
import { getSkillIdentity, useRemoveSkill } from '../useRemoveSkill';
import { useSkillArchive } from '../useSkillArchive';
import {
  getSkillSourceIdFromPath,
  isSkillSourceVisible,
  type SkillSourceId,
} from '../skillSources';
import { SkillContentViewer } from './SkillContentViewer';
import { SkillList } from './SkillList';

interface SkillRootProps {
  roots: SkillRootModel[];
  hiddenSkillSourceIds: ReadonlySet<SkillSourceId>;
}

export const SkillRoot = ({
  roots,
  hiddenSkillSourceIds,
}: SkillRootProps) => {
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [managementView, setManagementView] =
    useState<SkillManagementView | null>(null);
  const queryClient = useQueryClient();
  const { skills, isLoading, error } = useFetchSkills(roots);
  const {
    archivedSkills,
    isLoading: isLoadingArchivedSkills,
    error: archivedSkillsError,
  } = useFetchArchivedSkills(roots);
  const { data: skillUsages = [] } = useQuery({
    queryKey: ['skill-usages', 'week'],
    queryFn: () => Effect.runPromise(listSkillUsages('week')),
  });
  const { data: skillUsageTendencies = [] } = useQuery({
    queryKey: ['skill-usages-tendency', 'week', 'day'],
    queryFn: () => Effect.runPromise(listSkillUsagesTendency('week', 'day')),
  });
  const {
    data: skillUpdates = [],
    error: skillUpdatesError,
    isFetching: isFetchingUpdates,
  } = useQuery({
    queryKey: ['skill-updates'],
    queryFn: () => Effect.runPromise(checkSkillUpdates()),
    staleTime: 15 * 60 * 1_000,
    refetchOnWindowFocus: false,
  });
  const forceUpdateCheck = useMutation({
    mutationFn: () => Effect.runPromise(checkSkillUpdates(true)),
    onSuccess: statuses => {
      queryClient.setQueryData(['skill-updates'], statuses);
    },
  });
  const isCheckingUpdates = isFetchingUpdates || forceUpdateCheck.isPending;
  const updatesError = skillUpdatesError ?? forceUpdateCheck.error;
  const checkUpdatesNow = () => forceUpdateCheck.mutate();
  const visibleSkills = useMemo(
    () =>
      skills.filter(skill =>
        isSkillSourceVisible(skill, hiddenSkillSourceIds),
      ),
    [hiddenSkillSourceIds, skills],
  );
  const visibleArchivedSkills = useMemo(
    () =>
      archivedSkills.filter(skill =>
        isSkillSourceVisible(skill, hiddenSkillSourceIds),
      ),
    [archivedSkills, hiddenSkillSourceIds],
  );
  const visibleSkillUpdates = useMemo(
    () =>
      skillUpdates.filter(update => {
        const sourceId = getSkillSourceIdFromPath(update.installPath);
        return sourceId === null || !hiddenSkillSourceIds.has(sourceId);
      }),
    [hiddenSkillSourceIds, skillUpdates],
  );
  const allSkills = useMemo(
    () => [...visibleSkills, ...visibleArchivedSkills],
    [visibleArchivedSkills, visibleSkills],
  );
  const selectedSkillIdSet = useMemo(
    () => new Set(selectedSkillIds),
    [selectedSkillIds],
  );
  const selectedSkill = selectedSkillId
    ? (allSkills.find(skill => getSkillIdentity(skill) === selectedSkillId) ??
      null)
    : null;
  const clearChangedSkill = (changedSkill: (typeof allSkills)[number]) => {
    const changedId = getSkillIdentity(changedSkill);
    setSelectedSkillIds(currentIds =>
      currentIds.filter(currentId => currentId !== changedId),
    );
    setSelectedSkillId(currentId =>
      currentId === changedId ? null : currentId,
    );
  };
  const { removeSkills, removingSkillIds } = useRemoveSkill({
    onRemoved: removedSkill => {
      clearChangedSkill(removedSkill);
    },
  });
  const {
    archiveSkill,
    archiveSkills,
    restoreSkill,
    restoreSkills,
    changingSkillIds,
  } = useSkillArchive({
    onArchived: changedSkill => {
      clearChangedSkill(changedSkill);
    },
    onRestored: changedSkill => {
      clearChangedSkill(changedSkill);
    },
  });
  const clearSelection = () => {
    setSelectedSkillId(null);
    setSelectedSkillIds([]);
  };

  const selectOneSkill = (skill: (typeof allSkills)[number]) => {
    const identity = getSkillIdentity(skill);
    setSelectedSkillId(identity);
    setSelectedSkillIds([identity]);
  };

  return (
    <div className='flex min-h-0 flex-1'>
      <SidebarLayout className={selectedSkill ? 'max-md:hidden' : undefined}>
        <SkillList
          skills={visibleSkills}
          archivedSkills={visibleArchivedSkills}
          selectedSkill={selectedSkill}
          selectedSkillIds={selectedSkillIdSet}
          skillUsages={skillUsages}
          skillUsageTendencies={skillUsageTendencies}
          skillUpdates={visibleSkillUpdates}
          skillUpdatesError={updatesError}
          isCheckingUpdates={isCheckingUpdates}
          onCheckUpdates={checkUpdatesNow}
          isLoading={isLoading || isLoadingArchivedSkills}
          error={
            error || archivedSkillsError
              ? String(error ?? archivedSkillsError)
              : null
          }
          onSelectionChange={(selectedSkills, focusedSkill) => {
            setSelectedSkillIds(selectedSkills.map(getSkillIdentity));
            setSelectedSkillId(
              focusedSkill ? getSkillIdentity(focusedSkill) : null,
            );
          }}
          onClearSelection={clearSelection}
          onRemoveSkills={removeSkills}
          removingSkillIds={removingSkillIds}
          onArchiveSkills={archiveSkills}
          onRestoreSkills={restoreSkills}
          changingSkillIds={changingSkillIds}
          managementView={managementView}
          onManagementViewChange={setManagementView}
        />
      </SidebarLayout>

      <ContentLayout className={!selectedSkill ? 'max-md:hidden' : undefined}>
        <SkillContentViewer
          skill={selectedSkill}
          skills={allSkills}
          weekUsages={skillUsages}
          skillUpdates={visibleSkillUpdates}
          isCheckingUpdates={isCheckingUpdates}
          onCheckUpdates={checkUpdatesNow}
          onSelectSkill={selectOneSkill}
          onBack={clearSelection}
          onArchiveSkill={archiveSkill}
          onRestoreSkill={restoreSkill}
          isChangingArchiveState={
            selectedSkill
              ? changingSkillIds.has(getSkillIdentity(selectedSkill))
              : false
          }
          managementView={managementView}
        />
      </ContentLayout>
    </div>
  );
};

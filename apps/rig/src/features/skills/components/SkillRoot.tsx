import { useQuery } from '@tanstack/react-query';
import { Effect } from 'effect';
import { useState } from 'react';
import { ContentLayout } from '@/layouts/ContentLayout';
import { SidebarLayout } from '@/layouts/SidebarLayout';
import { listSkillUsages, listSkillUsagesTendency } from '../api';
import type { SkillRoot as SkillRootModel } from '../types';
import { useFetchArchivedSkills } from '../useFetchArchivedSkills';
import { useFetchSkills } from '../useFetchSkills';
import { getSkillIdentity, useRemoveSkill } from '../useRemoveSkill';
import { useSkillArchive } from '../useSkillArchive';
import { SkillContentViewer } from './SkillContentViewer';
import { SkillList } from './SkillList';

interface SkillRootProps {
  roots: SkillRootModel[];
}

export const SkillRoot = ({ roots }: SkillRootProps) => {
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [managementView, setManagementView] = useState<
    'review' | 'archived' | null
  >(null);
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
  const allSkills = [...skills, ...archivedSkills];
  const selectedSkill = selectedSkillId
    ? (allSkills.find(skill => getSkillIdentity(skill) === selectedSkillId) ??
      null)
    : null;
  const { removeSkill, removingSkillId } = useRemoveSkill({
    onRemoved: removedSkill => {
      setSelectedSkillId(currentId =>
        currentId === getSkillIdentity(removedSkill) ? null : currentId,
      );
    },
  });
  const { archiveSkill, restoreSkill, changingSkillId } = useSkillArchive({
    onArchived: changedSkill => {
      setSelectedSkillId(currentId =>
        currentId === getSkillIdentity(changedSkill) ? null : currentId,
      );
    },
    onRestored: changedSkill => {
      setSelectedSkillId(currentId =>
        currentId === getSkillIdentity(changedSkill) ? null : currentId,
      );
    },
  });

  return (
    <div className='flex min-h-0 flex-1'>
      <SidebarLayout className={selectedSkill ? 'max-md:hidden' : undefined}>
        <SkillList
          skills={skills}
          archivedSkills={archivedSkills}
          selectedSkill={selectedSkill}
          skillUsages={skillUsages}
          skillUsageTendencies={skillUsageTendencies}
          isLoading={isLoading || isLoadingArchivedSkills}
          error={
            error || archivedSkillsError
              ? String(error ?? archivedSkillsError)
              : null
          }
          onSelectSkill={skill => setSelectedSkillId(getSkillIdentity(skill))}
          onClearSelection={() => setSelectedSkillId(null)}
          onRemoveSkill={removeSkill}
          removingSkillId={removingSkillId}
          onArchiveSkill={archiveSkill}
          onRestoreSkill={restoreSkill}
          changingSkillId={changingSkillId}
          managementView={managementView}
          onManagementViewChange={setManagementView}
        />
      </SidebarLayout>

      <ContentLayout className={!selectedSkill ? 'max-md:hidden' : undefined}>
        <SkillContentViewer
          skill={selectedSkill}
          skills={allSkills}
          weekUsages={skillUsages}
          onSelectSkill={skill => setSelectedSkillId(getSkillIdentity(skill))}
          onBack={() => setSelectedSkillId(null)}
          onArchiveSkill={archiveSkill}
          onRestoreSkill={restoreSkill}
          isChangingArchiveState={
            selectedSkill
              ? changingSkillId === getSkillIdentity(selectedSkill)
              : false
          }
          managementView={managementView}
        />
      </ContentLayout>
    </div>
  );
};

import { useQuery } from '@tanstack/react-query';
import { Effect } from 'effect';
import { useState } from 'react';
import { ContentLayout } from '@/layouts/ContentLayout';
import { SidebarLayout } from '@/layouts/SidebarLayout';
import { listSkillUsages, listSkillUsagesTendency } from '../api';
import type { SkillRoot as SkillRootModel } from '../types';
import { useFetchSkills } from '../useFetchSkills';
import { getSkillIdentity, useRemoveSkill } from '../useRemoveSkill';
import { SkillContentViewer } from './SkillContentViewer';
import { SkillList } from './SkillList';

interface SkillRootProps {
  roots: SkillRootModel[];
}

export const SkillRoot = ({ roots }: SkillRootProps) => {
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const { skills, isLoading, error } = useFetchSkills(roots);
  const { data: skillUsages = [] } = useQuery({
    queryKey: ['skill-usages', 'week'],
    queryFn: () => Effect.runPromise(listSkillUsages('week')),
  });
  const { data: skillUsageTendencies = [] } = useQuery({
    queryKey: ['skill-usages-tendency', 'week', 'day'],
    queryFn: () => Effect.runPromise(listSkillUsagesTendency('week', 'day')),
  });
  const selectedSkill = selectedSkillId
    ? (skills.find(skill => getSkillIdentity(skill) === selectedSkillId) ??
      null)
    : null;
  const { removeSkill, removingSkillId } = useRemoveSkill({
    onRemoved: removedSkill => {
      setSelectedSkillId(currentId =>
        currentId === getSkillIdentity(removedSkill) ? null : currentId,
      );
    },
  });

  return (
    <div className='flex min-h-0 flex-1'>
      <SidebarLayout className={selectedSkill ? 'max-md:hidden' : undefined}>
        <SkillList
          skills={skills}
          selectedSkill={selectedSkill}
          skillUsages={skillUsages}
          skillUsageTendencies={skillUsageTendencies}
          isLoading={isLoading}
          error={error ? String(error) : null}
          onSelectSkill={skill => setSelectedSkillId(getSkillIdentity(skill))}
          onRemoveSkill={removeSkill}
          removingSkillId={removingSkillId}
        />
      </SidebarLayout>

      <ContentLayout className={!selectedSkill ? 'max-md:hidden' : undefined}>
        <SkillContentViewer
          skill={selectedSkill}
          skills={skills}
          weekUsages={skillUsages}
          onSelectSkill={skill => setSelectedSkillId(getSkillIdentity(skill))}
          onBack={() => setSelectedSkillId(null)}
        />
      </ContentLayout>
    </div>
  );
};

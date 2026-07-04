import { useQuery } from '@tanstack/react-query';
import { Effect } from 'effect';
import { listSkillUsages, listSkillUsagesTendency } from '../api';
import { buildSkills, type Skill } from '../skillModel';
import type { ProviderSkill, SkillRoot } from '../types';
import { useFetchSkills } from '../useFetchSkills';
import { SkillList } from './SkillList';

interface SkillSidebarProps {
  roots: SkillRoot[];
  selectedSkill: Skill | null;
  onSelectSkill: (skill: Skill) => void;
  onRemoveSkill: (skill: ProviderSkill) => void;
  removingSkillId: string | null;
}

export const SkillSidebar = ({
  roots,
  selectedSkill,
  onSelectSkill,
  onRemoveSkill,
  removingSkillId,
}: SkillSidebarProps) => {
  const { skills: providerSkills, isLoading, error } = useFetchSkills(roots);
  const skills = buildSkills(providerSkills);

  const { data: skillUsages = [] } = useQuery({
    queryKey: ['skill-usages', 'month'],
    queryFn: () => Effect.runPromise(listSkillUsages('month')),
  });

  const { data: skillUsageTendencies = [] } = useQuery({
    queryKey: ['skill-usages-tendency', 'month', 'day'],
    queryFn: () => Effect.runPromise(listSkillUsagesTendency('month', 'day')),
  });

  return (
    <SkillList
      skills={skills}
      selectedSkill={selectedSkill}
      skillUsages={skillUsages}
      skillUsageTendencies={skillUsageTendencies}
      isLoading={isLoading}
      error={error ? String(error) : null}
      onSelectSkill={onSelectSkill}
      onRemoveSkill={onRemoveSkill}
      removingSkillId={removingSkillId}
    />
  );
};

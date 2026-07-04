import { useQuery } from '@tanstack/react-query';
import { Effect } from 'effect';
import { groupSkills, type SkillGroup } from '../groupSkills';
import { listSkillUsages, listSkillUsagesTendency } from '../api';
import type { Skill, SkillRoot } from '../types';
import { useFetchSkills } from '../useFetchSkills';
import { SkillList } from './SkillList';

interface SkillSidebarProps {
  roots: SkillRoot[];
  selectedSkillGroup: SkillGroup | null;
  onSelectSkillGroup: (skillGroup: SkillGroup) => void;
  onRemoveSkill: (skill: Skill) => void;
  removingSkillId: string | null;
}

export const SkillSidebar = ({
  roots,
  selectedSkillGroup,
  onSelectSkillGroup,
  onRemoveSkill,
  removingSkillId,
}: SkillSidebarProps) => {
  const { skills, isLoading, error } = useFetchSkills(roots);
  const skillGroups = groupSkills(skills);

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
      skillGroups={skillGroups}
      selectedSkillGroup={selectedSkillGroup}
      skillUsages={skillUsages}
      skillUsageTendencies={skillUsageTendencies}
      isLoading={isLoading}
      error={error ? String(error) : null}
      onSelectSkillGroup={onSelectSkillGroup}
      onRemoveSkill={onRemoveSkill}
      removingSkillId={removingSkillId}
    />
  );
};

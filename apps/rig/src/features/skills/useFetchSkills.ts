import { useQueries } from '@tanstack/react-query';
import { Effect } from 'effect';
import { listSkills } from './api';
import type { Skill, SkillRoot } from './types';

export const useFetchSkills = (roots: SkillRoot[]) => {
  const skillQueries = useQueries({
    queries: roots.map(root => ({
      queryKey: ['skills', root.id, root.path, root.exists],
      queryFn: () => Effect.runPromise(listSkills(root)),
    })),
  });

  return {
    skills: filterDuplicate(skillQueries.flatMap(query => query.data ?? [])),
    isLoading: skillQueries.some(query => query.isLoading),
    error: skillQueries.find(query => query.error)?.error ?? null,
  };
};

const filterDuplicate = (skills: Skill[]) => {
  const names = new Set<string>();

  return skills.filter(skill => {
    // Users may sync the same skill into multiple coding-service roots,
    // such as .claude/skills and .agents/skills. Keep the first one shown.
    if (names.has(skill.name)) {
      return false;
    }

    names.add(skill.name);
    return true;
  });
};

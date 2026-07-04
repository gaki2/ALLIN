import { useQueries } from '@tanstack/react-query';
import { Effect } from 'effect';
import { listSkills } from './api';
import type { SkillRoot } from './types';

export const useFetchSkills = (roots: SkillRoot[]) => {
  const skillQueries = useQueries({
    queries: roots.map(root => ({
      queryKey: ['skills', root.id, root.path, root.exists],
      queryFn: () => Effect.runPromise(listSkills(root)),
    })),
  });

  return {
    skills: skillQueries.flatMap(query => query.data ?? []),
    isLoading: skillQueries.some(query => query.isLoading),
    error: skillQueries.find(query => query.error)?.error ?? null,
  };
};

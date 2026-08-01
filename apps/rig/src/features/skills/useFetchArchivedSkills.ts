import { useQueries } from '@tanstack/react-query';
import { Effect } from 'effect';
import { listArchivedSkills } from './api';
import type { SkillRoot } from './types';

export const useFetchArchivedSkills = (roots: SkillRoot[]) => {
  const skillQueries = useQueries({
    queries: roots.map(root => ({
      queryKey: ['archived-skills', root.path],
      queryFn: () => Effect.runPromise(listArchivedSkills(root.path)),
    })),
  });

  return {
    archivedSkills: skillQueries.flatMap(query => query.data ?? []),
    isLoading: skillQueries.some(query => query.isLoading),
    error: skillQueries.find(query => query.error)?.error ?? null,
  };
};

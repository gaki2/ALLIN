import { useState } from 'react';
import { GLOBAL_REPOSITORY_ID } from './components/RepositorySelector';
import type { SkillRoot } from './types';

const LAST_SKILL_CONTEXT_KEY = 'rig:last-skill-context';

export const useSkillRepositorySelection = ({
  roots,
  onRepositoryChange,
}: {
  roots: SkillRoot[];
  onRepositoryChange: () => void;
}) => {
  const [storedRepositoryId, setStoredRepositoryId] = useState(() => {
    if (typeof window === 'undefined') return GLOBAL_REPOSITORY_ID;
    return (
      window.localStorage.getItem(LAST_SKILL_CONTEXT_KEY) ??
      GLOBAL_REPOSITORY_ID
    );
  });
  const [isOpen, setIsOpen] = useState(false);
  const selectedRepositoryId =
    storedRepositoryId === GLOBAL_REPOSITORY_ID ||
    roots.some(root => root.id === storedRepositoryId)
      ? storedRepositoryId
      : GLOBAL_REPOSITORY_ID;

  const selectRepository = (repositoryId: string) => {
    setStoredRepositoryId(repositoryId);
    window.localStorage.setItem(LAST_SKILL_CONTEXT_KEY, repositoryId);
    setIsOpen(false);
    onRepositoryChange();
  };

  return {
    selectedRepositoryId,
    visibleRoots: getVisibleRoots(roots, selectedRepositoryId),
    isOpen,
    setIsOpen,
    selectRepository,
  };
};

export const getVisibleRoots = (
  roots: SkillRoot[],
  selectedRepositoryId: string,
) => {
  if (selectedRepositoryId === GLOBAL_REPOSITORY_ID) {
    return roots;
  }

  return roots.filter(
    root => root.kind === 'default' || root.id === selectedRepositoryId,
  );
};

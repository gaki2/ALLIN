import { useState } from 'react';
import { GLOBAL_SCOPE_ID } from './components/ScopeSelector';
import type { SkillRoot } from './types';

export const useSkillScopeSelection = ({
  roots,
  onScopeChange,
}: {
  roots: SkillRoot[];
  onScopeChange: () => void;
}) => {
  const [selectedScopeId, setSelectedScopeId] = useState(GLOBAL_SCOPE_ID);
  const [isOpen, setIsOpen] = useState(false);

  const selectScope = (scopeId: string) => {
    setSelectedScopeId(scopeId);
    setIsOpen(false);
    onScopeChange();
  };

  return {
    selectedScopeId,
    visibleRoots: getVisibleRoots(roots, selectedScopeId),
    isOpen,
    setIsOpen,
    selectScope,
  };
};

const getVisibleRoots = (roots: SkillRoot[], selectedScopeId: string) => {
  return roots.filter(root => root.scopeId === selectedScopeId);
};

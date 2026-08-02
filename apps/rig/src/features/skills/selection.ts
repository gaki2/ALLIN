export interface SkillSelectionModifiers {
  toggle: boolean;
  range: boolean;
}

export const getNextSkillSelection = ({
  orderedIds,
  selectedIds,
  clickedId,
  anchorId,
  modifiers,
}: {
  orderedIds: string[];
  selectedIds: ReadonlySet<string>;
  clickedId: string;
  anchorId: string | null;
  modifiers: SkillSelectionModifiers;
}) => {
  if (modifiers.range && anchorId) {
    const anchorIndex = orderedIds.indexOf(anchorId);
    const clickedIndex = orderedIds.indexOf(clickedId);

    if (anchorIndex >= 0 && clickedIndex >= 0) {
      const rangeIds = orderedIds.slice(
        Math.min(anchorIndex, clickedIndex),
        Math.max(anchorIndex, clickedIndex) + 1,
      );

      return modifiers.toggle
        ? orderedIds.filter(id => selectedIds.has(id) || rangeIds.includes(id))
        : rangeIds;
    }
  }

  if (modifiers.toggle) {
    return selectedIds.has(clickedId)
      ? orderedIds.filter(id => selectedIds.has(id) && id !== clickedId)
      : orderedIds.filter(id => selectedIds.has(id) || id === clickedId);
  }

  return [clickedId];
};

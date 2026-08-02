import { describe, expect, it } from 'vitest';
import { getNextSkillSelection } from './selection';

const orderedIds = ['a', 'b', 'c', 'd', 'e'];

describe('getNextSkillSelection', () => {
  it('replaces the selection for a regular click', () => {
    expect(
      getNextSkillSelection({
        orderedIds,
        selectedIds: new Set(['a', 'b']),
        clickedId: 'd',
        anchorId: 'a',
        modifiers: { toggle: false, range: false },
      }),
    ).toEqual(['d']);
  });

  it('toggles one item with command or control', () => {
    expect(
      getNextSkillSelection({
        orderedIds,
        selectedIds: new Set(['a', 'c']),
        clickedId: 'b',
        anchorId: 'c',
        modifiers: { toggle: true, range: false },
      }),
    ).toEqual(['a', 'b', 'c']);

    expect(
      getNextSkillSelection({
        orderedIds,
        selectedIds: new Set(['a', 'b', 'c']),
        clickedId: 'b',
        anchorId: 'b',
        modifiers: { toggle: true, range: false },
      }),
    ).toEqual(['a', 'c']);
  });

  it('selects an inclusive range with shift', () => {
    expect(
      getNextSkillSelection({
        orderedIds,
        selectedIds: new Set(['b']),
        clickedId: 'e',
        anchorId: 'b',
        modifiers: { toggle: false, range: true },
      }),
    ).toEqual(['b', 'c', 'd', 'e']);
  });

  it('adds a range with command or control plus shift', () => {
    expect(
      getNextSkillSelection({
        orderedIds,
        selectedIds: new Set(['a', 'd']),
        clickedId: 'c',
        anchorId: 'd',
        modifiers: { toggle: true, range: true },
      }),
    ).toEqual(['a', 'c', 'd']);
  });
});

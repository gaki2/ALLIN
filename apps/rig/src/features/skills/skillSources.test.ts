import { describe, expect, it } from 'vitest';
import {
  getSkillSourceIdFromPath,
  isSkillSourceVisible,
  parseHiddenSkillSources,
} from './skillSources';

describe('skill source visibility', () => {
  it.each([
    ['/Users/test/.claude/skills/review/SKILL.md', 'claude'],
    ['/Users/test/.agents/skills/review/SKILL.md', 'agents'],
    ['/Users/test/.codex/skills/review/SKILL.md', 'agents'],
    ['/Users/test/.config/opencode/skills/review/SKILL.md', 'opencode'],
    ['/work/project/.opencode/skills/review/SKILL.md', 'opencode'],
  ])('detects %s as %s', (path, sourceId) => {
    expect(getSkillSourceIdFromPath(path)).toBe(sourceId);
  });

  it('detects providers inside an imported repository', () => {
    expect(
      isSkillSourceVisible(
        {
          rootPath: '/work/project',
          relativePath: '.claude/skills/review',
        },
        new Set(['claude']),
      ),
    ).toBe(false);
  });

  it('keeps unrecognized repository skills visible', () => {
    expect(
      isSkillSourceVisible(
        { rootPath: '/work/project', relativePath: 'skills/review' },
        new Set(['claude', 'agents', 'opencode']),
      ),
    ).toBe(true);
  });

  it('ignores invalid persisted values', () => {
    expect(
      parseHiddenSkillSources('["claude","unknown",42,"agents"]'),
    ).toEqual(['claude', 'agents']);
    expect(parseHiddenSkillSources('not-json')).toEqual([]);
  });
});

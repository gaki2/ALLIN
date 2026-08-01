import { describe, expect, it } from 'vitest';
import {
  estimateSkillTokens,
  getDuplicateSkillNames,
  getLibraryHealth,
  getSkillReviewReasons,
  getSkillSourceLabel,
  LARGE_SKILL_CHARACTER_THRESHOLD,
  matchesSkillSearch,
} from './insights';
import type { Skill } from './types';
import { getSkillIdentity } from './useRemoveSkill';

const makeSkill = (overrides: Partial<Skill> = {}): Skill => ({
  id: 'skill',
  name: 'Review animations',
  rootPath: '/Users/test/.agents/skills',
  relativePath: 'review-animations',
  content: 'Use deliberate motion.',
  description: 'Audit interface motion',
  isValid: true,
  validationError: null,
  updatedAt: '2026-08-01T00:00:00Z',
  ...overrides,
});

describe('skill library insights', () => {
  it('keeps same-name skills as distinct canonical identities', () => {
    const first = makeSkill();
    const second = makeSkill({ rootPath: '/work/rig/.claude/skills' });

    expect(getSkillIdentity(first)).not.toBe(getSkillIdentity(second));
    expect(getDuplicateSkillNames([first, second])).toEqual(
      new Set(['Review animations']),
    );
  });

  it('searches names, descriptions, paths, and instructions case-insensitively', () => {
    const skill = makeSkill();

    expect(matchesSkillSearch(skill, 'ANIMATIONS')).toBe(true);
    expect(matchesSkillSearch(skill, 'interface motion')).toBe(true);
    expect(matchesSkillSearch(skill, 'review-animations')).toBe(true);
    expect(matchesSkillSearch(skill, 'deliberate motion')).toBe(true);
    expect(matchesSkillSearch(skill, 'database')).toBe(false);
  });

  it('uses a documented deterministic estimated-token formula', () => {
    expect(estimateSkillTokens('12345678')).toBe(2);
    expect(estimateSkillTokens('')).toBe(1);
  });

  it('names known agent sources instead of showing a generic skills folder', () => {
    expect(getSkillSourceLabel(makeSkill())).toBe('Codex');
    expect(
      getSkillSourceLabel(
        makeSkill({ rootPath: '/Users/test/.claude/skills' }),
      ),
    ).toBe('Claude');
    expect(
      getSkillSourceLabel(
        makeSkill({ rootPath: '/Users/test/.config/opencode/skills' }),
      ),
    ).toBe('OpenCode');
  });

  it('flags the exact large-instruction threshold', () => {
    const below = makeSkill({
      content: 'x'.repeat(LARGE_SKILL_CHARACTER_THRESHOLD - 1),
    });
    const atThreshold = makeSkill({
      name: 'Large skill',
      content: 'x'.repeat(LARGE_SKILL_CHARACTER_THRESHOLD),
    });

    expect(
      getSkillReviewReasons({ skill: below, duplicateNames: new Set() }),
    ).not.toContain('Large instructions');
    expect(
      getSkillReviewReasons({
        skill: atThreshold,
        duplicateNames: new Set(),
      }),
    ).toContain('Large instructions');
  });

  it('counts affected skills once even with overlapping findings', () => {
    const invalidLarge = makeSkill({
      isValid: false,
      content: 'x'.repeat(LARGE_SKILL_CHARACTER_THRESHOLD),
      validationError: { code: 'emptyContent', message: 'Empty content' },
    });

    expect(getLibraryHealth([invalidLarge]).reviewCount).toBe(1);
    expect(
      getSkillReviewReasons({
        skill: invalidLarge,
        duplicateNames: new Set(),
      }),
    ).toEqual(['Invalid file', 'Large instructions']);
  });
});

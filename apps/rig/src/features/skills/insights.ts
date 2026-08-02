import { getSkillSourceId } from './skillSources';
import type { Skill } from './types';

export const LARGE_SKILL_CHARACTER_THRESHOLD = 16_000;

export const estimateSkillTokens = (content: string) =>
  Math.max(1, Math.ceil(content.length / 4));

export const getSkillSourceLabel = (
  skill: Pick<Skill, 'rootPath' | 'relativePath'>,
) => {
  const sourceId = getSkillSourceId(skill);

  if (sourceId === 'agents') return 'Codex';
  if (sourceId === 'claude') return 'Claude Code';
  if (sourceId === 'opencode') return 'OpenCode';

  const normalizedPath = skill.rootPath.replaceAll('\\', '/');
  const segments = normalizedPath.split('/').filter(Boolean);
  return segments.at(-1) ?? skill.rootPath;
};

export const getSkillFilePath = (
  skill: Pick<Skill, 'rootPath' | 'relativePath' | 'isArchived'>,
) => {
  const usesWindowsSeparators =
    skill.rootPath.includes('\\') && !skill.rootPath.includes('/');
  const separator = usesWindowsSeparators ? '\\' : '/';
  const rootPath = skill.rootPath.replace(/[\\/]+$/, '');
  const relativePath = skill.relativePath
    .replace(/^[\\/]+|[\\/]+$/g, '')
    .replaceAll(usesWindowsSeparators ? '/' : '\\', separator);

  return [
    rootPath,
    skill.isArchived ? '.archive' : null,
    relativePath,
    'SKILL.md',
  ]
    .filter(Boolean)
    .join(separator);
};

export const matchesSkillSearch = (skill: Skill, query: string) => {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) return true;

  return [skill.name, skill.description, skill.relativePath, skill.content]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(normalizedQuery);
};

export const getSkillNameCounts = (skills: Skill[]) => {
  const counts = new Map<string, number>();

  for (const skill of skills) {
    counts.set(skill.name, (counts.get(skill.name) ?? 0) + 1);
  }

  return counts;
};

export const getDuplicateSkillNames = (skills: Skill[]) => {
  const counts = getSkillNameCounts(skills);

  return new Set(
    [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([name]) => name),
  );
};

export const getSkillReviewReasons = ({
  skill,
  duplicateNames,
}: {
  skill: Skill;
  duplicateNames: Set<string>;
}) => {
  const reasons: string[] = [];

  if (!skill.isValid) {
    reasons.push('Invalid file');
  }

  if (duplicateNames.has(skill.name)) {
    reasons.push('Duplicate name');
  }

  if (skill.content.length >= LARGE_SKILL_CHARACTER_THRESHOLD) {
    reasons.push('Large instructions');
  }

  return reasons;
};

export const getLibraryHealth = (skills: Skill[]) => {
  const duplicateNames = getDuplicateSkillNames(skills);
  const totalEstimatedTokens = skills.reduce(
    (total, skill) => total + estimateSkillTokens(skill.content),
    0,
  );
  const reviewCount = skills.filter(
    skill => getSkillReviewReasons({ skill, duplicateNames }).length > 0,
  ).length;
  return {
    reviewCount,
    totalEstimatedTokens,
    duplicateCount: duplicateNames.size,
  };
};

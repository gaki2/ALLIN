import { useMemo, useState } from 'react';
import type { Skill } from './types';

export const SKILL_SOURCES = [
  {
    id: 'claude',
    name: 'Claude Code',
    path: '~/.claude/skills',
  },
  {
    id: 'agents',
    name: 'Codex',
    path: '~/.agents/skills',
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    path: '~/.config/opencode/skills',
  },
] as const;

export type SkillSourceId = (typeof SKILL_SOURCES)[number]['id'];

const HIDDEN_SKILL_SOURCES_KEY = 'rig:hidden-skill-sources:v1';
const skillSourceIds = new Set<SkillSourceId>(
  SKILL_SOURCES.map(source => source.id),
);

export const getSkillSourceIdFromPath = (
  value: string,
): SkillSourceId | null => {
  const normalizedPath = value.replaceAll('\\', '/').toLowerCase();

  if (normalizedPath.includes('/.claude/skills')) return 'claude';
  if (
    normalizedPath.includes('/.agents/skills') ||
    normalizedPath.includes('/.codex/skills')
  ) {
    return 'agents';
  }
  if (
    normalizedPath.includes('/.config/opencode/skills') ||
    normalizedPath.includes('/.opencode/skills')
  ) {
    return 'opencode';
  }

  return null;
};

export const getSkillSourceId = (
  skill: Pick<Skill, 'rootPath' | 'relativePath'>,
) => getSkillSourceIdFromPath(`${skill.rootPath}/${skill.relativePath}`);

export const isSkillSourceVisible = (
  skill: Pick<Skill, 'rootPath' | 'relativePath'>,
  hiddenSourceIds: ReadonlySet<SkillSourceId>,
) => {
  const sourceId = getSkillSourceId(skill);
  return sourceId === null || !hiddenSourceIds.has(sourceId);
};

export const parseHiddenSkillSources = (value: string | null) => {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (sourceId): sourceId is SkillSourceId =>
        typeof sourceId === 'string' &&
        skillSourceIds.has(sourceId as SkillSourceId),
    );
  } catch {
    return [];
  }
};

export const useSkillSourceVisibility = () => {
  const [hiddenSourceIdList, setHiddenSourceIdList] = useState<
    SkillSourceId[]
  >(() => {
    if (typeof window === 'undefined') return [];
    try {
      return parseHiddenSkillSources(
        window.localStorage.getItem(HIDDEN_SKILL_SOURCES_KEY),
      );
    } catch {
      return [];
    }
  });
  const hiddenSourceIds = useMemo(
    () => new Set(hiddenSourceIdList),
    [hiddenSourceIdList],
  );

  const setSourceVisible = (sourceId: SkillSourceId, isVisible: boolean) => {
    const nextIds = isVisible
      ? hiddenSourceIdList.filter(currentId => currentId !== sourceId)
      : [...new Set([...hiddenSourceIdList, sourceId])];

    try {
      window.localStorage.setItem(
        HIDDEN_SKILL_SOURCES_KEY,
        JSON.stringify(nextIds),
      );
      setHiddenSourceIdList(nextIds);
      return true;
    } catch {
      return false;
    }
  };

  return { hiddenSourceIds, setSourceVisible };
};

import { describe, expect, it } from 'vitest';
import { GLOBAL_REPOSITORY_ID } from './components/RepositorySelector';
import type { SkillRoot } from './types';
import { getVisibleRoots } from './useSkillRepositorySelection';

const roots: SkillRoot[] = [
  {
    id: 'agents-global',
    path: '/Users/test/.agents/skills',
    label: 'Codex Personal Skills',
    exists: true,
    kind: 'default',
    provider: 'agents',
    scopeId: 'global',
    scopeLabel: 'Global',
    scopeKind: 'global',
  },
  {
    id: 'project-rig',
    path: '/work/rig',
    label: 'rig',
    exists: true,
    kind: 'repository',
    provider: 'agents',
    scopeId: '/work/rig',
    scopeLabel: 'rig',
    scopeKind: 'repository',
  },
];

describe('skill project scopes', () => {
  it('shows every detected source without requiring a project selection', () => {
    expect(getVisibleRoots(roots, GLOBAL_REPOSITORY_ID)).toEqual(roots);
  });

  it('shows only the selected project root', () => {
    expect(getVisibleRoots(roots, '/work/rig').map(root => root.id)).toEqual([
      'project-rig',
    ]);
  });
});

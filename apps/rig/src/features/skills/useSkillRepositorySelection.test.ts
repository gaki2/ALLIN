import { describe, expect, it } from 'vitest';
import { GLOBAL_REPOSITORY_ID } from './components/RepositorySelector';
import type { SkillRoot } from './types';
import { getVisibleRoots } from './useSkillRepositorySelection';

const roots: SkillRoot[] = [
  {
    id: 'agents-global',
    path: '/Users/test/.agents/skills',
    label: 'Agents Global Skills',
    exists: true,
    kind: 'default',
  },
  {
    id: 'project-rig',
    path: '/work/rig',
    label: 'rig',
    exists: true,
    kind: 'repository',
  },
];

describe('skill project scopes', () => {
  it('shows every detected source without requiring a project selection', () => {
    expect(getVisibleRoots(roots, GLOBAL_REPOSITORY_ID)).toEqual(roots);
  });

  it('combines global skills with the selected project profile', () => {
    expect(getVisibleRoots(roots, 'project-rig').map(root => root.id)).toEqual([
      'agents-global',
      'project-rig',
    ]);
  });
});

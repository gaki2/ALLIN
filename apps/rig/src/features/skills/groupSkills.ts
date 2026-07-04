import type { Skill, SkillProvider } from './types';

export interface SkillGroup {
  id: string;
  scopeId: string;
  scopeLabel: string;
  name: string;
  description: string | null;
  instances: Skill[];
  providers: SkillProvider[];
  primarySkill: Skill;
}

export const groupSkills = (skills: Skill[]): SkillGroup[] => {
  const groups = new Map<string, SkillGroup>();

  for (const skill of skills) {
    const id = `${skill.scopeId}:${skill.name}`;
    const existingGroup = groups.get(id);

    if (existingGroup) {
      existingGroup.instances.push(skill);

      if (!existingGroup.providers.includes(skill.provider)) {
        existingGroup.providers.push(skill.provider);
      }

      continue;
    }

    groups.set(id, {
      id,
      scopeId: skill.scopeId,
      scopeLabel: skill.scopeLabel,
      name: skill.name,
      description: skill.description,
      instances: [skill],
      providers: [skill.provider],
      primarySkill: skill,
    });
  }

  return [...groups.values()];
};

export const providerLabels: Record<SkillProvider, string> = {
  agents: 'Agents',
  claude: 'Claude',
  openCode: 'OpenCode',
  hermes: 'Hermes',
  cursor: 'Cursor',
  repository: 'Repository',
};

export const providerOrder: SkillProvider[] = [
  'agents',
  'claude',
  'openCode',
  'hermes',
  'cursor',
  'repository',
];

import type { ProviderSkill, SkillProvider } from './types';

export interface Skill {
  id: string;
  scopeId: string;
  scopeLabel: string;
  name: string;
  description: string | null;
  providers: SkillProvider[];
  providerSkills: Partial<Record<SkillProvider, ProviderSkill>>;
}

export const buildSkills = (providerSkills: ProviderSkill[]): Skill[] => {
  const skillsById = new Map<string, Skill>();

  for (const providerSkill of providerSkills) {
    const id = `${providerSkill.scopeId}:${providerSkill.name}`;
    const existingSkill = skillsById.get(id);

    if (existingSkill) {
      existingSkill.providerSkills[providerSkill.provider] = providerSkill;

      if (!existingSkill.providers.includes(providerSkill.provider)) {
        existingSkill.providers.push(providerSkill.provider);
      }

      continue;
    }

    skillsById.set(id, {
      id,
      scopeId: providerSkill.scopeId,
      scopeLabel: providerSkill.scopeLabel,
      name: providerSkill.name,
      description: providerSkill.description,
      providers: [providerSkill.provider],
      providerSkills: {
        [providerSkill.provider]: providerSkill,
      },
    });
  }

  return [...skillsById.values()];
};

export const getProviderSkills = (skill: Skill) => {
  return providerOrder.flatMap(provider => {
    const providerSkill = skill.providerSkills[provider];
    return providerSkill ? [providerSkill] : [];
  });
};

export const getDefaultProviderSkill = (skill: Skill) => {
  return getProviderSkills(skill)[0] ?? null;
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

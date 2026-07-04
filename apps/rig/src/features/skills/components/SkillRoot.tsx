import { useState } from 'react';
import { ContentLayout } from '@/layouts/ContentLayout';
import { SidebarLayout } from '@/layouts/SidebarLayout';
import type { Skill } from '../skillModel';
import type { SkillRoot as SkillRootModel } from '../types';
import { getProviderSkills } from '../skillModel';
import { getSkillIdentity, useRemoveSkill } from '../useRemoveSkill';
import { SkillContentViewer } from './SkillContentViewer';
import { SkillSidebar } from './SkillSidebar';

interface SkillRootProps {
  roots: SkillRootModel[];
}

export const SkillRoot = ({ roots }: SkillRootProps) => {
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const { removeSkill, removingSkillId } = useRemoveSkill({
    onRemoved: removedSkill => {
      setSelectedSkill(currentSkill =>
        currentSkill &&
        getProviderSkills(currentSkill).some(
          providerSkill =>
            getSkillIdentity(providerSkill) === getSkillIdentity(removedSkill),
        )
          ? null
          : currentSkill,
      );
    },
  });

  return (
    <div className='flex min-h-0 flex-1'>
      <SidebarLayout>
        <SkillSidebar
          roots={roots}
          selectedSkill={selectedSkill}
          onSelectSkill={setSelectedSkill}
          onRemoveSkill={removeSkill}
          removingSkillId={removingSkillId}
        />
      </SidebarLayout>

      <ContentLayout>
        <SkillContentViewer skill={selectedSkill} roots={roots} />
      </ContentLayout>
    </div>
  );
};

import { useState } from 'react';
import { ContentLayout } from '@/layouts/ContentLayout';
import { SidebarLayout } from '@/layouts/SidebarLayout';
import type { SkillRoot as SkillRootModel } from '../types';
import { groupSkills, type SkillGroup } from '../groupSkills';
import { getSkillIdentity, useRemoveSkill } from '../useRemoveSkill';
import { SkillContentViewer } from './SkillContentViewer';
import { SkillSidebar } from './SkillSidebar';

interface SkillRootProps {
  roots: SkillRootModel[];
}

export const SkillRoot = ({ roots }: SkillRootProps) => {
  const [selectedSkillGroup, setSelectedSkillGroup] = useState<SkillGroup | null>(
    null,
  );
  const { removeSkill, removingSkillId } = useRemoveSkill({
    onRemoved: removedSkill => {
      setSelectedSkillGroup(currentGroup =>
        currentGroup?.instances.some(
          skill => getSkillIdentity(skill) === getSkillIdentity(removedSkill),
        )
          ? null
          : currentGroup,
      );
    },
  });

  return (
    <div className='flex min-h-0 flex-1'>
      <SidebarLayout>
        <SkillSidebar
          roots={roots}
          selectedSkillGroup={selectedSkillGroup}
          onSelectSkillGroup={setSelectedSkillGroup}
          onRemoveSkill={removeSkill}
          removingSkillId={removingSkillId}
        />
      </SidebarLayout>

      <ContentLayout>
        <SkillContentViewer
          skillGroup={selectedSkillGroup}
          roots={roots}
        />
      </ContentLayout>
    </div>
  );
};

import { cn } from '@allin/ui';
import ClaudeColor from '@lobehub/icons/es/Claude/components/Color';
import ClaudeMono from '@lobehub/icons/es/Claude/components/Mono';
import OpenAIMono from '@lobehub/icons/es/OpenAI/components/Mono';
import { Folder } from 'lucide-react';
import Image from 'next/image';
import type { SkillSourceId } from '../skillSources';

interface SkillProviderIconProps {
  sourceId: SkillSourceId | null;
  size?: number;
  tone?: 'mono' | 'brand';
  className?: string;
}

export const SkillProviderIcon = ({
  sourceId,
  size = 14,
  tone = 'mono',
  className,
}: SkillProviderIconProps) => {
  const sharedProps = {
    className: 'block',
    focusable: false,
    size,
  } as const;

  return (
    <span
      aria-hidden='true'
      className={cn(
        'inline-flex shrink-0 items-center justify-center leading-none',
        className,
      )}
      style={{ height: size, width: size }}
    >
      {sourceId === 'claude' ? (
        tone === 'brand' ? (
          <ClaudeColor {...sharedProps} />
        ) : (
          <ClaudeMono {...sharedProps} />
        )
      ) : sourceId === 'agents' ? (
        <OpenAIMono {...sharedProps} />
      ) : sourceId === 'opencode' ? (
        <>
          <Image
            alt=''
            src='/application_icon/opencode-light.webp'
            height={size}
            unoptimized
            width={size}
            className='block size-full object-contain dark:hidden'
          />
          <Image
            alt=''
            src='/application_icon/opencode-dark.webp'
            height={size}
            unoptimized
            width={size}
            className='hidden size-full object-contain dark:block'
          />
        </>
      ) : (
        <Folder size={size} />
      )}
    </span>
  );
};

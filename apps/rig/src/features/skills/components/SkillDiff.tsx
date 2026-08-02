import { parseDiffFromFile } from '@pierre/diffs';
import { FileDiff } from '@pierre/diffs/react';
import { useEffect, useMemo, useState } from 'react';

export const SkillDiff = ({
  before,
  after,
}: {
  before: string;
  after: string;
}) => {
  const [themeType, setThemeType] = useState<'light' | 'dark'>('light');
  const fileDiff = useMemo(
    () =>
      parseDiffFromFile(
        { name: 'SKILL.md', contents: before, lang: 'markdown' },
        { name: 'SKILL.md', contents: after, lang: 'markdown' },
      ),
    [after, before],
  );

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () =>
      setThemeType(root.classList.contains('dark') ? 'dark' : 'light');
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return (
    <div className='overflow-hidden rounded-xl border bg-card text-xs [&_[data-diffs]]:font-mono'>
      <FileDiff
        fileDiff={fileDiff}
        disableWorkerPool
        options={{
          diffStyle: 'unified',
          diffIndicators: 'bars',
          lineDiffType: 'word',
          overflow: 'wrap',
          themeType,
          disableVirtualizationBuffers: true,
        }}
      />
    </div>
  );
};

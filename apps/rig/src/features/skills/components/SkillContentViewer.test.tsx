import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SkillMarkdown } from './SkillContentViewer';

describe('SkillMarkdown', () => {
  it('renders GFM while excluding executable HTML', () => {
    const { container } = render(
      <SkillMarkdown
        content={
          '# Safe heading\n\n- [x] Complete\n\n<script>window.hacked = true</script>'
        }
      />,
    );

    expect(container.querySelector('h1')?.textContent).toBe('Safe heading');
    expect(container.querySelector('input[type="checkbox"]')).not.toBeNull();
    expect(container.querySelector('script')).toBeNull();
  });
});

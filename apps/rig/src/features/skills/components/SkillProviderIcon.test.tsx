import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SkillProviderIcon } from './SkillProviderIcon';

describe('SkillProviderIcon', () => {
  it('renders provider marks as decorative', () => {
    const markup = renderToStaticMarkup(
      <SkillProviderIcon sourceId='claude' size={12} />,
    );

    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('<svg');
  });

  it('uses the bundled OpenCode theme assets', () => {
    const markup = renderToStaticMarkup(
      <SkillProviderIcon sourceId='opencode' />,
    );

    expect(markup).toContain('/application_icon/opencode-light.webp');
    expect(markup).toContain('/application_icon/opencode-dark.webp');
  });

  it('falls back to a folder for imported repositories', () => {
    const markup = renderToStaticMarkup(<SkillProviderIcon sourceId={null} />);

    expect(markup).toContain('lucide-folder');
  });
});

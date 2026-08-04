import { describe, expect, it } from 'vitest';
import { getUpdateErrorMessage } from './errors';

describe('getUpdateErrorMessage', () => {
  it('keeps a Tauri command rejection string', () => {
    expect(
      getUpdateErrorMessage(
        'Update check failed: HTTP 404 from update endpoint',
        'Could not check for updates.',
      ),
    ).toBe('Update check failed: HTTP 404 from update endpoint');
  });

  it('keeps an Error message', () => {
    expect(
      getUpdateErrorMessage(
        new Error('Update install failed: invalid signature'),
        'Could not install the update.',
      ),
    ).toBe('Update install failed: invalid signature');
  });

  it('uses a stable fallback for unknown failures', () => {
    expect(getUpdateErrorMessage({}, 'Could not check for updates.')).toBe(
      'Could not check for updates.',
    );
  });
});

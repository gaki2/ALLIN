import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import { mapSkillHistoryError } from './api';

describe('skill history errors', () => {
  it('keeps the backend update message through Effect', async () => {
    const error = mapSkillHistoryError({
      code: 'updateFailed',
      message: 'Rig could not find npx. Install Node.js and restart Rig.',
    });

    expect(error.kind).toBe('SkillHistoryError');
    await expect(Effect.runPromise(Effect.fail(error))).rejects.toMatchObject({
      message: 'Rig could not find npx. Install Node.js and restart Rig.',
    });
  });

  it('uses a stable message for unknown invoke failures', () => {
    expect(mapSkillHistoryError({ unexpected: true }).message).toBe(
      'Rig could not complete this skill action.',
    );
  });
});

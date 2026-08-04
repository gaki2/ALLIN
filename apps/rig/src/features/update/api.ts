import { invoke } from '@tauri-apps/api/core';
import { Data, Effect } from 'effect';
import { getUpdateErrorMessage } from './errors';
import { UpdateMetadataSchema } from './types';

export class FetchUpdateError extends Data.TaggedError('FetchUpdateError')<{
  kind: 'InvokeError' | 'ZodParseError';
  cause: unknown;
  message: string;
}> {}

export const fetchUpdate = Effect.fn('fetchUpdate')(function* () {
  const result = yield* Effect.tryPromise({
    try: () => invoke<unknown>('fetch_update'),
    catch: error =>
      new FetchUpdateError({
        kind: 'InvokeError',
        cause: error,
        message: getUpdateErrorMessage(
          error,
          'Could not reach the update service. Check your connection and try again.',
        ),
      }),
  });

  if (result == null) {
    return null;
  }

  return yield* Effect.try({
    try: () => UpdateMetadataSchema.parse(result),
    catch: error =>
      new FetchUpdateError({
        kind: 'ZodParseError',
        cause: error,
        message: 'The update service returned an invalid response.',
      }),
  });
});

export class InstallUpdateError extends Data.TaggedError('InstallUpdateError')<{
  kind: 'InvokeError';
  cause: unknown;
  message: string;
}> {}

export const installUpdate = Effect.fn('installUpdate')(function* () {
  yield* Effect.tryPromise({
    try: () => invoke<void>('install_update'),
    catch: error =>
      new InstallUpdateError({
        kind: 'InvokeError',
        cause: error,
        message: getUpdateErrorMessage(
          error,
          'Could not install the update. Try again or reinstall Rig.',
        ),
      }),
  });
});

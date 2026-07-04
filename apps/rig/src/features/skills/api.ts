import { invoke } from '@tauri-apps/api/core';
import { Data, Effect } from 'effect';
import {
  type BucketType,
  SkillCopyErrorSchema,
  SkillDeletionErrorSchema,
  SkillListingErrorSchema,
  SkillRootImportErrorSchema,
  SkillRootSchema,
  SkillSchema,
  SkillUsageErrorSchema,
  SkillUsageEventSchema,
  SkillUsageSchema,
  SkillUsageSeriesSchema,
  type SkillRoot,
  type WindowType,
} from './types';

export class ListSkillRootsError extends Data.TaggedError(
  'ListSkillRootsError',
)<{
  kind: 'InvokeError' | 'ZodParseError';
  cause: unknown;
}> {}

export const listSkillRoots = Effect.fn('listSkillRoots')(function* () {
  const result = yield* Effect.tryPromise({
    try: () => invoke<unknown>('list_skill_roots'),
    catch: error =>
      new ListSkillRootsError({ kind: 'InvokeError', cause: error }),
  });

  return yield* Effect.try({
    try: () => SkillRootSchema.array().parse(result),
    catch: error =>
      new ListSkillRootsError({ kind: 'ZodParseError', cause: error }),
  });
});

export class ImportSkillRootError extends Data.TaggedError(
  'ImportSkillRootError',
)<{
  kind: 'InvokeError' | 'SkillRootImportError' | 'ZodParseError';
  cause: unknown;
}> {}

export const importSkillRoot = Effect.fn('importSkillRoot')(function* (
  path: string,
) {
  const result = yield* Effect.tryPromise({
    try: () => invoke<unknown>('import_skill_root', { path }),
    catch: error => error,
  }).pipe(
    Effect.catchAll(error => {
      const importError = SkillRootImportErrorSchema.safeParse(error);

      if (importError.success) {
        return Effect.fail(
          new ImportSkillRootError({
            kind: 'SkillRootImportError',
            cause: importError.data,
          }),
        );
      }

      return Effect.fail(
        new ImportSkillRootError({ kind: 'InvokeError', cause: error }),
      );
    }),
  );

  return yield* Effect.try({
    try: () => SkillRootSchema.parse(result),
    catch: error =>
      new ImportSkillRootError({ kind: 'ZodParseError', cause: error }),
  });
});

export class RemoveSkillRootError extends Data.TaggedError(
  'RemoveSkillRootError',
)<{
  kind: 'InvokeError' | 'SkillRootImportError';
  cause: unknown;
}> {}

export const removeSkillRoot = Effect.fn('removeSkillRoot')(function* (
  rootId: string,
) {
  yield* Effect.tryPromise({
    try: () => invoke<void>('remove_skill_root', { rootId }),
    catch: error => error,
  }).pipe(
    Effect.catchAll(error => {
      const removeError = SkillRootImportErrorSchema.safeParse(error);

      if (removeError.success) {
        return Effect.fail(
          new RemoveSkillRootError({
            kind: 'SkillRootImportError',
            cause: removeError.data,
          }),
        );
      }

      return Effect.fail(
        new RemoveSkillRootError({ kind: 'InvokeError', cause: error }),
      );
    }),
  );
});

export class ListSkillsError extends Data.TaggedError('ListSkillsError')<{
  kind: 'InvokeError' | 'SkillListingError' | 'ZodParseError';
  rootPath: string;
  cause: unknown;
}> {}

// some users don't have claude folder, so we ignore these errors
const ignoredSkillListingErrorCodes = new Set(['pathNotFound', 'notDirectory']);

export const listSkills = Effect.fn('listSkills')(function* (root: SkillRoot) {
  const result = yield* Effect.tryPromise({
    try: () => invoke<unknown>('list_skills', { root }),
    catch: error => error,
  }).pipe(
    Effect.catchAll(error => {
      const listingError = SkillListingErrorSchema.safeParse(error);

      if (
        listingError.success &&
        ignoredSkillListingErrorCodes.has(listingError.data.code)
      ) {
        return Effect.succeed([]);
      }

      if (listingError.success) {
        return Effect.fail(
          new ListSkillsError({
            kind: 'SkillListingError',
            rootPath: root.path,
            cause: listingError.data,
          }),
        );
      }

      return Effect.fail(
        new ListSkillsError({
          kind: 'InvokeError',
          rootPath: root.path,
          cause: error,
        }),
      );
    }),
  );

  return yield* Effect.try({
    try: () => SkillSchema.array().parse(result),
    catch: error =>
      new ListSkillsError({
        kind: 'ZodParseError',
        rootPath: root.path,
        cause: error,
      }),
  });
});

export class CopySkillError extends Data.TaggedError('CopySkillError')<{
  kind: 'InvokeError' | 'SkillCopyError';
  cause: unknown;
}> {}

export const copySkill = Effect.fn('copySkill')(function* ({
  sourceRootPath,
  sourceRelativePath,
  targetRootPath,
  targetRelativePath,
}: {
  sourceRootPath: string;
  sourceRelativePath: string;
  targetRootPath: string;
  targetRelativePath: string;
}) {
  yield* Effect.tryPromise({
    try: () =>
      invoke<void>('copy_skill', {
        sourceRootPath,
        sourceRelativePath,
        targetRootPath,
        targetRelativePath,
      }),
    catch: error => error,
  }).pipe(
    Effect.catchAll(error => {
      const copyError = SkillCopyErrorSchema.safeParse(error);

      if (copyError.success) {
        return Effect.fail(
          new CopySkillError({
            kind: 'SkillCopyError',
            cause: copyError.data,
          }),
        );
      }

      return Effect.fail(new CopySkillError({ kind: 'InvokeError', cause: error }));
    }),
  );
});

export class RemoveSkillError extends Data.TaggedError('RemoveSkillError')<{
  kind: 'InvokeError' | 'SkillDeletionError';
  cause: unknown;
}> {}

export const removeSkill = Effect.fn('removeSkill')(function* ({
  rootPath,
  relativePath,
}: {
  rootPath: string;
  relativePath: string;
}) {
  yield* Effect.tryPromise({
    try: () => invoke<void>('remove_skill', { rootPath, relativePath }),
    catch: error => error,
  }).pipe(
    Effect.catchAll(error => {
      const deletionError = SkillDeletionErrorSchema.safeParse(error);

      if (deletionError.success) {
        return Effect.fail(
          new RemoveSkillError({
            kind: 'SkillDeletionError',
            cause: deletionError.data,
          }),
        );
      }

      return Effect.fail(
        new RemoveSkillError({ kind: 'InvokeError', cause: error }),
      );
    }),
  );
});

export class ListSkillUsagesError extends Data.TaggedError(
  'ListSkillUsagesError',
)<{
  kind: 'InvokeError' | 'SkillUsageError' | 'ZodParseError';
  cause: unknown;
}> {}

export const listSkillUsages = Effect.fn('listSkillUsages')(function* (
  window?: WindowType,
) {
  const result = yield* Effect.tryPromise({
    try: () => invoke<unknown>('list_skill_usages', { window }),
    catch: error => error,
  }).pipe(
    Effect.catchAll(error => {
      const usageError = SkillUsageErrorSchema.safeParse(error);

      if (usageError.success) {
        return Effect.fail(
          new ListSkillUsagesError({
            kind: 'SkillUsageError',
            cause: usageError.data,
          }),
        );
      }

      return Effect.fail(
        new ListSkillUsagesError({ kind: 'InvokeError', cause: error }),
      );
    }),
  );

  return yield* Effect.try({
    try: () => SkillUsageSchema.array().parse(result),
    catch: error =>
      new ListSkillUsagesError({ kind: 'ZodParseError', cause: error }),
  });
});

export class ListSkillUsageEventsError extends Data.TaggedError(
  'ListSkillUsageEventsError',
)<{
  kind: 'InvokeError' | 'SkillUsageError' | 'ZodParseError';
  cause: unknown;
}> {}

export const listSkillUsageEvents = Effect.fn('listSkillUsageEvents')(
  function* (skillName: string, limit?: number) {
    const result = yield* Effect.tryPromise({
      try: () =>
        invoke<unknown>('list_skill_usage_events', { skillName, limit }),
      catch: error => error,
    }).pipe(
      Effect.catchAll(error => {
        const usageError = SkillUsageErrorSchema.safeParse(error);

        if (usageError.success) {
          return Effect.fail(
            new ListSkillUsageEventsError({
              kind: 'SkillUsageError',
              cause: usageError.data,
            }),
          );
        }

        return Effect.fail(
          new ListSkillUsageEventsError({
            kind: 'InvokeError',
            cause: error,
          }),
        );
      }),
    );

    return yield* Effect.try({
      try: () => SkillUsageEventSchema.array().parse(result),
      catch: error =>
        new ListSkillUsageEventsError({ kind: 'ZodParseError', cause: error }),
    });
  },
);

export class ListSkillUsagesTendencyError extends Data.TaggedError(
  'ListSkillUsagesTendencyError',
)<{
  kind: 'InvokeError' | 'SkillUsageError' | 'ZodParseError';
  cause: unknown;
}> {}

export const listSkillUsagesTendency = Effect.fn('listSkillUsagesTendency')(
  function* (window?: WindowType, bucketType?: BucketType) {
    const result = yield* Effect.tryPromise({
      try: () =>
        invoke<unknown>('list_skill_usages_tendency', { window, bucketType }),
      catch: error => error,
    }).pipe(
      Effect.catchAll(error => {
        const usageError = SkillUsageErrorSchema.safeParse(error);

        if (usageError.success) {
          return Effect.fail(
            new ListSkillUsagesTendencyError({
              kind: 'SkillUsageError',
              cause: usageError.data,
            }),
          );
        }

        return Effect.fail(
          new ListSkillUsagesTendencyError({
            kind: 'InvokeError',
            cause: error,
          }),
        );
      }),
    );

    return yield* Effect.try({
      try: () => SkillUsageSeriesSchema.array().parse(result),
      catch: error =>
        new ListSkillUsagesTendencyError({
          kind: 'ZodParseError',
          cause: error,
        }),
    });
  },
);

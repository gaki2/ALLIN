import { z } from 'zod';

export const SkillRootKindSchema = z.enum(['default', 'repository']);

export const SkillRootSchema = z.object({
  id: z.string(),
  path: z.string(),
  label: z.string(),
  exists: z.boolean(),
  kind: SkillRootKindSchema,
});

export const SkillValidationErrorCodeSchema = z.enum([
  'missingSkillFile',
  'emptySkillFile',
  'emptyContent',
  'invalidUtf8',
  'readFailed',
  'notDirectory',
  'outsideRoot',
  'missingFrontMatter',
  'invalidFrontMatter',
]);

export const SkillValidationErrorSchema = z.object({
  code: SkillValidationErrorCodeSchema,
  message: z.string(),
});

export const SkillListingErrorCodeSchema = z.enum([
  'pathNotFound',
  'notDirectory',
  'readFailed',
]);

export const SkillListingErrorSchema = z.object({
  code: SkillListingErrorCodeSchema,
  message: z.string(),
});

export const SkillDeletionErrorCodeSchema = z.enum([
  'pathNotFound',
  'notDirectory',
  'outsideRoot',
  'missingSkillFile',
  'deleteFailed',
]);

export const SkillDeletionErrorSchema = z.object({
  code: SkillDeletionErrorCodeSchema,
  message: z.string(),
});

export const SkillArchiveErrorCodeSchema = z.enum([
  'pathNotFound',
  'notDirectory',
  'outsideRoot',
  'missingSkillFile',
  'alreadyExists',
  'moveFailed',
]);

export const SkillArchiveErrorSchema = z.object({
  code: SkillArchiveErrorCodeSchema,
  message: z.string(),
});

export const SkillRootImportErrorCodeSchema = z.enum([
  'pathNotFound',
  'notDirectory',
  'duplicateId',
  'notFound',
  'readFailed',
  'writeFailed',
]);

export const SkillRootImportErrorSchema = z.object({
  code: SkillRootImportErrorCodeSchema,
  message: z.string(),
});

export const SkillUsageErrorCodeSchema = z.enum(['readFailed']);

export const SkillUsageErrorSchema = z.object({
  code: SkillUsageErrorCodeSchema,
  message: z.string(),
});

export const WindowTypeSchema = z.enum([
  'day',
  'week',
  'month',
  'threeMonths',
  'year',
  'all',
]);

export const BucketTypeSchema = z.enum(['hour', 'day', 'month']);

export const SkillSchema = z.object({
  id: z.string(),
  name: z.string(),
  rootPath: z.string(),
  relativePath: z.string(),
  content: z.string(),
  description: z.string().nullable(),
  isValid: z.boolean(),
  validationError: SkillValidationErrorSchema.nullable(),
  updatedAt: z.string().nullable(),
  isArchived: z.boolean(),
});

export const SkillUsageSchema = z.object({
  name: z.string(),
  count: z.number(),
  lastUsedAt: z.string().nullable(),
});

export const SkillUsageEventSchema = z.object({
  name: z.string(),
  source: z.string(),
  usedAt: z.string(),
});

export const SkillUsageSeriesSchema = z.object({
  name: z.string(),
  series: z.number().array(),
});

export const SkillUpdateStateSchema = z.enum([
  'current',
  'updateAvailable',
  'checkUnavailable',
]);

export const SkillUpdateStatusSchema = z.object({
  name: z.string(),
  source: z.string(),
  sourceUrl: z.string().nullable(),
  installPath: z.string(),
  state: SkillUpdateStateSchema,
  checkedAt: z.string(),
  message: z.string().nullable(),
});

export const SkillVersionActionSchema = z.enum([
  'beforeUpdate',
  'updated',
  'beforeRestore',
  'restored',
]);

export const SkillVersionSummarySchema = z.object({
  id: z.string(),
  skillName: z.string(),
  createdAt: z.string(),
  action: SkillVersionActionSchema,
  label: z.string(),
  contentHash: z.string(),
});

export const SkillVersionDetailSchema = SkillVersionSummarySchema.extend({
  content: z.string(),
});

export const SkillUpdateResultSchema = z.object({
  version: SkillVersionSummarySchema,
});

export const SkillHistoryErrorSchema = z.object({
  code: z.enum([
    'invalidPath',
    'notTracked',
    'snapshotFailed',
    'updateFailed',
    'validationFailed',
    'versionNotFound',
    'restoreFailed',
  ]),
  message: z.string(),
});

export type SkillRoot = z.infer<typeof SkillRootSchema>;
export type SkillRootKind = z.infer<typeof SkillRootKindSchema>;
export type SkillValidationErrorCode = z.infer<
  typeof SkillValidationErrorCodeSchema
>;
export type SkillValidationError = z.infer<typeof SkillValidationErrorSchema>;
export type SkillListingErrorCode = z.infer<typeof SkillListingErrorCodeSchema>;
export type SkillListingError = z.infer<typeof SkillListingErrorSchema>;
export type SkillDeletionErrorCode = z.infer<
  typeof SkillDeletionErrorCodeSchema
>;
export type SkillDeletionError = z.infer<typeof SkillDeletionErrorSchema>;
export type SkillArchiveErrorCode = z.infer<typeof SkillArchiveErrorCodeSchema>;
export type SkillArchiveError = z.infer<typeof SkillArchiveErrorSchema>;
export type SkillRootImportErrorCode = z.infer<
  typeof SkillRootImportErrorCodeSchema
>;
export type SkillRootImportError = z.infer<typeof SkillRootImportErrorSchema>;
export type Skill = z.infer<typeof SkillSchema>;
export type SkillUsageErrorCode = z.infer<typeof SkillUsageErrorCodeSchema>;
export type SkillUsageError = z.infer<typeof SkillUsageErrorSchema>;
export type WindowType = z.infer<typeof WindowTypeSchema>;
export type BucketType = z.infer<typeof BucketTypeSchema>;
export type SkillUsage = z.infer<typeof SkillUsageSchema>;
export type SkillUsageEvent = z.infer<typeof SkillUsageEventSchema>;
export type SkillUsageSeries = z.infer<typeof SkillUsageSeriesSchema>;
export type SkillUpdateState = z.infer<typeof SkillUpdateStateSchema>;
export type SkillUpdateStatus = z.infer<typeof SkillUpdateStatusSchema>;
export type SkillVersionAction = z.infer<typeof SkillVersionActionSchema>;
export type SkillVersionSummary = z.infer<typeof SkillVersionSummarySchema>;
export type SkillVersionDetail = z.infer<typeof SkillVersionDetailSchema>;
export type SkillHistoryError = z.infer<typeof SkillHistoryErrorSchema>;
export type SkillManagementView = 'review' | 'updates' | 'archived';

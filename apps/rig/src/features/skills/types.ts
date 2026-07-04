import { z } from 'zod';

export const SkillRootKindSchema = z.enum(['default', 'repository']);

export const SkillProviderSchema = z.enum([
  'agents',
  'claude',
  'openCode',
  'hermes',
  'cursor',
  'repository',
]);

export const SkillScopeKindSchema = z.enum(['global', 'repository']);

export const SkillRootSchema = z.object({
  id: z.string(),
  path: z.string(),
  label: z.string(),
  exists: z.boolean(),
  kind: SkillRootKindSchema,
  provider: SkillProviderSchema,
  scopeId: z.string(),
  scopeLabel: z.string(),
  scopeKind: SkillScopeKindSchema,
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
  provider: SkillProviderSchema,
  scopeId: z.string(),
  scopeLabel: z.string(),
  scopeKind: SkillScopeKindSchema,
  rootId: z.string(),
  rootLabel: z.string(),
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

export type SkillRoot = z.infer<typeof SkillRootSchema>;
export type SkillRootKind = z.infer<typeof SkillRootKindSchema>;
export type SkillProvider = z.infer<typeof SkillProviderSchema>;
export type SkillScopeKind = z.infer<typeof SkillScopeKindSchema>;
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

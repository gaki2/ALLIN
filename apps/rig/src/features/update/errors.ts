const getMessage = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  if (value instanceof Error && value.message.trim().length > 0) {
    return value.message.trim();
  }

  if (
    value != null &&
    typeof value === 'object' &&
    'message' in value &&
    typeof value.message === 'string' &&
    value.message.trim().length > 0
  ) {
    return value.message.trim();
  }

  return null;
};

export const getUpdateErrorMessage = (
  cause: unknown,
  fallback: string,
): string => getMessage(cause) ?? fallback;

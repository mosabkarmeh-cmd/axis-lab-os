export const errorMessage = (err: unknown) =>
  err instanceof Error ? err.message : String(err);

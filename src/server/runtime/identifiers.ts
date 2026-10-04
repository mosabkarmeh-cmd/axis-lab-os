export function idNum(prefixedId: unknown, prefix: string): number | null {
  if (prefixedId === null || prefixedId === undefined) return null;
  const value = parseInt(String(prefixedId).replace(prefix, ""), 10);
  return Number.isNaN(value) ? null : value;
}

import { createHash } from 'node:crypto';
export function canonicalJSON(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonicalJSON).join(',') + ']';
  if (value && typeof value === 'object')
    return (
      '{' +
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => JSON.stringify(k) + ':' + canonicalJSON(v))
        .join(',') +
      '}'
    );
  return JSON.stringify(value);
}
export function recordsHash<T extends { code: string }>(records: T[]): string {
  return createHash('sha256')
    .update(canonicalJSON([...records].sort((a, b) => a.code.localeCompare(b.code))) + '\n')
    .digest('hex');
}
export function assertImmutableSnapshot(
  existing: { code: string }[],
  incoming: { code: string }[],
): void {
  if (recordsHash(existing) !== recordsHash(incoming))
    throw Error(
      'Immutable snapshot collision: create a new version instead of overwriting records',
    );
}

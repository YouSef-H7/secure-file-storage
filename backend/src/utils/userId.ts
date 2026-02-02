/**
 * Normalize OIDC user ID (sub) so IdP casing variants match.
 * E.g. #ext# and #EXT# become #EXT# so session and file metadata compare equal.
 */
export function normalizeUserId(id: string): string {
  if (typeof id !== 'string') return String(id);
  return id.replace(/#ext#/gi, '#EXT#');
}

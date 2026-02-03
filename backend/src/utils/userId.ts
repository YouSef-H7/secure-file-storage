/**
 * Normalize OIDC user ID (sub) so IdP casing variants match.
 * E.g. #ext# and #EXT# become #EXT# so session and file metadata compare equal.
 * Handles null/undefined and ensures consistent format for matching.
 */
export function normalizeUserId(id: string | null | undefined): string {
  if (!id) return '';
  if (typeof id !== 'string') return String(id);
  // Normalize #ext# variants to canonical #EXT# format
  return id.replace(/#ext#/gi, '#EXT#');
}

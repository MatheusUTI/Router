/**
 * Safe occurrence code normalization helper for lookups.
 * Preserves the original string representation, including leading zeros.
 * Generates trim and numeric pad variations for robust matching against databases and maps.
 */
export function normalizeOccurrenceCodeForLookup(rawCode: string | undefined | null): string[] {
  if (rawCode === undefined || rawCode === null) return [];
  const clean = String(rawCode).trim();
  if (clean === '') return [];

  const candidates = new Set<string>();
  candidates.add(clean);
  candidates.add(clean.toUpperCase());

  // If numeric, add variations with padding and unpadded
  if (/^\d+$/.test(clean)) {
    const numValue = parseInt(clean, 10);
    candidates.add(String(numValue)); // e.g., "3"
    candidates.add(String(numValue).padStart(2, '0')); // e.g., "03"
    candidates.add(String(numValue).padStart(3, '0')); // e.g., "003"
    candidates.add(String(numValue).padStart(4, '0')); // e.g., "0003"
  }

  return Array.from(candidates);
}

// ============================================================================
// Footy Oracle Club — Member Identity shared PURE helpers (unit-tested).
// Handle normalisation/validation lives here so the edge functions and tests
// share one source of truth. Mirrors the SQL generate_unique_handle rules.
// ============================================================================

export const RESERVED_HANDLES = new Set([
  '@thegaffer', '@system', '@admin', '@gaffer', '@footyoracle', '@mod', '@support',
]);

/** Lowercase, trim, ensure a single leading '@'. */
export function normalizeHandle(input: string): string {
  const h = (input ?? '').trim().toLowerCase().replace(/^@+/, '');
  return '@' + h;
}

export interface HandleValidation {
  ok: boolean;
  handle?: string;     // normalised, on success
  error?: string;
}

/**
 * Validate a user-chosen handle.
 * Rules: 3–20 chars after '@', starts with a letter, then [a-z0-9_-].
 * Rejects reserved handles.
 */
export function validateHandle(input: string): HandleValidation {
  if (!input || typeof input !== 'string') return { ok: false, error: 'handle_required' };
  const handle = normalizeHandle(input);
  const body = handle.slice(1);
  if (body.length < 3 || body.length > 20) return { ok: false, error: 'handle_length' };
  if (!/^[a-z][a-z0-9_-]{2,19}$/.test(body)) return { ok: false, error: 'handle_format' };
  if (RESERVED_HANDLES.has(handle)) return { ok: false, error: 'handle_reserved' };
  return { ok: true, handle };
}

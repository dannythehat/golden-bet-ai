/**
 * Some AI-generated blog rows stored the raw LLM JSON envelope
 *   { "title": "...", "excerpt": "...", "content": "..." }
 * directly into a column instead of the parsed field. These helpers strip that
 * wrapper at render time so users never see raw JSON, regardless of which
 * generator produced the row. Robust to code fences, escaped quotes, and
 * truncated/invalid JSON.
 */

type Field = 'title' | 'excerpt' | 'content';

/** Remove a surrounding ```json ... ``` (or ``` ... ```) code fence. */
function stripFences(s: string): string {
  const fence = s.match(/^```(?:json|html)?\s*([\s\S]*?)\s*```$/i);
  return fence ? fence[1].trim() : s;
}

function looksLikeJsonEnvelope(s: string): boolean {
  return s.startsWith('{') &&
    (s.includes('"title"') || s.includes('"excerpt"') || s.includes('"content"'));
}

function unescape(v: string): string {
  return v
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .trim();
}

/**
 * Extract a clean field value. Prefers the requested field, then sensible
 * fallbacks. Never returns a raw JSON blob.
 */
export function cleanAiText(raw: string | null | undefined, prefer: Field = 'excerpt'): string {
  if (!raw) return '';
  const s = stripFences(String(raw).trim());
  if (!looksLikeJsonEnvelope(s)) return s;

  const order: Field[] = [prefer, 'excerpt', 'title', 'content'].filter(
    (v, i, a) => a.indexOf(v) === i,
  ) as Field[];

  // 1) Strict parse (works when the stored value is valid JSON).
  try {
    const parsed = JSON.parse(s) as Partial<Record<Field, unknown>>;
    for (const key of order) {
      const val = parsed[key];
      if (typeof val === 'string' && val.trim()) return val.trim();
    }
  } catch {
    // 2) Invalid/truncated JSON: extract the field with a quote-aware regex.
    for (const key of order) {
      const m = s.match(new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`));
      if (m && m[1].trim()) return unescape(m[1]);
    }
    // 3) Truncated value with no closing quote — grab what we can.
    for (const key of order) {
      const m = s.match(new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)+)$`));
      if (m && m[1].trim()) return unescape(m[1]).replace(/[,{}\s]+$/, '');
    }
  }
  // 4) Last resort: drop the leading `{ "key": "` so we never show JSON.
  const fallback = s.replace(/^\{[\s\S]*?"\s*:\s*"/, '').replace(/"[\s,}]*$/, '').trim();
  return fallback || s;
}

/** Convenience wrappers. */
export const cleanTitle = (raw: string | null | undefined) => cleanAiText(raw, 'title');
export const cleanExcerpt = (raw: string | null | undefined) => cleanAiText(raw, 'excerpt');

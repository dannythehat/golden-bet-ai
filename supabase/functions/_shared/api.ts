// Shared response envelope + CORS for the Footy Oracle fantasy edge functions.
// Every function returns ApiResponse<T> per docs/DATA_CONTRACTS.md.
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function ok<T>(data: T, meta?: Record<string, unknown>): Response {
  return new Response(JSON.stringify({ ok: true, data, ...(meta ? { meta } : {}) }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function fail(code: string, message: string, status = 400, details?: Record<string, unknown>): Response {
  return new Response(JSON.stringify({ ok: false, error: { code, message, ...(details ? { details } : {}) } }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Handle CORS preflight; returns a Response for OPTIONS, else null. */
export function preflight(req: Request): Response | null {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return null;
}

export async function readBody<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

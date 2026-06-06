import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type WCKind = "team_review" | "group_preview" | "match_tip" | "tournament_intro";

export function useWCContent<T = any>(kind: WCKind, key: string, context?: Record<string, unknown>, autoFetch = true) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContent = useCallback(async (force = false) => {
    if (!key) return;
    setLoading(true);
    setError(null);
    try {
      // Try cache first via direct query (faster than always calling the function)
      if (!force) {
        const { data: cached } = await supabase
          .from("wc_content")
          .select("content")
          .eq("kind", kind)
          .eq("key", key)
          .maybeSingle();
        if (cached?.content) {
          setData(cached.content as T);
          setLoading(false);
          return;
        }
      }
      const { data: res, error: fnErr } = await supabase.functions.invoke("gaffer-wc", {
        body: { kind, key, context, force },
      });
      if (fnErr) throw fnErr;
      setData(res as T);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [kind, key, JSON.stringify(context)]);

  useEffect(() => {
    if (autoFetch) fetchContent(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, key]);

  return { data, loading, error, refresh: () => fetchContent(true) };
}

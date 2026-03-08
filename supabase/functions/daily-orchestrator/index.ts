import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Daily Orchestrator
 * 
 * Calls each daily edge function in sequence using direct HTTP fetch.
 * This replaces the unreliable pg_cron → net.http_post pattern which
 * silently drops requests.
 * 
 * Schedule: Called by pg_cron every minute. Checks the current UTC hour/minute
 * and dispatches the appropriate function(s).
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface TaskResult {
  name: string;
  status: number;
  ok: boolean;
  duration_ms: number;
  error?: string;
}

async function callFunction(name: string, body: Record<string, unknown> = {}, queryParams = ""): Promise<TaskResult> {
  const url = `${SUPABASE_URL}/functions/v1/${name}${queryParams}`;
  const start = Date.now();
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000); // 2 min timeout
    
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    
    // Consume the body to prevent resource leaks
    const text = await res.text();
    const duration_ms = Date.now() - start;
    
    console.log(`✅ ${name}: ${res.status} (${duration_ms}ms)${res.ok ? '' : ' — ' + text.slice(0, 200)}`);
    
    return { name, status: res.status, ok: res.ok, duration_ms };
  } catch (err) {
    const duration_ms = Date.now() - start;
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`❌ ${name}: FAILED (${duration_ms}ms) — ${errMsg}`);
    return { name, status: 0, ok: false, duration_ms, error: errMsg };
  }
}

// Define the schedule: UTC hour → minute → tasks
// Each task is [functionName, body, queryParams?]
type Task = [string, Record<string, unknown>, string?];

const SCHEDULE: Record<number, Record<number, Task[]>> = {
  // 03:00 - Ingest yesterday's results
  3: {
    0: [
      ["ml-ingest-results", { source: "cron" }],
      ["ml-daily-learn", { scheduled: true }],
    ],
    30: [
      ["sportmonks-compute-features", { scheduled: true }],
    ],
  },
  // 04:00 - Stats + ML training
  4: {
    0: [
      ["populate-stats", { triggered_by: "cron" }],
      ["populate-stats", {}, "?region=uk"],
      ["ml-train-engine", { scheduled: true }],
    ],
    5: [
      ["populate-stats", {}, "?region=european_1"],
    ],
    10: [
      ["populate-stats", {}, "?region=european_2"],
    ],
    15: [
      ["populate-stats", {}, "?region=european_3"],
    ],
    20: [
      ["populate-stats", {}, "?region=asia"],
    ],
    25: [
      ["populate-stats", {}, "?region=americas"],
    ],
    30: [
      ["compute-rolling-stats", { scheduled: true }],
    ],
    33: [
      ["compute-league-stats", { scheduled: true }],
    ],
    35: [
      ["match-intelligence", { scheduled: true }],
    ],
    40: [
      ["match-power-scores", { scheduled: true }],
      ["ml-value-engine", { scheduled: true }],
      ["gaffer-alerts", { scheduled: true }],
    ],
  },
  // 05:00 - Pick generation
  5: {
    0: [
      ["golden-bets", { scheduled: true }],
    ],
    5: [
      ["bet-builder", { scheduled: true }],
    ],
    15: [
      ["acca-builder", { scheduled: true }],
    ],
    // 05:20 - Morning briefing
    20: [
      ["generate-blog-post", { type: "morning-briefing", auto: true }],
    ],
    // 05:30 - More blog content
    30: [
      ["generate-blog-post", { type: "match-preview", auto: true }],
      ["generate-blog-post", { type: "ai-ml-insight", auto: true }],
      ["generate-blog-post", { type: "funny-story", auto: true }],
    ],
  },
  // 06:00 - Match reports & recaps
  6: {
    0: [
      ["gaffer-match-reports", { scheduled: true }],
    ],
    15: [
      ["gaffer-results-recap", { scheduled: true }],
    ],
  // 06:30 - Email digest
    30: [
      ["email-blog-digest", { scheduled: true }],
    ],
  },
  // 09:30 - Gaffer's Golden Picks article + Form Table Intel
  9: {
    30: [
      ["gaffer-daily-picks-article", { scheduled: true }],
    ],
    45: [
      ["form-table-article", { scheduled: true }],
    ],
  },
  // 16:00-23:00 - Settle bets every 30 min
  16: { 0: [["settle-bets", { scheduled: true }]], 30: [["settle-bets", { scheduled: true }]] },
  17: { 0: [["settle-bets", { scheduled: true }]], 30: [["settle-bets", { scheduled: true }]] },
  18: { 
    0: [
      ["settle-bets", { scheduled: true }],
      ["compute-rolling-stats", { scheduled: true }], // evening refresh
    ], 
    30: [["settle-bets", { scheduled: true }]] 
  },
  19: { 0: [["settle-bets", { scheduled: true }]], 30: [["settle-bets", { scheduled: true }]] },
  20: { 0: [["settle-bets", { scheduled: true }]], 30: [["settle-bets", { scheduled: true }]] },
  21: { 0: [["settle-bets", { scheduled: true }]], 30: [["settle-bets", { scheduled: true }]] },
  22: { 0: [["settle-bets", { scheduled: true }]], 30: [["settle-bets", { scheduled: true }]] },
  23: { 0: [["settle-bets", { scheduled: true }]], 30: [["settle-bets", { scheduled: true }]] },
};

// Monday only tasks
const MONDAY_SCHEDULE: Record<number, Record<number, Task[]>> = {
  6: {
    0: [
      ["generate-blog-post", { type: "weekly-roundup", auto: true }],
    ],
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const now = new Date();
    const hour = now.getUTCHours();
    const minute = now.getUTCMinutes();
    const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon

    // Check if there are tasks scheduled for this exact hour:minute
    const hourTasks = SCHEDULE[hour];
    const tasks: Task[] = hourTasks?.[minute] ?? [];

    // Add Monday-only tasks
    if (dayOfWeek === 1) {
      const mondayTasks = MONDAY_SCHEDULE[hour]?.[minute] ?? [];
      tasks.push(...mondayTasks);
    }

    if (tasks.length === 0) {
      return new Response(JSON.stringify({ 
        message: "No tasks scheduled", 
        time: `${hour}:${String(minute).padStart(2, '0')} UTC` 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`🕐 Orchestrator running at ${hour}:${String(minute).padStart(2, '0')} UTC — ${tasks.length} task(s)`);

    const results: TaskResult[] = [];
    
    for (const [name, body, queryParams] of tasks) {
      const result = await callFunction(name, body, queryParams ?? "");
      results.push(result);
      
      // Small delay between calls to avoid rate limits
      if (tasks.length > 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    const summary = {
      time: `${hour}:${String(minute).padStart(2, '0')} UTC`,
      tasks_run: results.length,
      all_ok: results.every(r => r.ok),
      results,
    };

    console.log(`📊 Orchestrator complete: ${results.filter(r => r.ok).length}/${results.length} succeeded`);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Orchestrator error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

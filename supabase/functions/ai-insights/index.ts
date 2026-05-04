import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MONTHLY_LIMIT = 10;
const FREE_MODEL = "openai/gpt-oss-20b:free";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const { mode, prompt, periodLabel } = body ?? {};

    // Compute current month usage (used by all modes)
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const { data: usage } = await supabase
      .from("ai_usage")
      .select("id, request_count")
      .eq("user_id", userId)
      .eq("year_month", yearMonth)
      .maybeSingle();

    const currentCount = usage?.request_count ?? 0;

    // status mode: just return usage info
    if (mode === "status") {
      return json({ used: currentCount, limit: MONTHLY_LIMIT });
    }

    if (!prompt || typeof prompt !== "string") {
      return json({ error: "Missing prompt" }, 400);
    }

    if (currentCount >= MONTHLY_LIMIT) {
      return json({
        error: `Monthly limit reached (${MONTHLY_LIMIT} requests). Resets next month.`,
        limit: MONTHLY_LIMIT,
        used: currentCount,
      }, 429);
    }

    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) return json({ error: "Server not configured" }, 500);

    const aiResp = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://chitta.lovable.app",
        "X-Title": "LifeFlow",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: FREE_MODEL,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiResp.ok) {
      const errBody = await aiResp.text();
      console.error("OpenRouter error:", aiResp.status, errBody);
      return json({ error: "AI request failed" }, 502);
    }

    const result = await aiResp.json();
    const content = result.choices?.[0]?.message?.content ?? "";

    // Increment usage
    if (usage) {
      await supabase.from("ai_usage").update({ request_count: currentCount + 1 }).eq("id", usage.id);
    } else {
      await supabase.from("ai_usage").insert({ user_id: userId, year_month: yearMonth, request_count: 1 });
    }

    // Persist insight reports (analysis mode only). Skip audit/categorize.
    if (mode === "analysis" && content) {
      await supabase.from("ai_insights_history").insert({
        user_id: userId,
        period_label: periodLabel || "Untitled period",
        content,
      });
    }

    return json({
      content,
      used: currentCount + 1,
      limit: MONTHLY_LIMIT,
    });
  } catch (e) {
    console.error("ai-insights error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.25.76";
import { expenseChatPrompt, mergeCategories, parseChatResult } from "./expense-parser.ts";

const BodySchema = z.object({
  mode: z.enum(["status", "analysis", "audit", "categorize", "expense-chat"]),
  prompt: z.string().trim().min(1).max(100000).optional(),
  message: z.string().trim().min(1).max(500).optional(),
  periodLabel: z.string().max(255).optional(),
  categories: z.array(z.string().trim().min(1).max(30)).max(60).optional(),
});

const FREE_MODEL = "recursive/flint-v1.0:free";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return json({ error: "Server not configured" }, 500);
    const supabase = createClient(url, serviceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const parsed = BodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "Invalid request. Check the message and try again." }, 400);
    const { mode, periodLabel, message } = parsed.data;
    const categories = mergeCategories(parsed.data.categories ?? []);
    const prompt = mode === "expense-chat" && message ? expenseChatPrompt(message, categories) : parsed.data.prompt;
    if (mode === "expense-chat" && !message) return json({ error: "Enter an expense message." }, 400);

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
      return json({ used: currentCount, limit: null });
    }

    if (!prompt || typeof prompt !== "string") {
      return json({ error: "Missing prompt" }, 400);
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
      if (aiResp.status === 404) {
        return json({ error: "The configured free AI model is no longer available. Expense chat cannot record entries until an available free model is selected. Manual entry still works." }, 404);
      }
      return json({ error: "AI request failed" }, 502);
    }

    const result = await aiResp.json();
    const content = result.choices?.[0]?.message?.content ?? "";

    // Never send unchecked model output to the expense write path.
    let expense;
    if (mode === "expense-chat") {
      try {
        expense = parseChatResult(content, categories);
      } catch {
        return json({ error: "Could not understand this. Send one amount and what it was for, e.g. \"200 for lunch\" or \"lent 500 to Ravi\"." }, 422);
      }
    }

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
      ...(expense ? { expense } : {}),
      used: currentCount + 1,
      limit: null,
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

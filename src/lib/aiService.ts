import { LifeData } from "@/hooks/useLifeData";
import { supabase } from "@/integrations/supabase/client";

export interface AIAnalysisRequest {
  data: LifeData;
  periodLabel: string;
  enabledFeatures: string[];
  startDate: string;
  endDate: string;
}

async function callAI(prompt: string, mode: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("ai-insights", {
    body: { prompt, mode },
  });

  if (error) {
    // Try to surface backend message (e.g. monthly limit)
    const ctx: any = (error as any).context;
    if (ctx) {
      try {
        const body = await ctx.json?.();
        if (body?.error) throw new Error(body.error);
      } catch (e) {
        if (e instanceof Error && e.message) throw e;
      }
    }
    throw new Error(error.message || "AI request failed");
  }
  if (data?.error) throw new Error(data.error);
  return data?.content ?? "";
}

export async function generateAIAnalysis({ data, periodLabel, enabledFeatures, startDate, endDate }: AIAnalysisRequest) {
  const inRange = (date: string) => date >= startDate && date <= endDate;
  const summaryParts: string[] = [];

  if (enabledFeatures.includes("expenses")) {
    const expenses = data.expenses.filter(e => inRange(e.date));
    const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
    const topCats = Object.entries(
      expenses.reduce<Record<string, number>>((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1]).slice(0, 5);
    summaryParts.push(`Expenses: Total spent ₹${totalSpent.toFixed(2)}. Top categories: ${topCats.map(([c, a]) => `${c} (₹${a.toFixed(0)})`).join(", ")}.`);
  }
  if (enabledFeatures.includes("food")) {
    const food = data.food.filter(f => inRange(f.date));
    const totalCals = food.reduce((s, f) => s + (f.calories || 0), 0);
    summaryParts.push(`Nutrition: Total calories logged ${totalCals.toLocaleString()}.`);
  }
  if (enabledFeatures.includes("exercise")) {
    const exercise = data.exercise.filter(e => inRange(e.date));
    const totalMins = exercise.reduce((s, e) => s + e.duration, 0);
    summaryParts.push(`Exercise: Total active time ${totalMins} minutes across ${exercise.length} sessions.`);
  }
  if (enabledFeatures.includes("tasks")) {
    const tasks = data.tasks.filter(t => inRange(t.date));
    const done = tasks.filter(t => t.done).length;
    summaryParts.push(`Productivity: Completed ${done} out of ${tasks.length} tasks.`);
  }
  if (enabledFeatures.includes("habits")) {
    const totalCompletions = data.habits.reduce((sum, h) =>
      sum + h.completedDates.filter(d => inRange(d)).length, 0
    );
    summaryParts.push(`Habits: Total of ${totalCompletions} habit completions across ${data.habits.length} tracked habits.`);
  }

  const prompt = `
You are an expert life coach and behavioral data analyst.

## Context
Analyze the following personal metrics for the period: ${periodLabel}.

## Data Summary
${summaryParts.join("\n")}

## Your Task
Generate a structured personal performance report:

### 1. 🧭 Executive Summary (2–3 sentences)
### 2. 💡 Top 3 Actionable Insights (What / Why it matters / Action)
### 3. ⚠️ One Risk to Watch
### 4. 🏆 Win of the Period
### 5. 🎯 Weekly Focus Recommendation (with measurable target)
### 6. 💬 Closing Thought (reference a specific number from the report)

Use **bold** for key numbers. Use ₹ for currency. Be encouraging but honest.
`;

  return callAI(prompt, "analysis");
}

export async function categorizeExpense(note: string, categories: string[]) {
  if (!note.trim()) return null;
  const prompt = `Choose the most appropriate category for this expense note.
Note: "${note}"
Categories: ${categories.join(", ")}
Return ONLY the category name. If none fit, pick "Other".`;
  try {
    const suggested = (await callAI(prompt, "categorize")).trim();
    return categories.find(c => c.toLowerCase() === suggested.toLowerCase()) || null;
  } catch (err) {
    console.error("AI Categorization failed:", err);
    return null;
  }
}

export interface AuditResult {
  id: string;
  suggested: string;
  reason: string;
}

export async function auditExpenses(expenses: any[], categories: string[]) {
  if (expenses.length === 0) return [];
  const auditable = expenses.filter(e => e.note && e.note.trim());
  if (auditable.length === 0) return [];
  const list = auditable.map(e => ({ id: e.id, note: e.note, current: e.category }));

  const prompt = `Audit these expenses. Check if "current" category matches "note" based on: ${categories.join(", ")}.
Expenses: ${JSON.stringify(list)}
Return ONLY a JSON array of mismatched items: [{"id":"...","suggested":"...","reason":"..."}]. If all correct, return [].`;

  try {
    const text = (await callAI(prompt, "audit")).trim();
    const jsonMatch = text.match(/\[.*\]/s);
    return JSON.parse(jsonMatch ? jsonMatch[0] : text) as AuditResult[];
  } catch (err) {
    console.error("AI Audit failed:", err);
    return [];
  }
}

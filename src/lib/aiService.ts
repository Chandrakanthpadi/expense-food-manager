import { LifeData } from "@/hooks/useLifeData";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-120b:free";

export interface AIAnalysisRequest {
  data: LifeData;
  periodLabel: string;
  enabledFeatures: string[];
  startDate: string;
  endDate: string;
}


export async function generateAIAnalysis({ data, periodLabel, enabledFeatures, startDate, endDate }: AIAnalysisRequest) {
  const apiKey = localStorage.getItem("openrouter-api-key");
  if (!apiKey) {
    throw new Error("Missing OpenRouter API Key. Please add it in Settings.");
  }

  const inRange = (date: string) => date >= startDate && date <= endDate;

  // Aggregate data for the prompt
  const summaryParts = [];
  
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
    // For habits, we count completions in range
    const totalCompletions = data.habits.reduce((sum, h) => 
      sum + h.completedDates.filter(d => inRange(d)).length, 0
    );
    summaryParts.push(`Habits: Total of ${totalCompletions} habit completions across ${data.habits.length} tracked habits.`);
  }


  // const prompt = `
  //   You are a personal life coach and data analyst. Analyze the following data for the period: ${periodLabel}.
    
  //   Current Summary:
  //   ${summaryParts.join("\n")}
    
  //   Please provide:
  //   1. A brief executive summary of the period.
  //   2. 3 actionable insights or recommendations to improve health, finances, or productivity.
  //   3. A motivational closing thought.
    
  //   Keep the tone encouraging, professional, and concise. Use markdown for formatting.
  // `;

    const prompt = `
    You are an expert life coach and behavioral data analyst specializing in personal finance,
    health optimization, and productivity systems.

    ## Context
    Analyze the following personal metrics for the period: ${periodLabel}.

    ## Data Summary
    ${summaryParts.join("\n")}

    ## Your Task
    Generate a structured personal performance report with the following sections:

    ### 1. 🧭 Executive Summary (2–3 sentences)
    Highlight the most significant trends — both positive and negative. Be direct and specific
    with numbers where available.

    ### 2. 💡 Top 3 Actionable Insights
    For each insight:
    - **What**: Identify the specific pattern or issue
    - **Why it matters**: Explain the impact (financial, health, or productivity)
    - **Action**: Give one concrete, immediately doable step to address it
    Prioritize insights by potential impact. Focus on what's within the user's control.

    ### 3. ⚠️ One Risk to Watch
    Identify the single most important early warning sign in the data that could compound
    into a bigger problem if ignored.

    ### 4. 🏆 Win of the Period
    Identify one genuine positive from the data worth celebrating, even if small.

    ### 5. 🎯 Weekly Focus Recommendation
    Based on the data, suggest ONE specific focus area for the upcoming week with a
    measurable target (e.g., "Cap dining out at ₹1,500" or "Sleep before 11pm on 5 days").

    ### 6. 💬 Closing Thought
    End with a brief, personalized motivational note tied to the actual data — not generic
    advice. Reference a specific number or trend from the report.

    ## Tone & Style Guidelines
    - Encouraging but honest — don't sugarcoat problems
    - Use **bold** for key numbers and action items
    - Keep each section concise (2–5 sentences max)
    - Avoid generic advice; every recommendation must reference the actual data
    - Use ₹ for currency if amounts are in INR
  `;

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": window.location.origin,
      "X-Title": "LifeFlow Manager",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error?.error?.message || "Failed to generate AI analysis");
  }

  const result = await response.json();
  return result.choices[0].message.content as string;
}

export async function categorizeExpense(note: string, categories: string[]) {
  const apiKey = localStorage.getItem("openrouter-api-key");
  if (!apiKey || !note.trim()) return null;

  const prompt = `
    Analyze the following expense note and choose the most appropriate category from the provided list.
    Note: "${note}"
    Categories: ${categories.join(", ")}
    Return ONLY the category name. If none fit perfectly, pick "Other".
  `;

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "LifeFlow Manager",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) return null;
    const result = await response.json();
    const suggested = result.choices[0].message.content.trim();
    const match = categories.find(c => c.toLowerCase() === suggested.toLowerCase());
    return match || null;
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
  const apiKey = localStorage.getItem("openrouter-api-key");
  if (!apiKey || expenses.length === 0) return [];

  const auditable = expenses.filter(e => e.note && e.note.trim());
  if (auditable.length === 0) return [];

  const list = auditable.map(e => ({ id: e.id, note: e.note, current: e.category }));

  const prompt = `
    Audit these expenses. Check if "current" category matches "note" based on: ${categories.join(", ")}.
    Expenses: ${JSON.stringify(list)}
    Return ONLY a JSON array of mismatched items: [{"id": "...", "suggested": "...", "reason": "..."}]. If correct, return [].
  `;

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "LifeFlow Manager",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) return [];
    const result = await response.json();
    const text = result.choices[0].message.content.trim();
    const jsonMatch = text.match(/\[.*\]/s);
    return JSON.parse(jsonMatch ? jsonMatch[0] : text) as AuditResult[];
  } catch (err) {
    console.error("AI Audit failed:", err);
    return [];
  }
}

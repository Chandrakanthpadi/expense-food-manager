import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, ChevronLeft, ChevronRight, DollarSign, UtensilsCrossed, Dumbbell, Target,
  ListTodo, BookOpen, TrendingUp, TrendingDown, Flame, Award, Download, Sparkles, AlertCircle,
  ChevronDown, X, Calendar as CalendarIcon, Loader2, Check, RotateCcw, Info, Trash2
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useLifeData } from "@/hooks/useLifeData";
import { useFeatureSettings } from "@/hooks/useFeatureSettings";
import { generateAIAnalysis, auditExpenses, type AuditResult } from "@/lib/aiService";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn, getISTDateStr } from "@/lib/utils";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip,
  Cell, PieChart, Pie
} from "recharts";



import { createPdfFileName, exportReportToPdf, type PdfReportData } from "@/lib/pdfExport";

type Period = "week" | "month" | "year";

function pad(n: number) { return String(n).padStart(2, "0"); }
function fmtLocal(d: Date) { return getISTDateStr(d); }

function getDateRange(period: Period, offset: number): [string, string] {
  const now = new Date();
  if (period === "week") {
    const day = now.getDay();
    const start = new Date(now);
    start.setDate(now.getDate() - day + offset * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return [fmtLocal(start), fmtLocal(end)];
  }
  if (period === "month") {
    const m = now.getMonth() + offset;
    const start = new Date(now.getFullYear(), m, 1);
    const end = new Date(now.getFullYear(), m + 1, 0);
    return [fmtLocal(start), fmtLocal(end)];
  }
  const y = now.getFullYear() + offset;
  return [fmtLocal(new Date(y, 0, 1)), fmtLocal(new Date(y, 11, 31))];
}

function periodLabel(period: Period, offset: number): string {
  const [s, e] = getDateRange(period, offset);
  if (period === "week") {
    const sf = new Date(s + "T12:00:00").toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    const ef = new Date(e + "T12:00:00").toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    return `${sf} – ${ef}`;
  }
  if (period === "month") {
    const d = new Date(s + "T12:00:00");
    return d.toLocaleDateString("en", { month: "long", year: "numeric" });
  }
  return new Date(s + "T12:00:00").getFullYear().toString();
}

function inRange(date: string, start: string, end: string) {
  return date >= start && date <= end;
}

function getDaysInRange(start: string, end: string): string[] {
  const days: string[] = [];
  const d = new Date(start + "T12:00:00");
  const endDate = new Date(end + "T12:00:00");
  while (d <= endDate) {
    days.push(fmtLocal(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

// Get sub-period ranges: weeks for month view, months for year view
function getSubPeriods(period: Period, start: string, end: string): { label: string; start: string; end: string }[] {
  if (period === "week") {
    // Split into days
    const days: { label: string; start: string; end: string }[] = [];
    const d = new Date(start + "T12:00:00");
    const endDate = new Date(end + "T12:00:00");
    while (d <= endDate) {
      const dateStr = fmtLocal(d);
      days.push({
        label: d.toLocaleDateString("en", { weekday: "short", day: "numeric" }),
        start: dateStr,
        end: dateStr,
      });
      d.setDate(d.getDate() + 1);
    }
    days.push({ label: "Total", start, end });
    return days;
  }
  if (period === "month") {
    // Split into weeks
    const weeks: { label: string; start: string; end: string }[] = [];
    const d = new Date(start + "T12:00:00");
    const endDate = new Date(end + "T12:00:00");
    while (d <= endDate) {
      const wStart = new Date(d);
      const wEnd = new Date(d);
      while (wEnd.getDay() !== 6 && wEnd < endDate) {
        wEnd.setDate(wEnd.getDate() + 1);
      }
      if (wEnd > endDate) wEnd.setTime(endDate.getTime());
      const sl = wStart.toLocaleDateString("en", { month: "short", day: "numeric" });
      const el = wEnd.toLocaleDateString("en", { day: "numeric" });
      weeks.push({ label: `${sl}–${el}`, start: fmtLocal(wStart), end: fmtLocal(wEnd) });
      wEnd.setDate(wEnd.getDate() + 1);
      d.setTime(wEnd.getTime());
    }
    weeks.push({ label: "Total", start, end });
    return weeks;
  }
  if (period === "year") {
    const startDate = new Date(start + "T12:00:00");
    const months: { label: string; start: string; end: string }[] = [];
    for (let m = 0; m < 12; m++) {
      const mStart = new Date(startDate.getFullYear(), m, 1);
      const mEnd = new Date(startDate.getFullYear(), m + 1, 0);
      months.push({
        label: mStart.toLocaleDateString("en", { month: "short" }),
        start: fmtLocal(mStart),
        end: fmtLocal(mEnd),
      });
    }
    months.push({ label: "Total", start, end });
    return months;
  }
  return [];
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  colorClass: string;
  children: React.ReactNode;
  onTitleClick?: () => void;
}

function Section({ title, icon, colorClass, children, onTitleClick }: SectionProps) {
  return (
    <div className="bg-card rounded-xl border border-border/60 overflow-hidden">
      <div
        className={cn("flex items-center gap-2 px-4 py-3 border-b border-border/40", onTitleClick && "cursor-pointer hover:bg-muted/50 active:bg-muted/70 transition-colors")}
        onClick={onTitleClick}
      >
        <span className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-primary-foreground", colorClass)}>
          {icon}
        </span>
        <h2 className="text-base font-semibold flex-1">{title}</h2>
        {onTitleClick && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

const InsightChart = ({ data, color }: { data: any[], color: string }) => {
  if (data.every(d => d.amount === 0)) return null;
  return (
    <div className="h-24 w-full mt-4 mb-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-background/95 border border-border shadow-xl rounded-lg px-2 py-1.5 text-[10px]">
                    <p className="font-semibold">{new Date(payload[0].payload.date + "T12:00:00").toLocaleDateString("en", { month: "short", day: "numeric" })}</p>
                    <p style={{ color }} className="font-bold">{payload[0].value.toLocaleString()}</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="amount" radius={[2, 2, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={color} fillOpacity={0.4 + (index / data.length) * 0.6} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const CategoryPieChart = ({ data }: { data: [string, number][] }) => {
  if (data.length === 0) return null;
  const chartData = data.map(([name, value]) => ({ name, value }));
  const COLORS = [
    "var(--section-expense)",
    "var(--section-food)",
    "var(--section-exercise)",
    "var(--section-habits)",
    "var(--section-tasks)",
    "var(--section-journal)"
  ];

  return (
    <div className="h-56 w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={60}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
            label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
              const RADIAN = Math.PI / 180;
              const radius = outerRadius + 12;
              const x = cx + radius * Math.cos(-midAngle * RADIAN);
              const y = cy + radius * Math.sin(-midAngle * RADIAN);

              return (
                <text
                  x={x}
                  y={y}
                  fill="var(--muted-foreground)"
                  textAnchor={x > cx ? "start" : "end"}
                  dominantBaseline="central"
                  className="text-[10px] font-medium"
                >
                  {`${name} ${(percent * 100).toFixed(0)}%`}
                </text>
              );
            }}
            labelLine={false}
            isAnimationActive={false}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.8} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};


function MetricRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between py-2 border-b border-border/30 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className="text-base font-semibold tabular-nums">{value}</span>
        {sub && <span className="text-xs text-muted-foreground ml-1.5">{sub}</span>}
      </div>
    </div>
  );
}

function MiniBar({ values, max, colorClass }: { values: { label: string; amount: number }[]; max: number; colorClass: string }) {
  return (
    <div className="space-y-1.5 mt-2">
      {values.map(v => (
        <div key={v.label} className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-16 truncate">{v.label}</span>
          <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", colorClass)}
              style={{ width: `${max > 0 ? (v.amount / max) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs tabular-nums font-medium w-14 text-right">₹{v.amount.toFixed(0)}</span>
        </div>
      ))}
    </div>
  );
}

// Determine next drill-down level
function getNextLevel(current: "year" | "month" | "week" | "day"): "month" | "week" | "day" | null {
  if (current === "year") return "month";
  if (current === "month") return "week";
  if (current === "week") return "day";
  return null;
}

function getBreakdownTitle(level: "year" | "month" | "week" | "day"): string {
  if (level === "year") return "Monthly Breakdown";
  if (level === "month") return "Weekly Breakdown";
  if (level === "week") return "Daily Breakdown";
  return "Details";
}

// Sub-period breakdown table
interface SubBreakdownProps {
  subPeriods: { label: string; start: string; end: string }[];
  getData: (start: string, end: string) => { spent: number; calories: number; exercise: number; tasks: string };
  colorClass: string;
  breakdownTitle?: string;
  onRowClick?: (start: string, end: string, label: string) => void;
  settings: Record<string, boolean>;
}

function SubBreakdown({ subPeriods, getData, colorClass, breakdownTitle, onRowClick, settings }: SubBreakdownProps) {
  if (subPeriods.length === 0) return null;
  const rows = subPeriods.map(sp => ({ ...sp, ...getData(sp.start, sp.end) }));
  const maxSpent = Math.max(...rows.map(r => r.spent), 1);

  return (
    <div className="bg-card rounded-xl border border-border/60 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
        <h2 className="text-sm font-semibold">
          {breakdownTitle || "Breakdown"}
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/40 text-muted-foreground">
              <th className="text-left px-4 py-2 font-medium">Period</th>
              {settings.expenses && <th className="text-right px-3 py-2 font-medium">Spent</th>}
              {settings.food && <th className="text-right px-3 py-2 font-medium">Cal</th>}
              {settings.exercise && <th className="text-right px-3 py-2 font-medium">Exercise</th>}
              {settings.tasks && <th className="text-right px-4 py-2 font-medium">Tasks</th>}
            </tr>
          </thead>

          <tbody>
            {rows.map(r => {
              const isTotal = r.label === "Total";
              const isClickable = !isTotal && onRowClick;
              return (
                <tr
                  key={r.label}
                  onClick={() => isClickable && onRowClick!(r.start, r.end, r.label)}
                  className={cn(
                    "border-b border-border/20 last:border-0",
                    isTotal && "bg-muted/40 font-semibold",
                    isClickable && "cursor-pointer hover:bg-muted/50 active:bg-muted/70 transition-colors"
                  )}
                >
                  <td className="px-4 py-2 font-medium">
                    <span className="flex items-center gap-1">
                      {r.label}
                      {isClickable && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                    </span>
                  </td>
                  {settings.expenses && (
                    <td className="text-right px-3 py-2 tabular-nums">
                      <span>₹{r.spent.toFixed(0)}</span>
                    </td>
                  )}
                  {settings.food && <td className="text-right px-3 py-2 tabular-nums text-muted-foreground">{r.calories > 0 ? r.calories.toLocaleString() : "–"}</td>}
                  {settings.exercise && <td className="text-right px-3 py-2 tabular-nums text-muted-foreground">{r.exercise > 0 ? `${r.exercise}m` : "–"}</td>}
                  {settings.tasks && <td className="text-right px-4 py-2 tabular-nums">{r.tasks}</td>}
                </tr>

              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Day detail view component
function DayDetail({ date, data: lifeData, onBack, onUpdate, onRemove }: { date: string; data: any; onBack: () => void; onUpdate: (id: string, updates: any) => void; onRemove: (id: string) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editNote, setEditNote] = useState("");

  const startEditing = (e: any) => {
    setEditingId(e.id);
    setEditAmount(e.amount.toString());
    setEditCategory(e.category);
    setEditNote(e.note || "");
  };

  const handleUpdate = (id: string) => {
    const num = parseFloat(editAmount);
    if (!num || num <= 0) return;
    onUpdate(id, {
      amount: num,
      category: editCategory,
      note: editNote
    });
    setEditingId(null);
  };
  const d = new Date(date + "T12:00:00");
  const label = d.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const expenses = lifeData.expenses.filter((e: any) => e.date === date);
  const food = lifeData.food.filter((f: any) => f.date === date);
  const exercise = lifeData.exercise.filter((e: any) => e.date === date);
  const tasks = lifeData.tasks.filter((t: any) => t.date === date);
  const journal = lifeData.journal.filter((j: any) => j.date === date);
  const mealCheck = lifeData.mealChecks.find((m: any) => m.date === date);
  const habits = lifeData.habits.map((h: any) => ({
    name: h.name,
    done: h.completedDates.includes(date),
  }));

  const totalSpent = expenses.reduce((s: number, e: any) => s + e.amount, 0);
  const totalCals = food.reduce((s: number, f: any) => s + (f.calories || 0), 0);
  const totalExercise = exercise.reduce((s: number, e: any) => s + e.duration, 0);

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-primary hover:underline active:scale-95 transition-all">
        <ChevronLeft className="w-3.5 h-3.5" />Back
      </button>
      <div className="bg-card rounded-xl border border-border/60 px-4 py-3">
        <h2 className="text-sm font-bold">{label}</h2>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Spent", value: `₹${totalSpent.toFixed(0)}` },
          { label: "Calories", value: totalCals > 0 ? totalCals.toLocaleString() : "–" },
          { label: "Exercise", value: totalExercise > 0 ? `${totalExercise}m` : "–" },
          { label: "Tasks", value: `${tasks.filter((t: any) => t.done).length}/${tasks.length}` },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-lg border border-border/60 px-3 py-2 text-center">
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
            <p className="text-sm font-semibold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Expenses detail */}
      {expenses.length > 0 && (
        <Section title="Expenses" icon={<DollarSign className="w-4 h-4" />} colorClass="bg-section-expense">
          <div className="space-y-2">
            {expenses.map((e: any) => (
              <div key={e.id} className="flex flex-col rounded-lg bg-muted/20 border border-border/40 overflow-hidden group">
                <div
                  className="flex justify-between items-center p-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => editingId === e.id ? setEditingId(null) : startEditing(e)}
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold">{e.category}</span>
                    {e.note && <span className="text-[10px] text-muted-foreground ml-2 truncate inline-block max-w-[100px] align-bottom">{e.note}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold tabular-nums">₹{e.amount.toFixed(2)}</span>
                    <button
                      onClick={(evt) => {
                        evt.stopPropagation();
                        onRemove(e.id);
                      }}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors ml-1 active:scale-90"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform duration-300", editingId === e.id && "rotate-180")} />
                  </div>
                </div>

                <div
                  className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                  style={{ gridTemplateRows: editingId === e.id ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <div className="p-3 pt-0 space-y-3">
                      <div className="h-px bg-border/20" />
                      <div className="flex gap-2">
                        <div className="flex-1 space-y-1">
                          <label className="text-[9px] text-muted-foreground font-medium px-1">Amount</label>
                          <input
                            type="number"
                            value={editAmount}
                            onChange={evt => setEditAmount(evt.target.value)}
                            className="w-full bg-background rounded-md px-2 py-1.5 text-xs tabular-nums outline-none border border-border/40 focus:ring-2 focus:ring-ring/30"
                            onClick={evt => evt.stopPropagation()}
                          />
                        </div>
                        <div className="flex-1 space-y-1">
                          <label className="text-[9px] text-muted-foreground font-medium px-1">Category</label>
                          <select
                            value={editCategory}
                            onChange={evt => setEditCategory(evt.target.value)}
                            className="w-full bg-background rounded-md px-2 py-1.5 text-xs outline-none border border-border/40 focus:ring-2 focus:ring-ring/30"
                            onClick={evt => evt.stopPropagation()}
                          >
                            {expenseCategories.map(c => <option key={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-muted-foreground font-medium px-1">Note</label>
                        <input
                          type="text"
                          value={editNote}
                          onChange={evt => setEditNote(evt.target.value)}
                          placeholder="Note"
                          className="w-full bg-background rounded-md px-2 py-1.5 text-xs outline-none border border-border/40 focus:ring-2 focus:ring-ring/30"
                          onClick={evt => evt.stopPropagation()}
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={(evt) => {
                            evt.stopPropagation();
                            setEditingId(null);
                          }}
                          className="px-3 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={(evt) => {
                            evt.stopPropagation();
                            handleUpdate(e.id);
                          }}
                          className="px-4 py-1.5 text-[10px] font-semibold bg-section-expense text-primary-foreground rounded-md active:scale-95 transition-all shadow-sm"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Food detail */}
      {food.length > 0 && (
        <Section title="Food" icon={<UtensilsCrossed className="w-4 h-4" />} colorClass="bg-section-food">
          {food.map((f: any) => (
            <div key={f.id} className="flex justify-between items-center py-1.5 border-b border-border/20 last:border-0">
              <div>
                <span className="text-xs font-medium capitalize">{f.meal}</span>
                <span className="text-[10px] text-muted-foreground ml-2">{f.items}</span>
              </div>
              {f.calories && <span className="text-xs tabular-nums text-muted-foreground">{f.calories} cal</span>}
            </div>
          ))}
        </Section>
      )}

      {/* Meal checks */}
      {mealCheck && (
        <Section title="Meal Check" icon={<UtensilsCrossed className="w-4 h-4" />} colorClass="bg-section-food">
          <div className="flex gap-3 flex-wrap">
            {(["breakfast", "lunch", "dinner", "snack"] as const).map(m => (
              <span key={m} className={cn("text-xs px-2 py-1 rounded-md", mealCheck[m] ? "bg-section-food/20 text-foreground font-medium" : "text-muted-foreground bg-muted")}>
                {mealCheck[m] ? "✅" : "❌"} {m}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Exercise detail */}
      {exercise.length > 0 && (
        <Section title="Exercise" icon={<Dumbbell className="w-4 h-4" />} colorClass="bg-section-exercise">
          {exercise.map((e: any) => (
            <div key={e.id} className="flex justify-between items-center py-1.5 border-b border-border/20 last:border-0">
              <span className="text-xs font-medium">{e.activity}</span>
              <span className="text-xs tabular-nums text-muted-foreground">{e.duration} min</span>
            </div>
          ))}
        </Section>
      )}

      {/* Habits */}
      {habits.some((h: any) => h.done) && (
        <Section title="Habits" icon={<Target className="w-4 h-4" />} colorClass="bg-section-habits">
          {habits.map((h: any) => (
            <div key={h.name} className="flex justify-between items-center py-1.5 border-b border-border/20 last:border-0">
              <span className="text-xs font-medium">{h.name}</span>
              <span className={cn("text-xs", h.done ? "text-accent" : "text-muted-foreground")}>{h.done ? "✅ Done" : "—"}</span>
            </div>
          ))}
        </Section>
      )}

      {/* Tasks detail */}
      {tasks.length > 0 && (
        <Section title="Tasks" icon={<ListTodo className="w-4 h-4" />} colorClass="bg-section-tasks">
          {tasks.map((t: any) => (
            <div key={t.id} className="flex justify-between items-center py-1.5 border-b border-border/20 last:border-0">
              <span className={cn("text-xs", t.done ? "line-through text-muted-foreground" : "font-medium")}>{t.text}</span>
              <span className="text-xs">{t.done ? "✅" : "⬜"}</span>
            </div>
          ))}
        </Section>
      )}

      {/* Journal */}
      {journal.length > 0 && (
        <Section title="Journal" icon={<BookOpen className="w-4 h-4" />} colorClass="bg-section-journal">
          {journal.map((j: any) => (
            <div key={j.id} className="py-1.5 border-b border-border/20 last:border-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs">{j.mood}</span>
              </div>
              <p className="text-xs text-muted-foreground">{j.content}</p>
            </div>
          ))}
        </Section>
      )}

      {/* Empty state */}
      {expenses.length === 0 && food.length === 0 && exercise.length === 0 && tasks.length === 0 && journal.length === 0 && !mealCheck && (
        <div className="text-center py-8 text-muted-foreground text-sm">No data recorded for this day</div>
      )}
    </div>
  );
}

const expenseCategories = ["Food", "Groceries", "Transport", "Bills", "Shopping", "Health", "Other"];

// Category expenses detail view
function CategoryExpensesDetail({
  category,
  start,
  end,
  data: lifeData,
  onBack,
  onUpdate,
  onRemove
}: {
  category: string;
  start: string;
  end: string;
  data: any;
  onBack: () => void;
  onUpdate: (id: string, updates: any) => void;
  onRemove: (id: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editNote, setEditNote] = useState("");

  const startEditing = (e: any) => {
    setEditingId(e.id);
    setEditAmount(e.amount.toString());
    setEditCategory(e.category);
    setEditNote(e.note || "");
  };

  const handleUpdate = (id: string) => {
    const num = parseFloat(editAmount);
    if (!num || num <= 0) return;
    onUpdate(id, {
      amount: num,
      category: editCategory,
      note: editNote
    });
    setEditingId(null);
  };

  const expenses = lifeData.expenses.filter((e: any) => e.category === category && inRange(e.date, start, end))
    .sort((a: any, b: any) => b.date.localeCompare(a.date));
  const total = expenses.reduce((s: number, e: any) => s + e.amount, 0);

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-primary hover:underline active:scale-95 transition-all">
        <ChevronLeft className="w-3.5 h-3.5" />Back
      </button>
      <div className="bg-card rounded-xl border border-border/60 px-4 py-3 flex justify-between items-center">
        <h2 className="text-sm font-bold">{category} Expenses</h2>
        <span className="text-sm font-bold tabular-nums">₹{total.toFixed(2)}</span>
      </div>

      <div className="bg-card rounded-xl border border-border/60 divide-y divide-border/20 overflow-hidden">
        {expenses.map((e: any) => (
          <div key={e.id} className="group">
            <div
              className="px-4 py-3.5 flex justify-between items-center cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => editingId === e.id ? setEditingId(null) : startEditing(e)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold">{new Date(e.date + "T12:00:00").toLocaleDateString("en", { month: "short", day: "numeric" })}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {e.note && <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">{e.note}</span>}
                  <span className="text-[9px] font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded border border-border/10">
                    {e.category}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-bold tabular-nums">₹{e.amount.toFixed(2)}</span>
                <button
                  onClick={(evt) => {
                    evt.stopPropagation();
                    onRemove(e.id);
                  }}
                  className="p-1 text-muted-foreground hover:text-destructive transition-colors ml-1 active:scale-90"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-300", editingId === e.id && "rotate-180")} />
              </div>
            </div>

            <div
              className="grid transition-[grid-template-rows] duration-300 ease-in-out bg-muted/5"
              style={{ gridTemplateRows: editingId === e.id ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <div className="px-4 pb-4 pt-0 space-y-3">
                  <div className="h-px bg-border/20" />
                  <div className="flex gap-3">
                    <div className="flex-1 space-y-1.5">
                      <label className="text-[10px] text-muted-foreground font-semibold px-1">Amount</label>
                      <input
                        type="number"
                        value={editAmount}
                        onChange={evt => setEditAmount(evt.target.value)}
                        className="w-full bg-background rounded-md px-2.5 py-2 text-sm tabular-nums outline-none border border-border/40 focus:ring-2 focus:ring-ring/30"
                        onClick={evt => evt.stopPropagation()}
                      />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <label className="text-[10px] text-muted-foreground font-semibold px-1">Category</label>
                      <select
                        value={editCategory}
                        onChange={evt => setEditCategory(evt.target.value)}
                        className="w-full bg-background rounded-md px-2.5 py-2 text-sm outline-none border border-border/40 focus:ring-2 focus:ring-ring/30"
                        onClick={evt => evt.stopPropagation()}
                      >
                        {expenseCategories.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground font-semibold px-1">Note</label>
                    <input
                      type="text"
                      value={editNote}
                      onChange={evt => setEditNote(evt.target.value)}
                      placeholder="Add a note..."
                      className="w-full bg-background rounded-md px-2.5 py-2 text-sm outline-none border border-border/40 focus:ring-2 focus:ring-ring/30"
                      onClick={evt => evt.stopPropagation()}
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-1">
                    <button
                      onClick={(evt) => {
                        evt.stopPropagation();
                        setEditingId(null);
                      }}
                      className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={(evt) => {
                        evt.stopPropagation();
                        handleUpdate(e.id);
                      }}
                      className="px-6 py-2 text-xs font-bold bg-section-expense text-primary-foreground rounded-lg active:scale-95 transition-all shadow-sm"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {expenses.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">No expenses found for this category in this period</div>
        )}
      </div>
    </div>
  );
}
const SpendingCalendar = ({
  data,
  activeStart,
  onDayClick,
  variant = "full"
}: {
  data: any;
  activeStart: string;
  onDayClick: (date: string) => void;
  variant?: "full" | "compact";
}) => {
  const d = new Date(activeStart + "T12:00:00");
  const year = d.getFullYear();
  const month = d.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = getISTDateStr();

  const spendingByDay = useMemo(() => {
    const map = new Map<string, number>();
    data.expenses.forEach((e: any) => {
      const current = map.get(e.date) || 0;
      map.set(e.date, current + e.amount);
    });
    return map;
  }, [data.expenses]);

  const avg = useMemo(() => {
    const expenses = data.expenses.filter((e: any) => {
      const d = new Date(e.date + "T12:00:00");
      return d.getFullYear() === year && d.getMonth() === month;
    });
    if (expenses.length === 0) return 0;
    const total = expenses.reduce((s: number, e: any) => s + e.amount, 0);
    return total / daysInMonth;
  }, [data.expenses, year, month, daysInMonth]);

  const getHeatmapStyles = (spent: number) => {
    if (spent === 0) return "bg-card";
    const ratio = spent / avg;

    if (ratio > 1.0) return "bg-rose-50/80 text-rose-900"; // Single light red for overspending
    return "bg-card"; // Neutral for others
  };

  const monthName = d.toLocaleDateString("en", { month: "long", year: "numeric" });
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className={cn(
      "overflow-hidden",
      variant === "full" ? "bg-card rounded-xl border border-border/60 shadow-sm" : "bg-transparent"
    )}>
      {variant === "full" && (
        <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between bg-muted/10">
          <h2 className="text-sm font-bold text-foreground">{monthName}</h2>
          {avg > 0 && (
            <div className="text-right">
              <span className="text-[10px] text-muted-foreground mr-1.5 font-medium">Daily Avg</span>
              <span className="text-sm font-bold tabular-nums text-foreground">₹{avg.toFixed(0)}</span>
            </div>
          )}
        </div>
      )}
      <div className={cn(variant === "full" ? "p-2" : "p-1")}>
        <div className="grid grid-cols-7 gap-px bg-border/30 rounded-lg overflow-hidden border border-border/30">
          {dayNames.map(d => (
            <div key={d} className={cn(
              "bg-muted/50 text-center font-black text-muted-foreground uppercase tracking-tighter",
              variant === "full" ? "py-1.5 text-[9px]" : "py-0.5 text-[7px]"
            )}>
              {variant === "full" ? d : d[0]}
            </div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-card/50 min-h-[48px]" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const spent = spendingByDay.get(dateStr) || 0;
            const isToday = dateStr === todayStr;

            return (
              <div
                key={day}
                onClick={() => onDayClick(dateStr)}
                className={cn(
                  "flex flex-col items-center justify-start relative transition-all hover:opacity-80 cursor-pointer active:scale-95",
                  variant === "full" ? "min-h-[48px] p-1" : "min-h-[18px] p-0.5",
                  getHeatmapStyles(spent),
                  isToday && "ring-2 ring-primary/40 z-10"
                )}
              >
                <span className={cn(
                  "font-medium tabular-nums mb-auto",
                  variant === "full" ? "text-[12px]" : "text-[7px]",
                  isToday ? "text-primary" : "text-foreground"
                )}>
                  {day}
                </span>
                {spent > 0 && (
                  <span className={cn(
                    "font-medium leading-none pb-0.5 tracking-tighter text-foreground",
                    variant === "full" ? "text-[11px]" : "text-[6px]"
                  )}>
                    ₹{spent.toFixed(0)}
                  </span>
                )}
                {isToday && <div className={cn("absolute top-0.5 right-0.5 bg-primary rounded-full animate-pulse", variant === "full" ? "w-1 h-1" : "w-0.5 h-0.5")} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};



interface DrillLevel {
  label: string;
  start: string;
  end: string;
  level: "year" | "month" | "week" | "day" | "expense-category";
  category?: string;
}


const Insights = () => {
  const navigate = useNavigate();
  const life = useLifeData();
  const { data } = life;
  const { settings } = useFeatureSettings();
  const [period, setPeriod] = useState<Period>("month");
  const [offset, setOffset] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResults, setAuditResults] = useState<AuditResult[]>([]);
  const { user } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("ai_insights_history")
      .select("*")
      .eq("user_id", user.id)
      .eq("period_label", periodLabel(period, offset))
      .order("created_at", { ascending: false });
    setHistory(data || []);
  }, [user, period, offset]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const deleteInsight = async (id: string) => {
    const { error } = await supabase.from("ai_insights_history").delete().eq("id", id);
    if (!error) {
      setHistory(prev => prev.filter(i => i.id !== id));
    }
  };



  const handleAIAnalysis = async () => {
    setIsAnalyzing(true);
    setAiError(null);
    try {
      const enabledFeatures = Object.entries(settings)
        .filter(([_, enabled]) => enabled)
        .map(([key]) => key);

      const response = await generateAIAnalysis({
        data,
        periodLabel: periodLabel(period, offset),
        enabledFeatures,
        startDate: activeStart,
        endDate: activeEnd
      });

      setAiResponse(response);
    } catch (err: any) {
      setAiError(err.message || "Failed to generate AI analysis");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAudit = async () => {
    setIsAuditing(true);
    setAuditResults([]);
    try {
      const currentExpenses = data.expenses.filter(e => inRange(e.date, activeStart, activeEnd));
      const results = await auditExpenses(currentExpenses, expenseCategories);
      setAuditResults(results);
    } catch (err) {
      console.error("Audit failed:", err);
    } finally {
      setIsAuditing(false);
    }
  };

  const applySuggestion = (expenseId: string, suggested: string) => {
    life.updateExpense(expenseId, { category: suggested });
    setAuditResults(prev => prev.filter(r => r.id !== expenseId));
  };

  const discardSuggestion = (expenseId: string) => {
    setAuditResults(prev => prev.filter(r => r.id !== expenseId));
  };
  const [drillStack, setDrillStack] = useState<DrillLevel[]>([]);

  // Scroll to top when drilling down/up
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [drillStack.length]);
  const [start, end] = getDateRange(period, offset);
  const daysInRange = getDaysInRange(start, end);
  const todayStr = getISTDateStr();
  const daysPassed = useMemo(() => {
    return Math.max(1, daysInRange.filter(d => d <= todayStr).length);
  }, [daysInRange, todayStr]);
  const isCurrentPeriod = offset === 0;

  // Current drill level
  const currentDrill = drillStack.length > 0 ? drillStack[drillStack.length - 1] : null;
  const activeStart = currentDrill?.start || start;
  const activeEnd = currentDrill?.end || end;
  const activeLevel = currentDrill?.level || period;

  const subPeriods = useMemo(() => {
    if (activeLevel === "day") return [];
    return getSubPeriods(activeLevel as Period, activeStart, activeEnd);
  }, [activeLevel, activeStart, activeEnd]);

  const activeDaysInRange = getDaysInRange(activeStart, activeEnd);
  const activeDaysPassed = Math.max(1, activeDaysInRange.filter(d => d <= todayStr).length);

  // Clear AI states when period/range changes
  useEffect(() => {
    setAiResponse(null);
    setAiError(null);
    setAuditResults([]);
  }, [activeStart, activeEnd]);


  const getSubData = useCallback((s: string, e: string) => {
    const expenses = data.expenses.filter(ex => inRange(ex.date, s, e));
    const spent = expenses.reduce((sum, ex) => sum + ex.amount, 0);
    const calories = data.food.filter(f => inRange(f.date, s, e)).reduce((sum, f) => sum + (f.calories || 0), 0);
    const exercise = data.exercise.filter(ex => inRange(ex.date, s, e)).reduce((sum, ex) => sum + ex.duration, 0);
    const tasks = data.tasks.filter(t => inRange(t.date, s, e));
    const done = tasks.filter(t => t.done).length;
    return { spent, calories, exercise, tasks: `${done}/${tasks.length}` };
  }, [data]);

  const insights = useMemo(() => {
    // ── Expenses ──
    const expenses = data.expenses.filter(e => inRange(e.date, activeStart, activeEnd));
    const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
    const avgPerDay = totalSpent / activeDaysPassed;
    const categoryBreakdown = Object.entries(
      expenses.reduce<Record<string, number>>((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1]);
    const maxCatAmount = categoryBreakdown.length > 0 ? categoryBreakdown[0][1] : 0;

    const dailySpend = activeDaysInRange.map(d => ({
      date: d,
      amount: expenses.filter(e => e.date === d).reduce((s, e) => s + e.amount, 0),
    }));
    const highestDay = dailySpend.length > 0 ? dailySpend.reduce((a, b) => a.amount > b.amount ? a : b) : null;

    // ── Food ──
    const food = data.food.filter(f => inRange(f.date, activeStart, activeEnd));
    const totalCals = food.reduce((s, f) => s + (f.calories || 0), 0);
    const mealsLogged = food.length;
    const avgCalsPerDay = totalCals / activeDaysPassed;
    const mealBreakdown = Object.entries(
      food.reduce<Record<string, number>>((acc, f) => {
        acc[f.meal] = (acc[f.meal] || 0) + 1;
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1]);

    const mealChecks = data.mealChecks.filter(m => inRange(m.date, activeStart, activeEnd));
    const breakfastCount = mealChecks.filter(m => m.breakfast).length;
    const lunchCount = mealChecks.filter(m => m.lunch).length;
    const dinnerCount = mealChecks.filter(m => m.dinner).length;
    const snackCount = mealChecks.filter(m => m.snack).length;
    const allThreeMeals = mealChecks.filter(m => m.breakfast && m.lunch && m.dinner).length;

    // ── Exercise ──
    const exercise = data.exercise.filter(e => inRange(e.date, activeStart, activeEnd));
    const totalMinutes = exercise.reduce((s, e) => s + e.duration, 0);
    const sessions = exercise.length;
    const avgPerSession = sessions > 0 ? totalMinutes / sessions : 0;
    const activeDays = new Set(exercise.map(e => e.date)).size;
    const activityBreakdown = Object.entries(
      exercise.reduce<Record<string, number>>((acc, e) => {
        acc[e.activity] = (acc[e.activity] || 0) + e.duration;
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1]);

    // ── Habits ──
    const habitStats = data.habits.map(h => {
      const completedInRange = h.completedDates.filter(d => inRange(d, activeStart, activeEnd));
      const rate = (completedInRange.length / activeDaysPassed) * 100;
      let streak = 0;
      const today = getISTDateStr();
      const d = new Date(today + "T12:00:00");
      while (h.completedDates.includes(fmtLocal(d))) {
        streak++;
        d.setDate(d.getDate() - 1);
      }
      return { name: h.name, completed: completedInRange.length, total: activeDaysPassed, rate, streak };
    });
    const totalHabitDays = new Set(data.habits.flatMap(h => h.completedDates.filter(d => inRange(d, activeStart, activeEnd)))).size;

    // ── Tasks ──
    const tasks = data.tasks.filter(t => inRange(t.date, activeStart, activeEnd));
    const tasksDone = tasks.filter(t => t.done).length;
    const tasksTotal = tasks.length;
    const completionRate = tasksTotal > 0 ? (tasksDone / tasksTotal) * 100 : 0;
    const productiveDays = activeDaysInRange.map(d => ({
      date: d,
      done: tasks.filter(t => t.date === d && t.done).length
    })).sort((a, b) => b.done - a.done);
    const mostProductiveDay = productiveDays.find(d => d.done > 0);

    // ── Journal ──
    const journal = data.journal.filter(j => inRange(j.date, activeStart, activeEnd));
    const moodBreakdown = Object.entries(
      journal.reduce<Record<string, number>>((acc, j) => {
        acc[j.mood] = (acc[j.mood] || 0) + 1;
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1]);

    const dailyCals = activeDaysInRange.map(d => ({
      date: d,
      amount: food.filter(f => f.date === d).reduce((s, f) => s + (f.calories || 0), 0),
    }));

    const dailyExercise = activeDaysInRange.map(d => ({
      date: d,
      amount: exercise.filter(e => e.date === d).reduce((s, e) => s + e.duration, 0),
    }));

    return {
      expenses: { totalSpent, avgPerDay, categoryBreakdown, maxCatAmount, highestDay, count: expenses.length, dailySpend, items: expenses },
      food: { totalCals, mealsLogged, avgCalsPerDay, mealBreakdown, breakfastCount, lunchCount, dinnerCount, snackCount, allThreeMeals, daysInPeriod: activeDaysPassed, dailyCals },
      exercise: { totalMinutes, sessions, avgPerSession, activeDays, activityBreakdown, dailyExercise },
      habits: { habitStats, totalHabitDays },
      tasks: { tasksDone, tasksTotal, completionRate, mostProductiveDay },
      journal: { count: journal.length, moodBreakdown },
    };
  }, [data, activeStart, activeEnd, activeDaysPassed, activeDaysInRange]);



  const handleExport = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    try {
      // Defer insights calculations inside the handleExport so as not to clutter the render loop
      const tables = [];
      if (settings.expenses && insights.expenses.categoryBreakdown.length > 0) {
        tables.push({
          title: "Expenses Breakdown",
          head: ["Category", "Amount"],
          body: insights.expenses.categoryBreakdown.map(([cat, amt]) => [cat, `Rs ${amt.toFixed(2)}`]),
        });
      }
      if (settings.food && insights.food.mealBreakdown.length > 0) {
        tables.push({
          title: "Nutrition Summary",
          head: ["Meal", "Logs"],
          body: insights.food.mealBreakdown.map(([meal, count]) => [meal.toUpperCase(), count]),
        });
      }
      if (settings.exercise && insights.exercise.activityBreakdown.length > 0) {
        tables.push({
          title: "Exercise Summary",
          head: ["Activity", "Duration"],
          body: insights.exercise.activityBreakdown.map(([activity, mins]) => [activity, `${mins} min`]),
        });
      }
      if (settings.habits && insights.habits.habitStats.length > 0) {
        tables.push({
          title: "Habit Tracking",
          head: ["Habit", "Completion Rate", "Current Streak"],
          body: insights.habits.habitStats.map((h: any) => [h.name, `${Math.round(h.rate)}%`, `${h.streak} days`]),
        });
      }

      const summary = [];
      if (settings.expenses) summary.push({ label: "Total Spent", value: `Rs ${insights.expenses.totalSpent.toFixed(0)}` });
      if (settings.food) summary.push({ label: "Total Calories", value: `${insights.food.totalCals.toLocaleString()} cal` });
      if (settings.exercise) summary.push({ label: "Total Exercise", value: `${insights.exercise.totalMinutes} min` });
      if (settings.tasks) summary.push({ label: "Task Completion", value: `${Math.round(insights.tasks.completionRate)}%` });
      if (settings.journal) summary.push({ label: "Journal Entries", value: `${insights.journal.count} entries` });

      let calendarData = undefined;
      if (period === "month" && settings.expenses) {
        const d = new Date(activeStart + "T12:00:00");
        const year = d.getFullYear();
        const month = d.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const spendingByDay = new Map<string, number>();
        data.expenses.forEach((e: any) => {
          if (inRange(e.date, activeStart, activeEnd)) {
            const current = spendingByDay.get(e.date) || 0;
            spendingByDay.set(e.date, current + e.amount);
          }
        });

        calendarData = {
          monthName: periodLabel(period, offset),
          firstDay,
          daysInMonth,
          spendingByDay,
          year,
          month,
          avgPerDay: insights.expenses.avgPerDay
        };
      }

      if (settings.expenses && insights.expenses.items.length > 0) {
        // Group items by date for better organization
        const groupedItems: (string | number)[][] = [];
        const itemsByDate = new Map<string, any[]>();

        insights.expenses.items.forEach((e: any) => {
          const group = itemsByDate.get(e.date) || [];
          group.push(e);
          itemsByDate.set(e.date, group);
        });

        // Sort dates descending (newest first)
        const sortedDates = Array.from(itemsByDate.keys()).sort((a, b) => b.localeCompare(a));

        sortedDates.forEach(date => {
          const dayItems = itemsByDate.get(date)!;
          const dayTotal = dayItems.reduce((sum, e) => sum + e.amount, 0);

          // Add Date Header Row with Daily Total
          const d = new Date(date + "T12:00:00");
          const dateLabel = d.toLocaleDateString("en-IN", {
            weekday: 'long', day: "numeric", month: "long", year: "numeric"
          });
          groupedItems.push([dateLabel.toUpperCase(), `Rs ${dayTotal.toFixed(0)}`]);

          // Add transactions for this date
          dayItems.forEach(e => {
            // Match the UI format: Category + Note together
            const itemLabel = e.note ? `${e.category} - ${e.note}` : e.category;
            groupedItems.push([
              itemLabel,
              `Rs ${e.amount.toFixed(2)}`
            ]);
          });
        });

        tables.push({
          title: "Full Transaction History",
          head: ["ITEM / DESCRIPTION", "AMOUNT"],
          body: groupedItems
        });
      }

      const reportData: PdfReportData = {
        fileName: createPdfFileName("lifeflow-insights", periodLabel(period, offset)),
        title: "LifeFlow Insights Report",
        subtitle: `Data overview for ${periodLabel(period, offset)}`,
        themeColor: [40, 40, 40],
        summary,
        calendar: calendarData,
        tables,
      };

      await exportReportToPdf(reportData);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [exporting, period, offset, insights]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6 pb-20 space-y-4">
        {/* Header */}
        <header className="flex items-center gap-3 pb-1">
          <button
            onClick={() => {
              if (drillStack.length > 0) {
                setDrillStack(s => s.slice(0, -1));
              } else {
                navigate("/");
              }
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted hover:bg-muted-foreground/10 active:scale-95 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight leading-none">Insights</h1>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted rounded-md px-3 py-2 active:scale-95 transition-all disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? "Exporting…" : "Export PDF"}
          </button>
        </header>

        {/* Period toggle */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1 bg-muted rounded-lg p-0.5">
            {(["week", "month", "year"] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => { setPeriod(p); setOffset(0); setDrillStack([]); }}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-all active:scale-95",
                  period === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Date navigation */}
        <div className="flex items-center justify-between bg-card rounded-lg border border-border/60 px-2 py-1.5">
          <button onClick={() => { setOffset(o => o - 1); setDrillStack([]); }} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-muted active:scale-95 transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setOffset(0); setDrillStack([]); }}
            className={cn("text-sm font-medium px-3 py-0.5 rounded-md transition-all", isCurrentPeriod ? "text-foreground" : "text-primary hover:bg-primary/10 active:scale-95")}
          >
            {periodLabel(period, offset)}
          </button>
          <button
            onClick={() => { setOffset(o => o + 1); setDrillStack([]); }}
            disabled={isCurrentPeriod}
            className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-muted active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Drill-down breadcrumb */}
        {drillStack.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap text-xs">
            <button
              onClick={() => setDrillStack([])}
              className="text-primary hover:underline active:scale-95 transition-all"
            >
              {periodLabel(period, offset)}
            </button>
            {drillStack.map((level, i) => (
              <span key={i} className="flex items-center gap-1">
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
                {i < drillStack.length - 1 ? (
                  <button
                    onClick={() => setDrillStack(drillStack.slice(0, i + 1))}
                    className="text-primary hover:underline active:scale-95 transition-all"
                  >
                    {level.label}
                  </button>
                ) : (
                  <span className="font-medium text-foreground">{level.label}</span>
                )}
              </span>
            ))}
          </div>
        )}

        {/* Exportable content area */}
        <div ref={contentRef} className="space-y-4 bg-background rounded-xl p-1">


          {/* Day or Category detail view */}
          {activeLevel === "day" ? (
            <DayDetail
              date={activeStart}
              data={data}
              onBack={() => setDrillStack(s => s.slice(0, -1))}
              onUpdate={life.updateExpense}
              onRemove={life.removeExpense}
            />
          ) : activeLevel === "expense-category" ? (
            <CategoryExpensesDetail
              category={currentDrill?.category || ""}
              start={activeStart}
              end={activeEnd}
              data={data}
              onBack={() => setDrillStack(s => s.slice(0, -1))}
              onUpdate={life.updateExpense}
              onRemove={life.removeExpense}
            />
          ) : (
            <>
              {/* Spending Calendar View */}
              {activeLevel === "month" && settings.expenses && (
                <SpendingCalendar
                  data={data}
                  activeStart={activeStart}
                  onDayClick={(date) => setDrillStack(s => [...s, { label: date, start: date, end: date, level: "day" }])}
                />
              )}

              {activeLevel === "year" ? (
                <div className="space-y-6">
                  <div className="border border-border/60 rounded-2xl overflow-hidden bg-card shadow-sm">
                    <div className="grid grid-cols-4">
                      {[0, 1, 2, 3].map(qIdx => {
                        const qMonths = subPeriods.slice(qIdx * 3, (qIdx + 1) * 3);
                        const qStart = qMonths[0].start;
                        const qEnd = qMonths[2].end;
                        const qTotal = getSubData(qStart, qEnd).spent;

                        return (
                          <div key={`q-${qIdx}`} className="contents">
                            {qMonths.map((m, mIdx) => {
                              const mData = getSubData(m.start, m.end);
                              return (
                                <div
                                  key={m.label}
                                  className={cn(
                                    "p-3 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:bg-muted/10 hover:bg-muted/5 group",
                                    "border-b border-r border-border/40",
                                    qIdx === 3 && "border-b-0"
                                  )}
                                  onClick={() => setDrillStack(s => [...s, { label: m.label, start: m.start, end: m.end, level: "month" }])}
                                >
                                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">{m.label}</span>
                                  <span className="text-sm font-bold tabular-nums text-foreground">₹{mData.spent.toFixed(0)}</span>
                                </div>
                              );
                            })}
                            <div className={cn(
                              "p-3 flex flex-col items-center justify-center gap-1 bg-primary/[0.03]",
                              "border-b border-border/40",
                              qIdx === 3 && "border-b-0"
                            )}>
                              <span className="text-[10px] font-black uppercase tracking-widest text-primary/70">Q{qIdx + 1}</span>
                              <span className="text-sm font-black tabular-nums text-primary">₹{qTotal.toFixed(0)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Yearly Total Summary Card */}
                  <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-5 flex justify-between items-center shadow-inner mt-4">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-primary uppercase tracking-wider">Yearly Summary</span>
                      <p className="text-sm text-muted-foreground">Comprehensive overview of {periodLabel(period, offset)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black tabular-nums text-primary leading-none">₹{insights.expenses.totalSpent.toFixed(0)}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 font-medium italic">Avg ₹{insights.expenses.avgPerDay.toFixed(0)} / day</p>
                    </div>
                  </div>
                </div>
              ) : (
                <SubBreakdown
                  subPeriods={subPeriods}
                  getData={getSubData}
                  colorClass="bg-section-expense"
                  breakdownTitle={getBreakdownTitle(activeLevel as any)}
                  onRowClick={(rowStart, rowEnd, label) => {
                    const next = getNextLevel(activeLevel as any);
                    if (next) {
                      setDrillStack(s => [...s, { label, start: rowStart, end: rowEnd, level: next }]);
                    }
                  }}
                  settings={settings}
                />
              )}


              {/* ── Expenses ── */}
              {settings.expenses && (
                <Section
                  title="Expenses"
                  icon={<DollarSign className="w-4 h-4" />}
                  colorClass="bg-section-expense"
                  onTitleClick={() => navigate(`/insights/expenses?period=${period}&offset=${offset}`)}
                >
                  <MetricRow label="Total spent" value={`₹${insights.expenses.totalSpent.toFixed(2)}`} />
                  {/* <InsightChart data={insights.expenses.dailySpend} color="var(--section-expense)" /> */}
                  <MetricRow label="Daily average" value={`₹${insights.expenses.avgPerDay.toFixed(2)}`} />

                  {/* <MetricRow label="Transactions" value={String(insights.expenses.count)} /> */}
                  {/* {insights.expenses.highestDay && insights.expenses.highestDay.amount > 0 && (
                    <MetricRow
                      label="Biggest day"
                      value={`₹${insights.expenses.highestDay.amount.toFixed(2)}`}
                      sub={new Date(insights.expenses.highestDay.date + "T12:00:00").toLocaleDateString("en", { month: "short", day: "numeric" })}
                    />
                  )} */}
                  {insights.expenses.categoryBreakdown.length > 0 && (
                    <div className="mt-4 space-y-1">
                      <p className="text-xs text-muted-foreground font-medium mb-2 px-1">By category</p>
                      <CategoryPieChart data={insights.expenses.categoryBreakdown} />
                      {insights.expenses.categoryBreakdown.map(([cat, amt]) => (
                        <div
                          key={cat}
                          onClick={() => setDrillStack(s => [...s, { label: cat, start: activeStart, end: activeEnd, level: "expense-category", category: cat }])}
                          className="flex items-center justify-between px-2 py-2.5 rounded-lg hover:bg-muted/50 active:bg-muted/80 cursor-pointer transition-colors group"
                        >
                          <span className="text-xs font-medium text-foreground flex items-center gap-2">
                            {cat}
                            <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </span>
                          <div className="text-right">
                            <p className="text-xs font-semibold tabular-nums">₹{amt.toFixed(2)} - {((amt / insights.expenses.totalSpent) * 100).toFixed(0)}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </Section>
              )}

              {/* ── Food ── */}
              {settings.food && (
                <Section title="Nutrition" icon={<UtensilsCrossed className="w-4 h-4" />} colorClass="bg-section-food" onTitleClick={() => navigate("/insights/food")}>
                  <MetricRow label="Meals logged" value={String(insights.food.mealsLogged)} />
                  <MetricRow label="Total calories" value={insights.food.totalCals.toLocaleString()} sub="cal" />
                  <InsightChart data={insights.food.dailyCals} color="var(--section-food)" />
                  <MetricRow label="Daily avg calories" value={Math.round(insights.food.avgCalsPerDay).toLocaleString()} sub="cal" />

                  <div className="mt-3 space-y-1.5">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Meal consistency</p>
                    {[
                      { label: "Breakfast", count: insights.food.breakfastCount },
                      { label: "Lunch", count: insights.food.lunchCount },
                      { label: "Dinner", count: insights.food.dinnerCount },
                      { label: "Snack", count: insights.food.snackCount },
                    ].map(m => {
                      const rate = insights.food.daysInPeriod > 0 ? (m.count / insights.food.daysInPeriod) * 100 : 0;
                      return (
                        <div key={m.label} className="space-y-0.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{m.label}</span>
                            <span className="tabular-nums font-medium">{m.count}/{insights.food.daysInPeriod} <span className="text-muted-foreground">({Math.round(rate)}%)</span></span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-section-food rounded-full transition-all duration-500" style={{ width: `${rate}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    {insights.food.allThreeMeals > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-2">
                        ✅ All 3 main meals on <span className="font-semibold text-foreground">{insights.food.allThreeMeals}</span> day{insights.food.allThreeMeals !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                  {insights.food.mealBreakdown.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs text-muted-foreground font-medium mb-1">Food entries by meal</p>
                      {insights.food.mealBreakdown.map(([meal, count]) => (
                        <div key={meal} className="flex justify-between text-xs">
                          <span className="text-muted-foreground capitalize">{meal}</span>
                          <span className="tabular-nums font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>
              )}

              {/* ── Exercise ── */}
              {settings.exercise && (
                <Section title="Exercise" icon={<Dumbbell className="w-4 h-4" />} colorClass="bg-section-exercise" onTitleClick={() => navigate("/insights/exercise")}>
                  <MetricRow label="Total time" value={`${insights.exercise.totalMinutes} min`} />
                  <MetricRow label="Active days" value={String(insights.exercise.activeDays)} />
                  <InsightChart data={insights.exercise.dailyExercise} color="var(--section-exercise)" />
                  <MetricRow label="Avg duration" value={`${insights.exercise.avgPerSession.toFixed(1)} min`} />

                  {insights.exercise.activityBreakdown.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs text-muted-foreground font-medium mb-1">By activity</p>
                      {insights.exercise.activityBreakdown.map(([activity, mins]) => (
                        <div key={activity} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{activity}</span>
                          <span className="tabular-nums font-medium">{mins} min</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>
              )}

              {/* ── Habits ── */}
              {settings.habits && (
                <Section title="Habits" icon={<Target className="w-4 h-4" />} colorClass="bg-section-habits" onTitleClick={() => navigate("/insights/habits")}>
                  <MetricRow label="Active habits" value={String(insights.habits.habitStats.length)} />
                  <MetricRow label="Total completions" value={String(insights.habits.totalHabitDays)} sub={`across all`} />
                  {insights.habits.habitStats.length > 0 && (
                    <div className="mt-3 space-y-2.5">
                      <p className="text-xs text-muted-foreground font-medium mb-1">Top habits</p>
                      {insights.habits.habitStats.slice(0, 3).map(h => (
                        <div key={h.name} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{h.name}</span>
                            <span className="tabular-nums font-medium">{Math.round(h.rate)}%</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-section-habits rounded-full transition-all duration-500" style={{ width: `${h.rate}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>
              )}

              {/* ── Tasks ── */}
              {settings.tasks && (
                <Section title="Productivity" icon={<ListTodo className="w-4 h-4" />} colorClass="bg-section-tasks" onTitleClick={() => navigate("/insights/tasks")}>
                  <MetricRow label="Tasks completed" value={`${insights.tasks.tasksDone}/${insights.tasks.tasksTotal}`} />
                  <MetricRow label="Completion rate" value={`${Math.round(insights.tasks.completionRate)}%`} />
                  {insights.tasks.mostProductiveDay && (
                    <MetricRow
                      label="Most productive"
                      value={`${insights.tasks.mostProductiveDay.done} tasks`}
                      sub={new Date(insights.tasks.mostProductiveDay.date + "T12:00:00").toLocaleDateString("en", { month: "short", day: "numeric" })}
                    />
                  )}
                </Section>
              )}

              {/* AI Sections at the bottom */}
              {activeLevel === "month" && (
                <div className="mt-8 pt-4 border-t border-border/20 space-y-6">
                  {/* AI Analysis Section */}
                  <div className="bg-card rounded-xl border border-border/60 overflow-hidden">
                    <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary/10 text-primary">
                          <Sparkles className="w-4 h-4" />
                        </span>
                        <h2 className="text-sm font-semibold">AI Insights</h2>
                      </div>
                      <button
                        onClick={handleAIAnalysis}
                        disabled={isAnalyzing}
                        className="text-xs font-medium text-primary hover:bg-primary/5 px-2 py-1 rounded-md transition-all disabled:opacity-50"
                      >
                        {isAnalyzing ? "Analyzing..." : "Regenerate"}
                      </button>
                    </div>
                    <div className="p-4">
                      {!aiResponse && !aiError && !isAnalyzing && (
                        <div className="text-center py-4 space-y-3">
                          <p className="text-xs text-muted-foreground">Get personalized insights and recommendations based on your data.</p>
                          <button
                            onClick={handleAIAnalysis}
                            className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-xs font-medium px-4 py-2 rounded-lg hover:bg-primary/90 active:scale-95 transition-all shadow-sm"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Generate AI Analysis
                          </button>
                        </div>
                      )}

                      {isAnalyzing && (
                        <div className="flex flex-col items-center justify-center py-8 space-y-3">
                          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                          <p className="text-xs text-muted-foreground animate-pulse">Consulting the AI coach...</p>
                        </div>
                      )}

                      {aiError && (
                        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 flex gap-2 items-start">
                          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                          <p className="text-xs text-destructive">{aiError}</p>
                        </div>
                      )}

                      {aiResponse && !isAnalyzing && (
                        <div className="prose prose-sm dark:prose-invert max-w-none ai-insights-content">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {aiResponse}
                          </ReactMarkdown>
                        </div>
                      )}

                      {/* Saved Insights History */}
                      {history.length > 0 && (
                        <div className="mt-6 border-t border-border/20 pt-4 space-y-3">
                          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">Saved Insights History</h3>
                          <div className="divide-y divide-border/20">
                            {history.map((item) => {
                              const isOpen = expandedId === item.id;
                              const date = new Date(item.created_at).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
                              return (
                                <div key={item.id} className="py-2.5">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => setExpandedId(isOpen ? null : item.id)}
                                      className="flex-1 min-w-0 flex items-center gap-2 text-left active:scale-[0.99] transition-all"
                                    >
                                      <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform", isOpen ? "rotate-0" : "-rotate-90")} />
                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium truncate">{item.period_label}</p>
                                        <p className="text-[10px] text-muted-foreground">{date}</p>
                                      </div>
                                    </button>
                                    <button
                                      onClick={() => deleteInsight(item.id)}
                                      className="w-7 h-7 rounded-md flex items-center justify-center text-destructive hover:bg-destructive/10 active:scale-95 transition-all"
                                      aria-label="Delete insight"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  {isOpen && (
                                    <div className="mt-3 prose prose-sm dark:prose-invert max-w-none ai-insights-content bg-muted/30 rounded-lg p-3">
                                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.content}</ReactMarkdown>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Smart Auditor Section */}
                  <div className="bg-card rounded-xl border border-border/60 overflow-hidden">
                    <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between bg-amber-50/5">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-amber-500/10 text-amber-600">
                          <Sparkles className="w-4 h-4" />
                        </span>
                        <h2 className="text-sm font-semibold">Smart Auditor</h2>
                      </div>
                      <button
                        onClick={handleAudit}
                        disabled={isAuditing}
                        className="text-xs font-medium text-amber-600 hover:bg-amber-500/10 px-2 py-1 rounded-md transition-all disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isAuditing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                        Scan for Anomalies
                      </button>
                    </div>
                    <div className="p-4">
                      {auditResults.length > 0 ? (
                        <div className="space-y-3">
                          <p className="text-[10px] text-amber-600 font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-1">
                            <Info className="w-3 h-3" /> {auditResults.length} potential mismatches found
                          </p>
                          {auditResults.map(result => {
                            const expense = data.expenses.find(e => e.id === result.id);
                            if (!expense) return null;
                            return (
                              <div key={result.id} className="bg-amber-500/[0.03] border border-amber-200/40 rounded-lg p-3 space-y-2">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1 pr-4">
                                    <p className="text-xs font-bold text-foreground">"{expense.note}"</p>
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                      Current: <span className="line-through">{expense.category}</span> → Suggestion: <span className="text-amber-600 font-bold">{result.suggested}</span>
                                    </p>
                                  </div>
                                  <div className="flex gap-2 shrink-0">
                                    <button
                                      onClick={() => discardSuggestion(result.id)}
                                      className="text-[10px] font-bold text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-muted transition-colors"
                                    >
                                      Discard
                                    </button>
                                    <button
                                      onClick={() => applySuggestion(result.id, result.suggested)}
                                      className="bg-amber-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-md hover:bg-amber-700 transition-colors flex items-center gap-1 shadow-sm"
                                    >
                                      <Check className="w-3 h-3" /> Apply
                                    </button>
                                  </div>
                                </div>
                                <p className="text-[10px] text-amber-800/70 italic leading-relaxed border-t border-amber-200/20 pt-2">
                                  "{result.reason}"
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      ) : !isAuditing && (
                        <div className="text-center py-4">
                          <p className="text-xs text-muted-foreground italic">No categorization anomalies detected in the current range.</p>
                        </div>
                      )}
                      {isAuditing && (
                        <div className="flex flex-col items-center justify-center py-8 space-y-3">
                          <div className="w-6 h-6 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                          <p className="text-[10px] text-muted-foreground animate-pulse">Auditing your descriptions...</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Insights;

import { useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, ChevronLeft, ChevronRight, DollarSign, UtensilsCrossed, Dumbbell, Target,
  ListTodo, BookOpen, TrendingUp, TrendingDown, Flame, Award, Download
} from "lucide-react";
import { useLifeData } from "@/hooks/useLifeData";
import { cn, getISTDateStr } from "@/lib/utils";

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
}

function SubBreakdown({ subPeriods, getData, colorClass, breakdownTitle, onRowClick }: SubBreakdownProps) {
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
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40 text-muted-foreground">
              <th className="text-left px-4 py-2.5 font-medium">Period</th>
              <th className="text-right px-3 py-2.5 font-medium">Spent</th>
              <th className="text-right px-3 py-2.5 font-medium">Cal</th>
              <th className="text-right px-3 py-2.5 font-medium">Exercise</th>
              <th className="text-right px-4 py-2.5 font-medium">Tasks</th>
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
                  <td className="text-right px-3 py-2 tabular-nums">
                    <div className="flex items-center justify-end gap-1.5">
                      <span>₹{r.spent.toFixed(0)}</span>
                    </div>
                  </td>
                  <td className="text-right px-3 py-2 tabular-nums text-muted-foreground">{r.calories > 0 ? r.calories.toLocaleString() : "–"}</td>
                  <td className="text-right px-3 py-2 tabular-nums text-muted-foreground">{r.exercise > 0 ? `${r.exercise}m` : "–"}</td>
                  <td className="text-right px-4 py-2 tabular-nums">{r.tasks}</td>
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
function DayDetail({ date, data: lifeData, onBack }: { date: string; data: any; onBack: () => void }) {
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
          {expenses.map((e: any) => (
            <div key={e.id} className="flex justify-between items-center py-1.5 border-b border-border/20 last:border-0">
              <div>
                <span className="text-xs font-medium">{e.category}</span>
                {e.note && <span className="text-[10px] text-muted-foreground ml-2">{e.note}</span>}
              </div>
              <span className="text-xs font-semibold tabular-nums">₹{e.amount.toFixed(2)}</span>
            </div>
          ))}
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

interface DrillLevel {
  label: string;
  start: string;
  end: string;
  level: "year" | "month" | "week" | "day";
}

const Insights = () => {
  const navigate = useNavigate();
  const { data } = useLifeData();
  const [period, setPeriod] = useState<Period>("month");
  const [offset, setOffset] = useState(0);
  const [exporting, setExporting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [drillStack, setDrillStack] = useState<DrillLevel[]>([]);
  const [start, end] = getDateRange(period, offset);
  const daysInRange = getDaysInRange(start, end);
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

  const getSubData = useCallback((s: string, e: string) => {
    const expenses = data.expenses.filter(ex => inRange(ex.date, s, e));
    const spent = expenses.reduce((sum, ex) => sum + ex.amount, 0);
    const calories = data.food.filter(f => inRange(f.date, s, e)).reduce((sum, f) => sum + (f.calories || 0), 0);
    const exercise = data.exercise.filter(ex => inRange(ex.date, s, e)).reduce((sum, ex) => sum + ex.duration, 0);
    const tasks = data.tasks.filter(t => inRange(t.date, s, e));
    const done = tasks.filter(t => t.done).length;
    return { spent, calories, exercise, tasks: `${done}/${tasks.length}` };
  }, [data]);

  const handleExport = useCallback(async () => {
    if (!contentRef.current || exporting) return;
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(contentRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `lifeflow-insights-${periodLabel(period, offset).replace(/\s+/g, "-")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [exporting, period, offset]);

  const insights = useMemo(() => {
    // ── Expenses ──
    const expenses = data.expenses.filter(e => inRange(e.date, start, end));
    const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
    const avgPerDay = daysInRange.length > 0 ? totalSpent / daysInRange.length : 0;
    const categoryBreakdown = Object.entries(
      expenses.reduce<Record<string, number>>((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1]);
    const maxCatAmount = categoryBreakdown.length > 0 ? categoryBreakdown[0][1] : 0;

    const dailySpend = daysInRange.map(d => ({
      date: d,
      amount: expenses.filter(e => e.date === d).reduce((s, e) => s + e.amount, 0),
    }));
    const highestDay = dailySpend.length > 0 ? dailySpend.reduce((a, b) => a.amount > b.amount ? a : b) : null;

    // ── Food ──
    const food = data.food.filter(f => inRange(f.date, start, end));
    const totalCals = food.reduce((s, f) => s + (f.calories || 0), 0);
    const mealsLogged = food.length;
    const avgCalsPerDay = daysInRange.length > 0 ? totalCals / daysInRange.length : 0;
    const mealBreakdown = Object.entries(
      food.reduce<Record<string, number>>((acc, f) => {
        acc[f.meal] = (acc[f.meal] || 0) + 1;
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1]);

    const mealChecks = data.mealChecks.filter(m => inRange(m.date, start, end));
    const breakfastCount = mealChecks.filter(m => m.breakfast).length;
    const lunchCount = mealChecks.filter(m => m.lunch).length;
    const dinnerCount = mealChecks.filter(m => m.dinner).length;
    const snackCount = mealChecks.filter(m => m.snack).length;
    const allThreeMeals = mealChecks.filter(m => m.breakfast && m.lunch && m.dinner).length;

    // ── Exercise ──
    const exercise = data.exercise.filter(e => inRange(e.date, start, end));
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
      const completedInRange = h.completedDates.filter(d => inRange(d, start, end));
      const rate = daysInRange.length > 0 ? (completedInRange.length / daysInRange.length) * 100 : 0;
      let streak = 0;
  const today = getISTDateStr();
      const d = new Date(today + "T12:00:00");
      while (h.completedDates.includes(fmtLocal(d))) {
        streak++;
        d.setDate(d.getDate() - 1);
      }
      return { name: h.name, completed: completedInRange.length, total: daysInRange.length, rate, streak };
    });
    const totalHabitDays = new Set(data.habits.flatMap(h => h.completedDates.filter(d => inRange(d, start, end)))).size;

    // ── Tasks ──
    const tasks = data.tasks.filter(t => inRange(t.date, start, end));
    const tasksDone = tasks.filter(t => t.done).length;
    const tasksTotal = tasks.length;
    const completionRate = tasksTotal > 0 ? (tasksDone / tasksTotal) * 100 : 0;
    const productiveDays = daysInRange.map(d => ({
      date: d,
      done: tasks.filter(t => t.date === d && t.done).length,
    })).sort((a, b) => b.done - a.done);
    const mostProductiveDay = productiveDays.find(d => d.done > 0);

    // ── Journal ──
    const journal = data.journal.filter(j => inRange(j.date, start, end));
    const moodBreakdown = Object.entries(
      journal.reduce<Record<string, number>>((acc, j) => {
        acc[j.mood] = (acc[j.mood] || 0) + 1;
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1]);

    return {
      expenses: { totalSpent, avgPerDay, categoryBreakdown, maxCatAmount, highestDay, count: expenses.length },
      food: { totalCals, mealsLogged, avgCalsPerDay, mealBreakdown, breakfastCount, lunchCount, dinnerCount, snackCount, allThreeMeals, daysInPeriod: daysInRange.length },
      exercise: { totalMinutes, sessions, avgPerSession, activeDays, activityBreakdown },
      habits: { habitStats, totalHabitDays },
      tasks: { tasksDone, tasksTotal, completionRate, mostProductiveDay },
      journal: { count: journal.length, moodBreakdown },
    };
  }, [data, start, end, daysInRange]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6 pb-20 space-y-4">
        {/* Header */}
        <header className="flex items-center gap-3 pb-1">
          <button
            onClick={() => navigate("/")}
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
            {exporting ? "Exporting…" : "Export"}
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
          {/* Day detail view */}
          {activeLevel === "day" ? (
            <DayDetail
              date={activeStart}
              data={data}
              onBack={() => setDrillStack(s => s.slice(0, -1))}
            />
          ) : (
            <>
              {/* Sub-period breakdown table */}
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
              />

          {/* ── Expenses ── */}
          <Section title="Expenses" icon={<DollarSign className="w-4 h-4" />} colorClass="bg-section-expense" onTitleClick={() => navigate("/insights/expenses")}>
            <MetricRow label="Total spent" value={`₹${insights.expenses.totalSpent.toFixed(2)}`} />
            <MetricRow label="Daily average" value={`₹${insights.expenses.avgPerDay.toFixed(2)}`} />
            <MetricRow label="Transactions" value={String(insights.expenses.count)} />
            {insights.expenses.highestDay && insights.expenses.highestDay.amount > 0 && (
              <MetricRow
                label="Biggest day"
                value={`₹${insights.expenses.highestDay.amount.toFixed(2)}`}
                sub={new Date(insights.expenses.highestDay.date + "T12:00:00").toLocaleDateString("en", { month: "short", day: "numeric" })}
              />
            )}
            {insights.expenses.categoryBreakdown.length > 0 && (
              <>
                <p className="text-xs text-muted-foreground font-medium mt-3 mb-1">By category</p>
                <MiniBar
                  values={insights.expenses.categoryBreakdown.map(([label, amount]) => ({ label, amount }))}
                  max={insights.expenses.maxCatAmount}
                  colorClass="bg-section-expense"
                />
              </>
            )}
          </Section>

          {/* ── Food ── */}
          <Section title="Nutrition" icon={<UtensilsCrossed className="w-4 h-4" />} colorClass="bg-section-food" onTitleClick={() => navigate("/insights/food")}>
            <MetricRow label="Meals logged" value={String(insights.food.mealsLogged)} />
            <MetricRow label="Total calories" value={insights.food.totalCals.toLocaleString()} sub="cal" />
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

          {/* ── Exercise ── */}
          <Section title="Exercise" icon={<Dumbbell className="w-4 h-4" />} colorClass="bg-section-exercise" onTitleClick={() => navigate("/insights/exercise")}>
            <MetricRow label="Total time" value={`${insights.exercise.totalMinutes} min`} />
            <MetricRow label="Sessions" value={String(insights.exercise.sessions)} />
            <MetricRow label="Avg per session" value={`${Math.round(insights.exercise.avgPerSession)} min`} />
            <MetricRow label="Active days" value={String(insights.exercise.activeDays)} sub={`of ${daysInRange.length}`} />
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

          {/* ── Habits ── */}
          <Section title="Habits" icon={<Target className="w-4 h-4" />} colorClass="bg-section-habits" onTitleClick={() => navigate("/insights/habits")}>
            <MetricRow label="Active days" value={String(insights.habits.totalHabitDays)} sub={`of ${daysInRange.length}`} />
            {insights.habits.habitStats.length > 0 ? (
              <div className="mt-3 space-y-2.5">
                {insights.habits.habitStats.map(h => (
                  <div key={h.name} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{h.name}</span>
                      <div className="flex items-center gap-2">
                        {h.streak > 0 && (
                          <span className="flex items-center gap-0.5 text-[10px] text-destructive font-medium">
                            <Flame className="w-3 h-3" />{h.streak}d
                          </span>
                        )}
                        <span className="text-xs tabular-nums text-muted-foreground">{Math.round(h.rate)}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-section-habits rounded-full transition-all duration-500" style={{ width: `${h.rate}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-2">No habits tracked yet</p>
            )}
          </Section>

          {/* ── Tasks ── */}
          <Section title="Tasks" icon={<ListTodo className="w-4 h-4" />} colorClass="bg-section-tasks" onTitleClick={() => navigate("/insights/tasks")}>
            <MetricRow label="Completed" value={`${insights.tasks.tasksDone}/${insights.tasks.tasksTotal}`} />
            <MetricRow label="Completion rate" value={`${Math.round(insights.tasks.completionRate)}%`} />
            {insights.tasks.mostProductiveDay && (
              <MetricRow
                label="Most productive day"
                value={`${insights.tasks.mostProductiveDay.done} tasks`}
                sub={new Date(insights.tasks.mostProductiveDay.date + "T12:00:00").toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}
              />
            )}
            {insights.tasks.tasksTotal > 0 && (
              <div className="mt-3 flex items-center gap-2">
                {insights.tasks.completionRate >= 80 ? (
                  <span className="flex items-center gap-1 text-xs text-accent"><Award className="w-3.5 h-3.5" />Great productivity!</span>
                ) : insights.tasks.completionRate >= 50 ? (
                  <span className="flex items-center gap-1 text-xs text-primary"><TrendingUp className="w-3.5 h-3.5" />Getting there, keep going!</span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground"><TrendingDown className="w-3.5 h-3.5" />Try breaking tasks smaller</span>
                )}
              </div>
            )}
          </Section>

          {/* ── Journal ── */}
          <Section title="Journal" icon={<BookOpen className="w-4 h-4" />} colorClass="bg-section-journal" onTitleClick={() => navigate("/insights/journal")}>
            <MetricRow label="Entries" value={String(insights.journal.count)} />
            <MetricRow label="Journaling days" value={String(insights.journal.count)} sub={`of ${daysInRange.length}`} />
            {insights.journal.moodBreakdown.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="text-[11px] text-muted-foreground font-medium mb-1">Mood distribution</p>
                {insights.journal.moodBreakdown.map(([mood, count]) => (
                  <div key={mood} className="flex justify-between text-xs">
                    <span>{mood}</span>
                    <span className="tabular-nums font-medium">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Insights;

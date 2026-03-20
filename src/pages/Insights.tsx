import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, DollarSign, UtensilsCrossed, Dumbbell, Target,
  ListTodo, BookOpen, TrendingUp, TrendingDown, Flame, Award
} from "lucide-react";
import { useLifeData } from "@/hooks/useLifeData";
import { cn } from "@/lib/utils";

type Period = "week" | "month" | "year";

function pad(n: number) { return String(n).padStart(2, "0"); }
function fmtLocal(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

function getDateRange(period: Period): [string, string] {
  const now = new Date();
  if (period === "week") {
    const day = now.getDay();
    const start = new Date(now); start.setDate(now.getDate() - day);
    const end = new Date(start); end.setDate(start.getDate() + 6);
    return [fmtLocal(start), fmtLocal(end)];
  }
  if (period === "month") {
    return [fmtLocal(new Date(now.getFullYear(), now.getMonth(), 1)), fmtLocal(new Date(now.getFullYear(), now.getMonth() + 1, 0))];
  }
  return [fmtLocal(new Date(now.getFullYear(), 0, 1)), fmtLocal(new Date(now.getFullYear(), 11, 31))];
}

function inRange(date: string, start: string, end: string) {
  return date >= start && date <= end;
}

function periodLabel(period: Period): string {
  const now = new Date();
  if (period === "week") {
    const [s, e] = getDateRange("week");
    const sf = new Date(s + "T12:00:00").toLocaleDateString("en", { month: "short", day: "numeric" });
    const ef = new Date(e + "T12:00:00").toLocaleDateString("en", { month: "short", day: "numeric" });
    return `${sf} – ${ef}`;
  }
  if (period === "month") return now.toLocaleDateString("en", { month: "long", year: "numeric" });
  return now.getFullYear().toString();
}

// Daily breakdown helper
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

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  colorClass: string;
  children: React.ReactNode;
}

function Section({ title, icon, colorClass, children }: SectionProps) {
  return (
    <div className="bg-card rounded-xl border border-border/60 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
        <span className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-primary-foreground", colorClass)}>
          {icon}
        </span>
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function MetricRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between py-1.5 border-b border-border/30 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className="text-sm font-semibold tabular-nums">{value}</span>
        {sub && <span className="text-[10px] text-muted-foreground ml-1.5">{sub}</span>}
      </div>
    </div>
  );
}

function MiniBar({ values, max, colorClass }: { values: { label: string; amount: number }[]; max: number; colorClass: string }) {
  return (
    <div className="space-y-1.5 mt-2">
      {values.map(v => (
        <div key={v.label} className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground w-16 truncate">{v.label}</span>
          <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", colorClass)}
              style={{ width: `${max > 0 ? (v.amount / max) * 100 : 0}%` }}
            />
          </div>
          <span className="text-[11px] tabular-nums font-medium w-12 text-right">${v.amount.toFixed(0)}</span>
        </div>
      ))}
    </div>
  );
}

const Insights = () => {
  const navigate = useNavigate();
  const { data } = useLifeData();
  const [period, setPeriod] = useState<Period>("month");
  const [start, end] = getDateRange(period);
  const daysInRange = getDaysInRange(start, end);

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
      // Current streak
      let streak = 0;
      const today = fmtLocal(new Date());
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
      food: { totalCals, mealsLogged, avgCalsPerDay, mealBreakdown },
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
            <p className="text-xs text-muted-foreground mt-0.5">{periodLabel(period)}</p>
          </div>
        </header>

        {/* Period toggle */}
        <div className="flex gap-1 bg-muted rounded-lg p-0.5 w-fit">
          {(["week", "month", "year"] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-4 py-1.5 text-xs font-medium rounded-md transition-all active:scale-95",
                period === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Expenses ── */}
        <Section title="Expenses" icon={<DollarSign className="w-4 h-4" />} colorClass="bg-section-expense">
          <MetricRow label="Total spent" value={`$${insights.expenses.totalSpent.toFixed(2)}`} />
          <MetricRow label="Daily average" value={`$${insights.expenses.avgPerDay.toFixed(2)}`} />
          <MetricRow label="Transactions" value={String(insights.expenses.count)} />
          {insights.expenses.highestDay && insights.expenses.highestDay.amount > 0 && (
            <MetricRow
              label="Biggest day"
              value={`$${insights.expenses.highestDay.amount.toFixed(2)}`}
              sub={new Date(insights.expenses.highestDay.date + "T12:00:00").toLocaleDateString("en", { month: "short", day: "numeric" })}
            />
          )}
          {insights.expenses.categoryBreakdown.length > 0 && (
            <>
              <p className="text-[11px] text-muted-foreground font-medium mt-3 mb-1">By category</p>
              <MiniBar
                values={insights.expenses.categoryBreakdown.map(([label, amount]) => ({ label, amount }))}
                max={insights.expenses.maxCatAmount}
                colorClass="bg-section-expense"
              />
            </>
          )}
        </Section>

        {/* ── Food ── */}
        <Section title="Nutrition" icon={<UtensilsCrossed className="w-4 h-4" />} colorClass="bg-section-food">
          <MetricRow label="Meals logged" value={String(insights.food.mealsLogged)} />
          <MetricRow label="Total calories" value={insights.food.totalCals.toLocaleString()} sub="cal" />
          <MetricRow label="Daily avg calories" value={Math.round(insights.food.avgCalsPerDay).toLocaleString()} sub="cal" />
          {insights.food.mealBreakdown.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-[11px] text-muted-foreground font-medium mb-1">Meals breakdown</p>
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
        <Section title="Exercise" icon={<Dumbbell className="w-4 h-4" />} colorClass="bg-section-exercise">
          <MetricRow label="Total time" value={`${insights.exercise.totalMinutes} min`} />
          <MetricRow label="Sessions" value={String(insights.exercise.sessions)} />
          <MetricRow label="Avg per session" value={`${Math.round(insights.exercise.avgPerSession)} min`} />
          <MetricRow label="Active days" value={String(insights.exercise.activeDays)} sub={`of ${daysInRange.length}`} />
          {insights.exercise.activityBreakdown.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-[11px] text-muted-foreground font-medium mb-1">By activity</p>
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
        <Section title="Habits" icon={<Target className="w-4 h-4" />} colorClass="bg-section-habits">
          <MetricRow label="Active days" value={String(insights.habits.totalHabitDays)} sub={`of ${daysInRange.length}`} />
          {insights.habits.habitStats.length > 0 ? (
            <div className="mt-3 space-y-2.5">
              {insights.habits.habitStats.map(h => (
                <div key={h.name} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{h.name}</span>
                    <div className="flex items-center gap-2">
                      {h.streak > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-orange-500 font-medium">
                          <Flame className="w-3 h-3" />{h.streak}d
                        </span>
                      )}
                      <span className="text-[11px] tabular-nums text-muted-foreground">{Math.round(h.rate)}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-section-habits rounded-full transition-all duration-500"
                      style={{ width: `${h.rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-2">No habits tracked yet</p>
          )}
        </Section>

        {/* ── Tasks ── */}
        <Section title="Tasks" icon={<ListTodo className="w-4 h-4" />} colorClass="bg-section-tasks">
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
                <span className="flex items-center gap-1 text-xs text-green-600"><Award className="w-3.5 h-3.5" />Great productivity!</span>
              ) : insights.tasks.completionRate >= 50 ? (
                <span className="flex items-center gap-1 text-xs text-amber-600"><TrendingUp className="w-3.5 h-3.5" />Getting there, keep going!</span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><TrendingDown className="w-3.5 h-3.5" />Try breaking tasks smaller</span>
              )}
            </div>
          )}
        </Section>

        {/* ── Journal ── */}
        <Section title="Journal" icon={<BookOpen className="w-4 h-4" />} colorClass="bg-section-journal">
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
      </div>
    </div>
  );
};

export default Insights;

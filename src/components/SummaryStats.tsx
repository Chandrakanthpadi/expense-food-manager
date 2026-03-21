import { useState, useMemo } from "react";
import { DollarSign, UtensilsCrossed, Dumbbell, Target, ListTodo, BookOpen } from "lucide-react";
import type { LifeData } from "@/hooks/useLifeData";
import { getISTDateStr } from "@/lib/utils";

type Period = "week" | "month" | "year";

interface Props {
  data: LifeData;
  selectedDate: string;
}

function getDateRange(selectedDate: string, period: Period): [string, string] {
  const d = new Date(selectedDate + "T12:00:00");

  if (period === "week") {
    const day = d.getDay();
    const start = new Date(d);
    start.setDate(d.getDate() - day);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return [fmt(start), fmt(end)];
  }

  if (period === "month") {
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return [fmt(start), fmt(end)];
  }

  const start = new Date(d.getFullYear(), 0, 1);
  const end = new Date(d.getFullYear(), 11, 31);
  return [fmt(start), fmt(end)];
}

function fmt(d: Date) {
  return getISTDateStr(d);
}

function inRange(date: string, start: string, end: string) {
  return date >= start && date <= end;
}

function periodLabel(selectedDate: string, period: Period): string {
  const d = new Date(selectedDate + "T12:00:00");
  if (period === "week") {
    const [s, e] = getDateRange(selectedDate, "week");
    const sf = new Date(s + "T12:00:00").toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    const ef = new Date(e + "T12:00:00").toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    return `${sf} – ${ef}`;
  }
  if (period === "month") {
    return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  }
  return d.getFullYear().toString();
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  colorClass: string;
}

function StatCard({ icon, label, value, sub, colorClass }: StatCardProps) {
  return (
    <div className="bg-card rounded-lg p-3 space-y-1 border border-border/60">
      <div className="flex items-center gap-2">
        <span className={`w-6 h-6 rounded-md flex items-center justify-center text-primary-foreground ${colorClass}`}>
          {icon}
        </span>
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      </div>
      <p className="text-lg font-semibold tabular-nums leading-tight">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground leading-tight">{sub}</p>}
    </div>
  );
}

export function SummaryStats({ data, selectedDate }: Props) {
  const [period, setPeriod] = useState<Period>("month");
  const [start, end] = getDateRange(selectedDate, period);

  const stats = useMemo(() => {
    const expenses = data.expenses.filter(e => inRange(e.date, start, end));
    const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
    const topCategory = expenses.length
      ? Object.entries(expenses.reduce<Record<string, number>>((acc, e) => {
          acc[e.category] = (acc[e.category] || 0) + e.amount;
          return acc;
        }, {})).sort((a, b) => b[1] - a[1])[0]
      : null;

    const food = data.food.filter(f => inRange(f.date, start, end));
    const totalCals = food.reduce((s, f) => s + (f.calories || 0), 0);
    const mealsLogged = food.length;

    const exercise = data.exercise.filter(e => inRange(e.date, start, end));
    const totalMinutes = exercise.reduce((s, e) => s + e.duration, 0);
    const sessions = exercise.length;

    const tasks = data.tasks.filter(t => inRange(t.date, start, end));
    const tasksDone = tasks.filter(t => t.done).length;
    const tasksTotal = tasks.length;

    const journal = data.journal.filter(j => inRange(j.date, start, end));

    // Habit streak: count unique dates in range where at least one habit was completed
    const habitDays = new Set<string>();
    data.habits.forEach(h =>
      h.completedDates.filter(d => inRange(d, start, end)).forEach(d => habitDays.add(d))
    );

    return { totalSpent, topCategory, totalCals, mealsLogged, totalMinutes, sessions, tasksDone, tasksTotal, journalCount: journal.length, habitDays: habitDays.size };
  }, [data, start, end]);

  return (
    <div className="space-y-3">
      {/* Period toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          {(["week", "month", "year"] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all active:scale-95 ${
                period === p
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-muted-foreground">{periodLabel(selectedDate, period)}</span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          icon={<DollarSign className="w-3.5 h-3.5" />}
          label="Expenses"
          value={`$${stats.totalSpent.toFixed(2)}`}
          sub={stats.topCategory ? `Top: ${stats.topCategory[0]}` : "No expenses"}
          colorClass="bg-section-expense"
        />
        <StatCard
          icon={<UtensilsCrossed className="w-3.5 h-3.5" />}
          label="Food"
          value={`${stats.mealsLogged} meals`}
          sub={stats.totalCals > 0 ? `${stats.totalCals.toLocaleString()} cal total` : "No calories logged"}
          colorClass="bg-section-food"
        />
        <StatCard
          icon={<Dumbbell className="w-3.5 h-3.5" />}
          label="Exercise"
          value={`${stats.totalMinutes} min`}
          sub={`${stats.sessions} session${stats.sessions !== 1 ? "s" : ""}`}
          colorClass="bg-section-exercise"
        />
        <StatCard
          icon={<Target className="w-3.5 h-3.5" />}
          label="Habits"
          value={`${stats.habitDays} days`}
          sub="with completed habits"
          colorClass="bg-section-habits"
        />
        <StatCard
          icon={<ListTodo className="w-3.5 h-3.5" />}
          label="Tasks"
          value={`${stats.tasksDone}/${stats.tasksTotal}`}
          sub={stats.tasksTotal > 0 ? `${Math.round((stats.tasksDone / stats.tasksTotal) * 100)}% done` : "No tasks"}
          colorClass="bg-section-tasks"
        />
        <StatCard
          icon={<BookOpen className="w-3.5 h-3.5" />}
          label="Journal"
          value={`${stats.journalCount} entries`}
          sub={stats.journalCount > 0 ? "Keep it up!" : "Start writing"}
          colorClass="bg-section-journal"
        />
      </div>
    </div>
  );
}

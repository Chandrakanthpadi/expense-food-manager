import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, DollarSign, UtensilsCrossed, Dumbbell, Target,
  ListTodo, BookOpen, CalendarIcon, ChevronDown,
} from "lucide-react";
import { useLifeData } from "@/hooks/useLifeData";
import { getISTDateStr } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

type FilterMode = "month" | "year" | "custom";

const CATEGORIES: Record<string, { label: string; icon: React.ReactNode; colorClass: string }> = {
  expenses: { label: "Expenses", icon: <DollarSign className="w-4 h-4" />, colorClass: "bg-section-expense" },
  food: { label: "Food", icon: <UtensilsCrossed className="w-4 h-4" />, colorClass: "bg-section-food" },
  exercise: { label: "Exercise", icon: <Dumbbell className="w-4 h-4" />, colorClass: "bg-section-exercise" },
  habits: { label: "Habits", icon: <Target className="w-4 h-4" />, colorClass: "bg-section-habits" },
  tasks: { label: "Tasks", icon: <ListTodo className="w-4 h-4" />, colorClass: "bg-section-tasks" },
  journal: { label: "Journal", icon: <BookOpen className="w-4 h-4" />, colorClass: "bg-section-journal" },
};

function fmtLocal(d: Date) { return getISTDateStr(d); }

function getFilterRange(mode: FilterMode, monthOffset: number, yearOffset: number, customStart?: Date, customEnd?: Date): [string, string] {
  const now = new Date();
  if (mode === "month") {
    const m = now.getMonth() + monthOffset;
    const start = new Date(now.getFullYear(), m, 1);
    const end = new Date(now.getFullYear(), m + 1, 0);
    return [fmtLocal(start), fmtLocal(end)];
  }
  if (mode === "year") {
    const y = now.getFullYear() + yearOffset;
    return [fmtLocal(new Date(y, 0, 1)), fmtLocal(new Date(y, 11, 31))];
  }
  if (customStart && customEnd) {
    return [fmtLocal(customStart), fmtLocal(customEnd)];
  }
  // default to current month
  return [fmtLocal(new Date(now.getFullYear(), now.getMonth(), 1)), fmtLocal(new Date(now.getFullYear(), now.getMonth() + 1, 0))];
}

function filterLabel(mode: FilterMode, monthOffset: number, yearOffset: number, customStart?: Date, customEnd?: Date): string {
  const now = new Date();
  if (mode === "month") {
    const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    return d.toLocaleDateString("en", { month: "long", year: "numeric" });
  }
  if (mode === "year") {
    return String(now.getFullYear() + yearOffset);
  }
  if (customStart && customEnd) {
    return `${format(customStart, "MMM d")} – ${format(customEnd, "MMM d, yyyy")}`;
  }
  return "Select dates";
}

function inRange(date: string, start: string, end: string) {
  return date >= start && date <= end;
}

const CategoryDetail = () => {
  const navigate = useNavigate();
  const { category } = useParams<{ category: string }>();
  const { data } = useLifeData();

  const [filterMode, setFilterMode] = useState<FilterMode>("month");
  const [monthOffset, setMonthOffset] = useState(0);
  const [yearOffset, setYearOffset] = useState(0);
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const [pickingStart, setPickingStart] = useState(false);
  const [pickingEnd, setPickingEnd] = useState(false);

  const cat = category && CATEGORIES[category] ? CATEGORIES[category] : null;

  const [start, end] = getFilterRange(filterMode, monthOffset, yearOffset, customStart, customEnd);
  const label = filterLabel(filterMode, monthOffset, yearOffset, customStart, customEnd);

  const navigateOffset = (dir: number) => {
    if (filterMode === "month") setMonthOffset(o => o + dir);
    if (filterMode === "year") setYearOffset(o => o + dir);
  };

  const isCurrentPeriod = filterMode === "month" ? monthOffset === 0 : filterMode === "year" ? yearOffset === 0 : false;

  const entries = useMemo(() => {
    if (category === "expenses") {
      return data.expenses.filter(e => inRange(e.date, start, end)).sort((a, b) => b.date.localeCompare(a.date));
    }
    if (category === "food") {
      return data.food.filter(f => inRange(f.date, start, end)).sort((a, b) => b.date.localeCompare(a.date));
    }
    if (category === "exercise") {
      return data.exercise.filter(e => inRange(e.date, start, end)).sort((a, b) => b.date.localeCompare(a.date));
    }
    if (category === "habits") {
      return data.habits.map(h => ({
        ...h,
        completedInRange: h.completedDates.filter(d => inRange(d, start, end)).sort((a, b) => b.localeCompare(a)),
        total: h.completedDates.filter(d => inRange(d, start, end)).length,
      }));
    }
    if (category === "tasks") {
      return data.tasks.filter(t => inRange(t.date, start, end)).sort((a, b) => b.date.localeCompare(a.date));
    }
    if (category === "journal") {
      return data.journal.filter(j => inRange(j.date, start, end)).sort((a, b) => b.date.localeCompare(a.date));
    }
    return [];
  }, [data, category, start, end]);

  // Summary stats
  const summary = useMemo(() => {
    if (category === "expenses") {
      const items = data.expenses.filter(e => inRange(e.date, start, end));
      const total = items.reduce((s, e) => s + e.amount, 0);
      return { total: `₹${total.toFixed(0)}`, count: items.length };
    }
    if (category === "food") {
      const items = data.food.filter(f => inRange(f.date, start, end));
      const cals = items.reduce((s, f) => s + (f.calories || 0), 0);
      return { total: `${cals.toLocaleString()} cal`, count: items.length };
    }
    if (category === "exercise") {
      const items = data.exercise.filter(e => inRange(e.date, start, end));
      const mins = items.reduce((s, e) => s + e.duration, 0);
      return { total: `${mins} min`, count: items.length };
    }
    if (category === "tasks") {
      const items = data.tasks.filter(t => inRange(t.date, start, end));
      const done = items.filter(t => t.done).length;
      return { total: `${done}/${items.length}`, count: items.length };
    }
    if (category === "journal") {
      const items = data.journal.filter(j => inRange(j.date, start, end));
      return { total: `${items.length} entries`, count: items.length };
    }
    if (category === "habits") {
      const totalDone = data.habits.reduce((s, h) => s + h.completedDates.filter(d => inRange(d, start, end)).length, 0);
      return { total: `${totalDone} completions`, count: data.habits.length };
    }
    return { total: "–", count: 0 };
  }, [data, category, start, end]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" });
  };

  if (!cat) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Category not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6 pb-20 space-y-4">
        {/* Header */}
        <header className="flex items-center gap-3 pb-1">
          <button
            onClick={() => navigate("/insights")}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted hover:bg-muted-foreground/10 active:scale-95 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <span className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-primary-foreground", cat.colorClass)}>
              {cat.icon}
            </span>
            <h1 className="text-xl font-bold tracking-tight leading-none">{cat.label}</h1>
          </div>
        </header>

        {/* Filter mode toggle */}
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          {(["month", "year", "custom"] as FilterMode[]).map(m => (
            <button
              key={m}
              onClick={() => { setFilterMode(m); setMonthOffset(0); setYearOffset(0); }}
              className={cn(
                "flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all active:scale-95",
                filterMode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        {/* Date navigation / custom picker */}
        {filterMode !== "custom" ? (
          <div className="flex items-center justify-between bg-card rounded-lg border border-border/60 px-2 py-1.5">
            <button onClick={() => navigateOffset(-1)} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-muted active:scale-95 transition-all">
              <ChevronDown className="w-4 h-4 rotate-90" />
            </button>
            <button
              onClick={() => { setMonthOffset(0); setYearOffset(0); }}
              className={cn("text-sm font-medium px-3 py-0.5 rounded-md transition-all", isCurrentPeriod ? "text-foreground" : "text-primary hover:bg-primary/10 active:scale-95")}
            >
              {label}
            </button>
            <button
              onClick={() => navigateOffset(1)}
              disabled={isCurrentPeriod}
              className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-muted active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronDown className="w-4 h-4 -rotate-90" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Popover open={pickingStart} onOpenChange={setPickingStart}>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("flex-1 justify-start text-left text-xs font-normal", !customStart && "text-muted-foreground")}>
                  <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
                  {customStart ? format(customStart, "MMM d, yyyy") : "Start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customStart}
                  onSelect={(d) => { setCustomStart(d || undefined); setPickingStart(false); }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <span className="text-xs text-muted-foreground">to</span>
            <Popover open={pickingEnd} onOpenChange={setPickingEnd}>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("flex-1 justify-start text-left text-xs font-normal", !customEnd && "text-muted-foreground")}>
                  <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
                  {customEnd ? format(customEnd, "MMM d, yyyy") : "End date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={customEnd}
                  onSelect={(d) => { setCustomEnd(d || undefined); setPickingEnd(false); }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Summary card */}
        <div className="bg-card rounded-xl border border-border/60 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
            <p className="text-lg font-bold tabular-nums">{summary.total}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Entries</p>
            <p className="text-lg font-bold tabular-nums">{summary.count}</p>
          </div>
        </div>

        {/* Entries list */}
        <div className="space-y-1">
          {category === "expenses" && (entries as typeof data.expenses).map(e => (
            <div key={e.id} className="bg-card rounded-lg border border-border/40 px-4 py-2.5 flex items-center justify-between">
              <div>
                <span className="text-xs font-medium">{e.category}</span>
                {e.note && <span className="text-[10px] text-muted-foreground ml-2">{e.note}</span>}
                <p className="text-[10px] text-muted-foreground">{formatDate(e.date)}</p>
              </div>
              <span className="text-sm font-semibold tabular-nums">₹{e.amount.toFixed(2)}</span>
            </div>
          ))}

          {category === "food" && (entries as typeof data.food).map(f => (
            <div key={f.id} className="bg-card rounded-lg border border-border/40 px-4 py-2.5 flex items-center justify-between">
              <div>
                <span className="text-xs font-medium capitalize">{f.meal}</span>
                <span className="text-[10px] text-muted-foreground ml-2">{f.items}</span>
                <p className="text-[10px] text-muted-foreground">{formatDate(f.date)}</p>
              </div>
              {f.calories && <span className="text-xs tabular-nums text-muted-foreground">{f.calories} cal</span>}
            </div>
          ))}

          {category === "exercise" && (entries as typeof data.exercise).map(e => (
            <div key={e.id} className="bg-card rounded-lg border border-border/40 px-4 py-2.5 flex items-center justify-between">
              <div>
                <span className="text-xs font-medium">{e.activity}</span>
                <p className="text-[10px] text-muted-foreground">{formatDate(e.date)}</p>
              </div>
              <span className="text-xs font-semibold tabular-nums">{e.duration} min</span>
            </div>
          ))}

          {category === "tasks" && (entries as typeof data.tasks).map(t => (
            <div key={t.id} className="bg-card rounded-lg border border-border/40 px-4 py-2.5 flex items-center justify-between">
              <div>
                <span className={cn("text-xs", t.done ? "line-through text-muted-foreground" : "font-medium")}>{t.text}</span>
                <p className="text-[10px] text-muted-foreground">{formatDate(t.date)}</p>
              </div>
              <span className="text-xs">{t.done ? "✅" : "⬜"}</span>
            </div>
          ))}

          {category === "journal" && (entries as typeof data.journal).map(j => (
            <div key={j.id} className="bg-card rounded-lg border border-border/40 px-4 py-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs">{j.mood}</span>
                <span className="text-[10px] text-muted-foreground">{formatDate(j.date)}</span>
              </div>
              <p className="text-xs text-muted-foreground">{j.content}</p>
            </div>
          ))}

          {category === "habits" && (entries as any[]).map((h: any) => (
            <div key={h.id} className="bg-card rounded-lg border border-border/40 px-4 py-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">{h.name}</span>
                <span className="text-xs tabular-nums text-muted-foreground">{h.total} days</span>
              </div>
              {h.completedInRange.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {h.completedInRange.slice(0, 20).map((d: string) => (
                    <span key={d} className="text-[9px] bg-section-habits/15 text-foreground px-1.5 py-0.5 rounded">
                      {formatDate(d)}
                    </span>
                  ))}
                  {h.completedInRange.length > 20 && (
                    <span className="text-[9px] text-muted-foreground">+{h.completedInRange.length - 20} more</span>
                  )}
                </div>
              )}
            </div>
          ))}

          {(Array.isArray(entries) && entries.length === 0) && (
            <div className="text-center py-12 text-muted-foreground text-sm">No data for this period</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryDetail;

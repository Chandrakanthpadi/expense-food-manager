import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, DollarSign, UtensilsCrossed, Dumbbell, Target,
  ListTodo, BookOpen, CalendarIcon, ChevronDown, Download,
} from "lucide-react";
import { useLifeData } from "@/hooks/useLifeData";
import { getISTDateStr } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { createPdfFileName, exportReportToPdf, type PdfReportData } from "@/lib/pdfExport";

type FilterMode = "month" | "year" | "custom";

const CATEGORIES: Record<string, { label: string; icon: React.ReactNode; colorClass: string }> = {
  expenses: { label: "Expenses", icon: <DollarSign className="w-4 h-4" />, colorClass: "bg-section-expense" },
  food: { label: "Food", icon: <UtensilsCrossed className="w-4 h-4" />, colorClass: "bg-section-food" },
  exercise: { label: "Exercise", icon: <Dumbbell className="w-4 h-4" />, colorClass: "bg-section-exercise" },
  habits: { label: "Habits", icon: <Target className="w-4 h-4" />, colorClass: "bg-section-habits" },
  tasks: { label: "Tasks", icon: <ListTodo className="w-4 h-4" />, colorClass: "bg-section-tasks" },
  journal: { label: "Journal", icon: <BookOpen className="w-4 h-4" />, colorClass: "bg-section-journal" },
};

const expenseCategories = ["Food", "Groceries", "Transport", "Bills", "Shopping", "Health", "Other"];


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
  const [searchParams] = useSearchParams();

  const initialPeriod = searchParams.get("period") as FilterMode || "month";
  const initialOffset = parseInt(searchParams.get("offset") || "0");

  const life = useLifeData();
  const { data } = life;
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
    life.updateExpense(id, {
      amount: num,
      category: editCategory,
      note: editNote
    });
    setEditingId(null);
  };


  const [filterMode, setFilterMode] = useState<FilterMode>(initialPeriod);
  const [monthOffset, setMonthOffset] = useState(initialPeriod === "month" ? initialOffset : 0);
  const [yearOffset, setYearOffset] = useState(initialPeriod === "year" ? initialOffset : 0);
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const [pickingStart, setPickingStart] = useState(false);
  const [pickingEnd, setPickingEnd] = useState(false);
  const [exporting, setExporting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Scroll to top when period or filter changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [filterMode, monthOffset, yearOffset, customStart, customEnd]);

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
      return { total: `Rs ${total.toFixed(0)}`, count: items.length };
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

  const handleExport = useCallback(async () => {
    if (!category || exporting) return;
    setExporting(true);
    try {
      let head: string[] = [];
      let body: (string | number)[][] = [];
      const exportSummary: Array<{ label: string; value: string }> = [
        { label: "Overall Total", value: summary.total },
        { label: "Recorded Entries", value: summary.count.toString() },
      ];

      if (category === "expenses") {
        head = ["Date", "Category", "Amount", "Note"];
        body = (entries as any[]).map(e => [e.date, e.category, `Rs ${e.amount.toFixed(2)}`, e.note || ""]);

        const catTotals: Record<string, number> = (entries as any[]).reduce((acc: Record<string, number>, e: any) => {
          acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
          return acc;
        }, {});

        const entriesArray = Object.entries(catTotals) as [string, number][];
        entriesArray
          .sort((a, b) => b[1] - a[1]) // Sort by amount descending
          .forEach(([cat, amount]) => {
            exportSummary.push({ label: `${cat} Total`, value: `Rs ${amount.toFixed(0)}` });
          });
      } else if (category === "food") {
        head = ["Date", "Meal", "Items", "Calories"];
        body = (entries as any[]).map(f => [f.date, f.meal, f.items, f.calories ? `${f.calories} cal` : "–"]);
      } else if (category === "exercise") {
        head = ["Date", "Activity", "Duration"];
        body = (entries as any[]).map(e => [e.date, e.activity, `${e.duration} min`]);
      } else if (category === "tasks") {
        head = ["Date", "Task", "Status"];
        body = (entries as any[]).map(t => [t.date, t.text, t.done ? "Done" : "Pending"]);
      } else if (category === "journal") {
        head = ["Date", "Mood", "Entry"];
        body = (entries as any[]).map(j => [j.date, j.mood, j.content]);
      } else if (category === "habits") {
        head = ["Habit", "Completion Timeline", "Total Checks"];
        body = (entries as any[]).map(h => [h.name, h.completedInRange.length > 0 ? h.completedInRange.join(", ") : "None", `${h.total} checks`]);
      }

      const reportData: PdfReportData = {
        fileName: createPdfFileName("lifeflow", category, label),
        title: `${cat?.label || 'Data'} Export`,
        subtitle: `Data generated for ${label}`,
        themeColor: [33, 100, 200],
        summary: exportSummary,
        tables: [{
          title: "Detailed Records",
          head,
          body
        }]
      };

      await exportReportToPdf(reportData);
    } catch (err) {
      console.error("Category export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [category, exporting, label, summary, entries, cat]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" });
  };

  const formatDayHeader = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  };

  // Group array entries by date
  function groupByDate<T extends { date: string }>(items: T[]): { date: string; items: T[] }[] {
    const map = new Map<string, T[]>();
    items.forEach(item => {
      const group = map.get(item.date) || [];
      group.push(item);
      map.set(item.date, group);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, items]) => ({ date, items }));
  }

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
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted rounded-md px-3 py-2 active:scale-95 transition-all disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? "Exporting…" : "Export PDF"}
          </button>
        </header>

        <div ref={contentRef} className="space-y-4 bg-background rounded-xl">
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

          {/* Entries list grouped by day */}
          <div className="space-y-4">
            {category === "expenses" && groupByDate(entries as typeof data.expenses).map(group => (
              <div key={group.date} className="space-y-1">
                <div className="flex items-center justify-between px-1 pt-1">
                  <h3 className="text-xs font-semibold text-foreground">{formatDayHeader(group.date)}</h3>
                  <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                    ₹{group.items.reduce((s, e) => s + e.amount, 0).toFixed(0)}
                  </span>
                </div>
                <div className="bg-card rounded-xl border border-border/40 divide-y divide-border/30 overflow-hidden">
                  {group.items.map(e => (
                    <div key={e.id} className="flex flex-col group border-b border-border/10 last:border-0">
                      <div
                        className="px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => editingId === e.id ? setEditingId(null) : startEditing(e)}
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-semibold">{e.category}</span>
                          {e.note && <span className="text-xs text-muted-foreground ml-2 truncate inline-block max-w-[150px] align-bottom">{e.note}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold tabular-nums">₹{e.amount.toFixed(2)}</span>
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
                                  autoFocus
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

                </div>
              </div>
            ))}

            {category === "food" && groupByDate(entries as typeof data.food).map(group => (
              <div key={group.date} className="space-y-1">
                <h3 className="text-xs font-semibold text-foreground px-1 pt-1">{formatDayHeader(group.date)}</h3>
                <div className="bg-card rounded-xl border border-border/40 divide-y divide-border/30 overflow-hidden">
                  {group.items.map(f => (
                    <div key={f.id} className="px-4 py-2.5 flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium capitalize">{f.meal}</span>
                        <span className="text-xs text-muted-foreground ml-2">{f.items}</span>
                      </div>
                      {f.calories && <span className="text-sm tabular-nums text-muted-foreground">{f.calories} cal</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {category === "exercise" && groupByDate(entries as typeof data.exercise).map(group => (
              <div key={group.date} className="space-y-1">
                <h3 className="text-xs font-semibold text-foreground px-1 pt-1">{formatDayHeader(group.date)}</h3>
                <div className="bg-card rounded-xl border border-border/40 divide-y divide-border/30 overflow-hidden">
                  {group.items.map(e => (
                    <div key={e.id} className="px-4 py-2.5 flex items-center justify-between">
                      <span className="text-sm font-medium">{e.activity}</span>
                      <span className="text-sm font-semibold tabular-nums">{e.duration} min</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {category === "tasks" && groupByDate(entries as typeof data.tasks).map(group => (
              <div key={group.date} className="space-y-1">
                <h3 className="text-xs font-semibold text-foreground px-1 pt-1">{formatDayHeader(group.date)}</h3>
                <div className="bg-card rounded-xl border border-border/40 divide-y divide-border/30 overflow-hidden">
                  {group.items.map(t => (
                    <div key={t.id} className="px-4 py-2.5 flex items-center justify-between">
                      <span className={cn("text-sm", t.done ? "line-through text-muted-foreground" : "font-medium")}>{t.text}</span>
                      <span className="text-sm">{t.done ? "✅" : "⬜"}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {category === "journal" && groupByDate(entries as typeof data.journal).map(group => (
              <div key={group.date} className="space-y-1">
                <h3 className="text-xs font-semibold text-foreground px-1 pt-1">{formatDayHeader(group.date)}</h3>
                <div className="bg-card rounded-xl border border-border/40 divide-y divide-border/30 overflow-hidden">
                  {group.items.map(j => (
                    <div key={j.id} className="px-4 py-2.5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">{j.mood}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{j.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {category === "habits" && (entries as any[]).map((h: any) => (
              <div key={h.id} className="bg-card rounded-xl border border-border/40 px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{h.name}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">{h.total} days</span>
                </div>
                {h.completedInRange.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {h.completedInRange.slice(0, 20).map((d: string) => (
                      <span key={d} className="text-[10px] bg-section-habits/15 text-foreground px-1.5 py-0.5 rounded">
                        {formatDate(d)}
                      </span>
                    ))}
                    {h.completedInRange.length > 20 && (
                      <span className="text-[10px] text-muted-foreground">+{h.completedInRange.length - 20} more</span>
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
    </div>
  );
};

export default CategoryDetail;

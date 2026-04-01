import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { cn, getISTDateStr } from "@/lib/utils";

interface Props {
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export function MiniCalendar({ selectedDate, onSelectDate }: Props) {
  const [showFullGrid, setShowFullGrid] = useState(false);
  const todayStr = getISTDateStr();

  const quickDates = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (4 - i));
      return getISTDateStr(d);
    });
  }, []);

  const selected = new Date(selectedDate + "T12:00:00");
  const year = selected.getFullYear();
  const month = selected.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const pad = (n: number) => String(n).padStart(2, "0");
  const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const prev = () => {
    onSelectDate(toDateStr(new Date(year, month - 1, 1)));
  };
  const next = () => {
    onSelectDate(toDateStr(new Date(year, month + 1, 1)));
  };

  const monthName = new Date(year, month).toLocaleDateString("en", { month: "long", year: "numeric" });
  const dayNamesShort = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="space-y-4">
      {/* Quick Select Bar */}
      <div className="flex items-center justify-between gap-1 bg-muted/30 p-1 rounded-2xl border border-border/40">
        <div className="flex flex-1 justify-between items-center px-0.5">
          {quickDates.map((ds) => {
            const d = new Date(ds + "T12:00:00");
            const dayNum = d.getDate();
            const dayName = d.toLocaleDateString("en", { weekday: "narrow" });
            const isSelected = ds === selectedDate;
            const isToday = ds === todayStr;

            return (
              <button
                key={ds}
                onClick={() => {
                  onSelectDate(ds);
                  setShowFullGrid(false);
                }}
                className={cn(
                  "flex flex-col items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 active:scale-95",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 font-bold scale-105 z-10"
                    : "hover:bg-muted text-muted-foreground"
                )}
              >
                <span className={cn("text-[10px] uppercase font-bold mb-1", isSelected ? "text-primary-foreground/70" : "text-muted-foreground/60")}>
                  {dayName}
                </span>
                <span className="text-xs tabular-nums">
                  {dayNum}
                </span>
                {isToday && !isSelected && <div className="w-1 h-1 bg-primary rounded-full mt-1" />}
              </button>
            );
          })}
        </div>

        <div className="w-px h-8 bg-border/60 mx-1" />

        <button
          onClick={() => setShowFullGrid(!showFullGrid)}
          className={cn(
            "w-11 h-11 flex items-center justify-center rounded-xl transition-all active:scale-90",
            showFullGrid ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted text-muted-foreground"
          )}
          title="Custom date picker"
        >
          <CalendarIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Full Grid Calendar */}
      {showFullGrid && (
        <div className="p-3 bg-card rounded-2xl border border-border/40 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prev} className="p-2 rounded-lg hover:bg-muted active:scale-90 transition-transform">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-foreground">{monthName}</span>
            <button onClick={next} className="p-2 rounded-lg hover:bg-muted active:scale-90 transition-transform">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {dayNamesShort.map((d, i) => (
              <span key={i} className="text-[11px] font-bold text-muted-foreground/60 py-2 uppercase tracking-wider">{d}</span>
            ))}
            {Array.from({ length: firstDay }, (_, i) => (
              <span key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const ds = `${year}-${pad(month + 1)}-${pad(day)}`;
              const isToday = ds === todayStr;
              const isSelected = ds === selectedDate;
              return (
                <button
                  key={day}
                  onClick={() => onSelectDate(ds)}
                  className={cn(
                    "text-sm h-10 w-full rounded-lg tabular-nums transition-all duration-100 active:scale-90 flex items-center justify-center relative",
                    isSelected ? "bg-primary text-primary-foreground font-bold shadow-md" : "hover:bg-muted text-foreground",
                    isToday && !isSelected && "ring-1 ring-primary/30 font-semibold"
                  )}
                >
                  {day}
                  {isToday && isSelected && <div className="absolute bottom-1 w-1 h-1 bg-primary-foreground rounded-full" />}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => {
              onSelectDate(todayStr);
              setShowFullGrid(false);
            }}
            className="w-full mt-4 py-2.5 text-xs font-bold text-primary hover:bg-primary/5 rounded-xl transition-colors border border-primary/20"
          >
            Return to Today
          </button>
        </div>
      )}
    </div>
  );
}

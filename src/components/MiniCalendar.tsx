import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export function MiniCalendar({ selectedDate, onSelectDate }: Props) {
  const selected = new Date(selectedDate + "T12:00:00");
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

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
  const dayNames = ["S", "M", "T", "W", "T", "F", "S"];

  const dateStr = (day: number) => `${year}-${pad(month + 1)}-${pad(day)}`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <button onClick={prev} className="p-1 rounded hover:bg-muted active:scale-90 transition-transform">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium">{monthName}</span>
        <button onClick={next} className="p-1 rounded hover:bg-muted active:scale-90 transition-transform">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center">
        {dayNames.map((d, i) => (
          <span key={i} className="text-[10px] text-muted-foreground py-1">{d}</span>
        ))}
        {Array.from({ length: firstDay }, (_, i) => (
          <span key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const ds = dateStr(day);
          const isToday = ds === todayStr;
          const isSelected = ds === selectedDate;
          return (
            <button
              key={day}
              onClick={() => onSelectDate(ds)}
              className={cn(
                "text-xs py-1 rounded-md tabular-nums transition-all duration-100 active:scale-90 hover:bg-muted",
                isSelected && "bg-primary text-primary-foreground font-bold hover:bg-primary/90",
                isToday && !isSelected && "ring-1 ring-primary/40 font-semibold"
              )}
            >
              {day}
            </button>
          );
        })}
      </div>

      {selectedDate !== todayStr && (
        <button
          onClick={() => onSelectDate(todayStr)}
          className="w-full text-xs text-primary hover:underline py-1"
        >
          ← Back to today
        </button>
      )}
    </div>
  );
}

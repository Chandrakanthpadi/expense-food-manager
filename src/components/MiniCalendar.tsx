import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function MiniCalendar() {
  const [current, setCurrent] = useState(new Date());
  const today = new Date();

  const year = current.getFullYear();
  const month = current.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prev = () => setCurrent(new Date(year, month - 1, 1));
  const next = () => setCurrent(new Date(year, month + 1, 1));

  const monthName = current.toLocaleDateString("en", { month: "long", year: "numeric" });
  const dayNames = ["S", "M", "T", "W", "T", "F", "S"];

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

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
          return (
            <span
              key={day}
              className={cn(
                "text-xs py-1 rounded-md tabular-nums",
                isToday(day) && "bg-primary text-primary-foreground font-bold"
              )}
            >
              {day}
            </span>
          );
        })}
      </div>
    </div>
  );
}

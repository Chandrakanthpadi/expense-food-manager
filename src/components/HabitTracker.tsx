import { useState } from "react";
import { Plus, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Habit } from "@/hooks/useLifeData";

interface Props {
  habits: Habit[];
  selectedDate: string;
  onAdd: (name: string) => void;
  onToggle: (id: string, date: string) => void;
  onRemove: (id: string) => void;
}

export function HabitTracker({ habits, selectedDate, onAdd, onToggle, onRemove }: Props) {
  const [name, setName] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd(name.trim());
    setName("");
  };

  // Last 7 days
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  const dayLabels = days.map(d => new Date(d + "T12:00:00").toLocaleDateString("en", { weekday: "narrow" }));

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="New habit..."
          value={name}
          onChange={e => setName(e.target.value)}
          className="flex-1 min-w-0 bg-muted rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30"
          onKeyDown={e => e.key === "Enter" && handleAdd()}
        />
        <button onClick={handleAdd} className="bg-section-habits text-primary-foreground rounded-md px-3 py-2 text-sm font-medium active:scale-95 transition-transform">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {habits.length > 0 && (
        <div className="space-y-2">
          {/* Day headers */}
          <div className="flex items-center">
            <span className="flex-1" />
            <div className="flex gap-1">
              {dayLabels.map((label, i) => (
                <span key={i} className={cn("w-7 text-center text-[10px] text-muted-foreground", days[i] === today && "font-bold text-foreground")}>
                  {label}
                </span>
              ))}
            </div>
            <span className="w-6" />
          </div>

          {habits.map(h => (
            <div key={h.id} className="flex items-center gap-1 group">
              <span className="flex-1 text-sm truncate">{h.name}</span>
              <div className="flex gap-1">
                {days.map(d => {
                  const done = h.completedDates.includes(d);
                  return (
                    <button
                      key={d}
                      onClick={() => onToggle(h.id, d)}
                      className={cn(
                        "w-7 h-7 rounded-md flex items-center justify-center transition-all duration-150 active:scale-90",
                        done ? "bg-section-habits text-primary-foreground" : "bg-muted hover:bg-muted-foreground/10"
                      )}
                    >
                      {done && <Check className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => onRemove(h.id)} className="w-6 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

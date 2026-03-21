import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { ExerciseEntry } from "@/hooks/useLifeData";

interface Props {
  exercise: ExerciseEntry[];
  selectedDate: string;
  onAdd: (activity: string, duration: number, date?: string) => void;
  onRemove: (id: string) => void;
}

export function ExerciseLog({ exercise, selectedDate, onAdd, onRemove }: Props) {
  const [activity, setActivity] = useState("");
  const [duration, setDuration] = useState("");

  const dayExercise = exercise.filter(e => e.date === selectedDate);
  const totalMin = dayExercise.reduce((s, e) => s + e.duration, 0);

  const handleAdd = () => {
    if (!activity.trim() || !duration) return;
    onAdd(activity.trim(), parseInt(duration), selectedDate);
    setActivity("");
    setDuration("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-muted-foreground">Activity</span>
        <span className="text-lg font-semibold tabular-nums">{(totalMin/60.00).toFixed(2)} hr </span>
      </div>

      <div className="flex gap-2">
        <input type="text" placeholder="Activity (e.g. Running)" value={activity} onChange={e => setActivity(e.target.value)}
          className="flex-1 min-w-0 bg-muted rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30"
          onKeyDown={e => e.key === "Enter" && handleAdd()} />
        <input type="number" placeholder="Min" value={duration} onChange={e => setDuration(e.target.value)}
          className="w-16 bg-muted rounded-md px-3 py-2 text-sm tabular-nums outline-none focus:ring-2 focus:ring-ring/30"
          onKeyDown={e => e.key === "Enter" && handleAdd()} />
        <button onClick={handleAdd} className="bg-section-exercise text-primary-foreground rounded-md px-3 py-2 text-sm font-medium active:scale-95 transition-transform">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {dayExercise.length > 0 && (
        <ul className="space-y-2 pt-1">
          {dayExercise.map(e => (
            <li key={e.id} className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-section-exercise/60 shrink-0" />
              <span className="flex-1">{e.activity}</span>
              <span className="tabular-nums text-muted-foreground">{e.duration} min</span>
              <button onClick={() => onRemove(e.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

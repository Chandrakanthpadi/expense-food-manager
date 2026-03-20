import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { ExerciseEntry } from "@/hooks/useLifeData";

interface Props {
  exercise: ExerciseEntry[];
  onAdd: (activity: string, duration: number) => void;
  onRemove: (id: string) => void;
}

export function ExerciseLog({ exercise, onAdd, onRemove }: Props) {
  const [activity, setActivity] = useState("");
  const [duration, setDuration] = useState("");

  const today = new Date().toISOString().slice(0, 10);
  const todayExercise = exercise.filter(e => e.date === today);
  const totalMin = todayExercise.reduce((s, e) => s + e.duration, 0);

  const handleAdd = () => {
    if (!activity.trim() || !duration) return;
    onAdd(activity.trim(), parseInt(duration));
    setActivity("");
    setDuration("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-muted-foreground">Today's activity</span>
        <span className="text-lg font-semibold tabular-nums">{totalMin} min</span>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Activity (e.g. Running)"
          value={activity}
          onChange={e => setActivity(e.target.value)}
          className="flex-1 min-w-0 bg-muted rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30"
          onKeyDown={e => e.key === "Enter" && handleAdd()}
        />
        <input
          type="number"
          placeholder="Min"
          value={duration}
          onChange={e => setDuration(e.target.value)}
          className="w-16 bg-muted rounded-md px-3 py-2 text-sm tabular-nums outline-none focus:ring-2 focus:ring-ring/30"
          onKeyDown={e => e.key === "Enter" && handleAdd()}
        />
        <button onClick={handleAdd} className="bg-section-exercise text-primary-foreground rounded-md px-3 py-2 text-sm font-medium active:scale-95 transition-transform">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {todayExercise.length > 0 && (
        <ul className="space-y-1.5 pt-1">
          {todayExercise.map(e => (
            <li key={e.id} className="flex items-center gap-2 text-sm group">
              <span className="w-2 h-2 rounded-full bg-section-exercise/60 shrink-0" />
              <span className="flex-1">{e.activity}</span>
              <span className="tabular-nums text-muted-foreground">{e.duration} min</span>
              <button onClick={() => onRemove(e.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

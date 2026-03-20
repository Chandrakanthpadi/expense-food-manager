import { useState } from "react";
import { Plus, X, Circle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/hooks/useLifeData";

interface Props {
  tasks: Task[];
  onAdd: (text: string) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

export function TaskList({ tasks, onAdd, onToggle, onRemove }: Props) {
  const [text, setText] = useState("");

  const handleAdd = () => {
    if (!text.trim()) return;
    onAdd(text.trim());
    setText("");
  };

  const pending = tasks.filter(t => !t.done);
  const done = tasks.filter(t => t.done);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Add a task..."
          value={text}
          onChange={e => setText(e.target.value)}
          className="flex-1 min-w-0 bg-muted rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30"
          onKeyDown={e => e.key === "Enter" && handleAdd()}
        />
        <button onClick={handleAdd} className="bg-section-tasks text-primary-foreground rounded-md px-3 py-2 text-sm font-medium active:scale-95 transition-transform">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <ul className="space-y-1">
        {pending.map(t => (
          <li key={t.id} className="flex items-center gap-2 text-sm group">
            <button onClick={() => onToggle(t.id)} className="text-muted-foreground hover:text-section-tasks transition-colors active:scale-90">
              <Circle className="w-4.5 h-4.5" />
            </button>
            <span className="flex-1">{t.text}</span>
            <button onClick={() => onRemove(t.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
              <X className="w-3.5 h-3.5" />
            </button>
          </li>
        ))}
        {done.map(t => (
          <li key={t.id} className="flex items-center gap-2 text-sm group opacity-50">
            <button onClick={() => onToggle(t.id)} className="text-section-tasks active:scale-90">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </button>
            <span className={cn("flex-1 line-through")}>{t.text}</span>
            <button onClick={() => onRemove(t.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
              <X className="w-3.5 h-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { JournalEntry } from "@/hooks/useLifeData";

const moods = ["😊", "😐", "😔", "😤", "🤩", "😴"];

interface Props {
  journal: JournalEntry[];
  selectedDate: string;
  onAdd: (content: string, mood: string, date?: string) => void;
  onRemove: (id: string) => void;
}

export function JournalSection({ journal, selectedDate, onAdd, onRemove }: Props) {
  const [content, setContent] = useState("");
  const [mood, setMood] = useState(moods[0]);

  const dayEntries = journal.filter(j => j.date === selectedDate);

  const handleAdd = () => {
    if (!content.trim()) return;
    onAdd(content.trim(), mood, selectedDate);
    setContent("");
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 pb-1">
        {moods.map(m => (
          <button key={m} onClick={() => setMood(m)}
            className={`text-lg px-1 rounded transition-all duration-150 active:scale-90 ${mood === m ? "bg-section-journal/20 scale-110" : "opacity-50 hover:opacity-80"}`}>
            {m}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <textarea placeholder="How's your day going?" value={content} onChange={e => setContent(e.target.value)} rows={2}
          className="flex-1 bg-muted rounded-md px-3 py-2 text-sm outline-none resize-none focus:ring-2 focus:ring-ring/30" />
        <button onClick={handleAdd} className="self-end bg-section-journal text-primary-foreground rounded-md px-3 py-2 text-sm font-medium active:scale-95 transition-transform">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {dayEntries.length > 0 && (
        <ul className="space-y-2 pt-1">
          {dayEntries.map(j => (
            <li key={j.id} className="flex gap-2 text-sm">
              <span className="text-base leading-5">{j.mood}</span>
              <p className="flex-1 text-muted-foreground leading-relaxed">{j.content}</p>
              <button onClick={() => onRemove(j.id)} className="text-muted-foreground hover:text-destructive transition-colors self-start">
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

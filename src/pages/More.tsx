import { useState } from "react";
import { ListTodo, Target, BookOpen } from "lucide-react";
import { useLifeData } from "@/hooks/useLifeData";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { TaskList } from "@/components/TaskList";
import { HabitTracker } from "@/components/HabitTracker";
import { JournalSection } from "@/components/JournalSection";
import { MiniCalendar } from "@/components/MiniCalendar";

const More = () => {
  const life = useLifeData();
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const isToday = selectedDate === todayStr;
  const displayDate = new Date(selectedDate + "T12:00:00");
  const dateStr = displayDate.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6 pb-20 space-y-3">
        <header className="pb-2 section-reveal">
          <h1 className="text-2xl font-bold tracking-tight leading-none">More</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {dateStr}
            {!isToday && <span className="ml-1.5 text-primary text-xs font-medium">(past)</span>}
          </p>
        </header>

        <div className="section-reveal stagger-1">
          <MiniCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        </div>

        <div className="section-reveal stagger-2">
          <CollapsibleSection title="Tasks" icon={<ListTodo className="w-4 h-4" />} accentColor="bg-section-tasks"
            count={life.data.tasks.filter(t => t.date === selectedDate && !t.done).length}>
            <TaskList tasks={life.data.tasks} selectedDate={selectedDate} onAdd={life.addTask} onToggle={life.toggleTask} onRemove={life.removeTask} />
          </CollapsibleSection>
        </div>

        <div className="section-reveal stagger-3">
          <CollapsibleSection title="Habits" icon={<Target className="w-4 h-4" />} accentColor="bg-section-habits"
            count={life.data.habits.length}>
            <HabitTracker habits={life.data.habits} selectedDate={selectedDate} onAdd={life.addHabit} onToggle={life.toggleHabit} onRemove={life.removeHabit} />
          </CollapsibleSection>
        </div>

        <div className="section-reveal stagger-4">
          <CollapsibleSection title="Journal" icon={<BookOpen className="w-4 h-4" />} accentColor="bg-section-journal"
            count={life.data.journal.filter(j => j.date === selectedDate).length}>
            <JournalSection journal={life.data.journal} selectedDate={selectedDate} onAdd={life.addJournal} onRemove={life.removeJournal} />
          </CollapsibleSection>
        </div>
      </div>
    </div>
  );
};

export default More;

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, UtensilsCrossed, Dumbbell, Target, ListTodo, BookOpen, Calendar, Download, BarChart3 } from "lucide-react";
import { useLifeData } from "@/hooks/useLifeData";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { ExpenseTracker } from "@/components/ExpenseTracker";
import { FoodLog } from "@/components/FoodLog";
import { ExerciseLog } from "@/components/ExerciseLog";
import { HabitTracker } from "@/components/HabitTracker";
import { TaskList } from "@/components/TaskList";
import { JournalSection } from "@/components/JournalSection";
import { MiniCalendar } from "@/components/MiniCalendar";

const Index = () => {
  const navigate = useNavigate();
  const life = useLifeData();
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const isToday = selectedDate === todayStr;
  const displayDate = new Date(selectedDate + "T12:00:00");
  const dateStr = displayDate.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6 pb-20 space-y-3">
        {/* Header */}
        <header className="flex items-end justify-between pb-2 section-reveal">
          <div>
            <h1 className="text-2xl font-bold tracking-tight leading-none">Lifeflow</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {dateStr}
              {!isToday && <span className="ml-1.5 text-primary text-xs font-medium">(past)</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/insights")}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted rounded-md px-3 py-2 active:scale-95 transition-all"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Insights
            </button>
            <button
              onClick={life.exportData}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted rounded-md px-3 py-2 active:scale-95 transition-all"
              title="Export all data"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </div>
        </header>

        {/* Calendar */}
        <div className="section-reveal stagger-1">
          <CollapsibleSection title="Calendar" icon={<Calendar className="w-4 h-4" />} accentColor="bg-primary" defaultOpen>
            <MiniCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />
          </CollapsibleSection>
        </div>


        {/* Tasks */}
        <div className="section-reveal stagger-3">
          <CollapsibleSection title="Tasks" icon={<ListTodo className="w-4 h-4" />} accentColor="bg-section-tasks" defaultOpen
            count={life.data.tasks.filter(t => t.date === selectedDate && !t.done).length}>
            <TaskList tasks={life.data.tasks} selectedDate={selectedDate} onAdd={life.addTask} onToggle={life.toggleTask} onRemove={life.removeTask} />
          </CollapsibleSection>
        </div>

        {/* Expenses */}
        <div className="section-reveal stagger-3">
          <CollapsibleSection title="Expenses" icon={<DollarSign className="w-4 h-4" />} accentColor="bg-section-expense"
            count={life.data.expenses.filter(e => e.date === selectedDate).length}>
            <ExpenseTracker expenses={life.data.expenses} selectedDate={selectedDate} onAdd={life.addExpense} onRemove={life.removeExpense} />
          </CollapsibleSection>
        </div>

        {/* Food */}
        <div className="section-reveal stagger-4">
          <CollapsibleSection title="Food" icon={<UtensilsCrossed className="w-4 h-4" />} accentColor="bg-section-food"
            count={life.data.food.filter(f => f.date === selectedDate).length}>
            <FoodLog food={life.data.food} selectedDate={selectedDate} onAdd={life.addFood} onRemove={life.removeFood} />
          </CollapsibleSection>
        </div>

        {/* Exercise */}
        <div className="section-reveal stagger-5">
          <CollapsibleSection title="Exercise" icon={<Dumbbell className="w-4 h-4" />} accentColor="bg-section-exercise"
            count={life.data.exercise.filter(e => e.date === selectedDate).length}>
            <ExerciseLog exercise={life.data.exercise} selectedDate={selectedDate} onAdd={life.addExercise} onRemove={life.removeExercise} />
          </CollapsibleSection>
        </div>

        {/* Habits */}
        <div className="section-reveal stagger-6">
          <CollapsibleSection title="Habits" icon={<Target className="w-4 h-4" />} accentColor="bg-section-habits"
            count={life.data.habits.length}>
            <HabitTracker habits={life.data.habits} selectedDate={selectedDate} onAdd={life.addHabit} onToggle={life.toggleHabit} onRemove={life.removeHabit} />
          </CollapsibleSection>
        </div>

        {/* Journal */}
        <div className="section-reveal stagger-7">
          <CollapsibleSection title="Journal" icon={<BookOpen className="w-4 h-4" />} accentColor="bg-section-journal"
            count={life.data.journal.filter(j => j.date === selectedDate).length}>
            <JournalSection journal={life.data.journal} selectedDate={selectedDate} onAdd={life.addJournal} onRemove={life.removeJournal} />
          </CollapsibleSection>
        </div>
      </div>
    </div>
  );
};

export default Index;

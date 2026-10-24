import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, UtensilsCrossed, Dumbbell, Target, ListTodo, BookOpen, Calendar, BarChart3, Settings } from "lucide-react";
import { useLifeData } from "@/hooks/useLifeData";
import { useFeatureSettings } from "@/hooks/useFeatureSettings";
import { CollapsibleSection } from "@/components/CollapsibleSection";

import { ExpenseTracker } from "@/components/ExpenseTracker";
import { LoansTracker } from "@/components/LoansTracker";
import { FoodLog } from "@/components/FoodLog";
import { ExerciseLog } from "@/components/ExerciseLog";
import { HabitTracker } from "@/components/HabitTracker";
import { TaskList } from "@/components/TaskList";
import { JournalSection } from "@/components/JournalSection";
import { MiniCalendar } from "@/components/MiniCalendar";
import { SummaryStats } from "@/components/SummaryStats";
import { SyncStatusBadge } from "@/components/SyncStatusBadge";
import { getISTDateStr } from "@/lib/utils";

const Index = () => {
  const navigate = useNavigate();
  const life = useLifeData();
  const { settings } = useFeatureSettings();
  const todayStr = getISTDateStr();
  const [selectedDate, setSelectedDate] = useState(todayStr);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [selectedDate]);

  const isToday = selectedDate === todayStr;
  const displayDate = new Date(selectedDate + "T12:00:00");
  const dateStr = displayDate.toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" });

  const selectedMonth = selectedDate.slice(0, 7);
  const monthlyExpenseTotal = life.data.expenses
    .filter(e => e.date.startsWith(selectedMonth))
    .reduce((s, e) => s + e.amount, 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6 pb-20 space-y-3">
        {/* Header */}
        <header className="flex items-center justify-between pb-2 section-reveal">
          <div>
            <p className="text-sm mt-1">
              {dateStr}
              {!isToday && <span className="ml-1.5 text-primary text-xs font-medium">(past)</span>}
            </p>
          </div>
          <div className="flex gap-1.5 items-center">
            <SyncStatusBadge />
            <button
              onClick={() => navigate("/insights")}
              className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground bg-muted rounded-md active:scale-95 transition-all"
              title="Insights"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate("/settings")}
              className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground bg-muted rounded-md active:scale-95 transition-all"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Calendar - collapsible */}
        <div className="section-reveal stagger-1">
          <CollapsibleSection title="Calendar" icon={<Calendar className="w-4 h-4" />} accentColor="bg-primary" collapsible defaultOpen ={false}>
            <MiniCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />
          </CollapsibleSection>
        </div>

        {/* Monthly Summary */}
        {/* <div className="section-reveal stagger-2">
          <SummaryStats data={life.data} selectedDate={selectedDate} />
        </div> */}

        {/* Expenses */}
        {settings.expenses && (
          <div className="section-reveal stagger-3">
            <CollapsibleSection title="Expenses" icon={<DollarSign className="w-4 h-4" />} accentColor="bg-section-expense"
              count={life.data.expenses.filter(e => e.date === selectedDate).length}
              rightLabel={`₹${monthlyExpenseTotal.toFixed(0)} this month`}>
              <ExpenseTracker 
                expenses={life.data.expenses} 
                selectedDate={selectedDate} 
                onAdd={life.addExpense} 
                onAddLoan={life.addLoan}
                onRemove={life.removeExpense} 
                onUpdate={life.updateExpense}
              />
            </CollapsibleSection>
          </div>
        )}

        {/* Lent money */}
        {settings.expenses && (
          <div className="section-reveal stagger-3">
            <CollapsibleSection title="Lent money" icon={<HandCoins className="w-4 h-4" />} accentColor="bg-section-expense"
              count={life.data.loans.filter(l => l.date === selectedDate).length}>
              <LoansTracker loans={life.data.loans} selectedDate={selectedDate} onAdd={life.addLoan} onRemove={life.removeLoan} />
            </CollapsibleSection>

          </div>
        )}

        {/* Food */}
        {settings.food && (
          <div className="section-reveal stagger-4">
            <CollapsibleSection title="Food" icon={<UtensilsCrossed className="w-4 h-4" />} accentColor="bg-section-food"
              count={life.data.food.filter(f => f.date === selectedDate).length}>
              <FoodLog food={life.data.food} mealChecks={life.data.mealChecks} selectedDate={selectedDate} onAdd={life.addFood} onRemove={life.removeFood} onToggleMeal={life.toggleMealCheck} />
            </CollapsibleSection>
          </div>
        )}

        {/* Exercise */}
        {settings.exercise && (
          <div className="section-reveal stagger-5">
            <CollapsibleSection title="Exercise" icon={<Dumbbell className="w-4 h-4" />} accentColor="bg-section-exercise"
              count={life.data.exercise.filter(e => e.date === selectedDate).length}>
              <ExerciseLog exercise={life.data.exercise} selectedDate={selectedDate} onAdd={life.addExercise} onRemove={life.removeExercise} />
            </CollapsibleSection>
          </div>
        )}

        {/* Tasks */}
        {settings.tasks && (
          <div className="section-reveal stagger-3">
            <CollapsibleSection title="Tasks" icon={<ListTodo className="w-4 h-4" />} accentColor="bg-section-tasks"
              count={life.data.tasks.filter(t => t.date === selectedDate && !t.done).length}>
              <TaskList tasks={life.data.tasks} selectedDate={selectedDate} onAdd={life.addTask} onToggle={life.toggleTask} onRemove={life.removeTask} />
            </CollapsibleSection>
          </div>
        )}

        {/* Habits */}
        {settings.habits && (
          <div className="section-reveal stagger-6">
            <CollapsibleSection title="Habits" icon={<Target className="w-4 h-4" />} accentColor="bg-section-habits"
              count={life.data.habits.length}>
              <HabitTracker habits={life.data.habits} selectedDate={selectedDate} onAdd={life.addHabit} onToggle={life.toggleHabit} onRemove={life.removeHabit} />
            </CollapsibleSection>
          </div>
        )}

        {/* Journal */}
        {settings.journal && (
          <div className="section-reveal stagger-7">
            <CollapsibleSection title="Journal" icon={<BookOpen className="w-4 h-4" />} accentColor="bg-section-journal"
              count={life.data.journal.filter(j => j.date === selectedDate).length}>
              <JournalSection journal={life.data.journal} selectedDate={selectedDate} onAdd={life.addJournal} onRemove={life.removeJournal} />
            </CollapsibleSection>
          </div>
        )}

      </div>
    </div>
  );
};

export default Index;

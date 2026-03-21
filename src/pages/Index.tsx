import { useState } from "react";
import { DollarSign, UtensilsCrossed, Dumbbell, Calendar, Download } from "lucide-react";
import { useLifeData } from "@/hooks/useLifeData";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { ExpenseTracker } from "@/components/ExpenseTracker";
import { FoodLog } from "@/components/FoodLog";
import { ExerciseLog } from "@/components/ExerciseLog";
import { MiniCalendar } from "@/components/MiniCalendar";
import { SummaryStats } from "@/components/SummaryStats";

const Index = () => {
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
          <button
            onClick={life.exportData}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted rounded-md px-3 py-2 active:scale-95 transition-all"
            title="Export all data"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </header>

        {/* Calendar */}
        <div className="section-reveal stagger-1">
          <CollapsibleSection title="Calendar" icon={<Calendar className="w-4 h-4" />} accentColor="bg-primary" defaultOpen>
            <MiniCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />
          </CollapsibleSection>
        </div>

        {/* Monthly Summary */}
        <div className="section-reveal stagger-2">
          <SummaryStats data={life.data} selectedDate={selectedDate} />
        </div>

      </div>
    </div>
  );
};

export default Index;

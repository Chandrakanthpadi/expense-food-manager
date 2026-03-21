import { useState } from "react";
import { Plus, X, Check } from "lucide-react";
import type { FoodEntry, MealCheck } from "@/hooks/useLifeData";

const meals = ["Breakfast", "Lunch", "Dinner", "Snack"];
const coreMeals = ["breakfast", "lunch", "dinner"] as const;
const allMealKeys = ["breakfast", "lunch", "dinner", "snack"] as const;

interface Props {
  food: FoodEntry[];
  mealChecks: MealCheck[];
  selectedDate: string;
  onAdd: (meal: string, items: string, calories?: number, date?: string) => void;
  onRemove: (id: string) => void;
  onToggleMeal: (date: string, meal: "breakfast" | "lunch" | "dinner" | "snack") => void;
}

export function FoodLog({ food, mealChecks, selectedDate, onAdd, onRemove, onToggleMeal }: Props) {
  const [meal, setMeal] = useState(meals[0]);
  const [items, setItems] = useState("");
  const [calories, setCalories] = useState("");

  const dayFood = food.filter(f => f.date === selectedDate);
  const dayCheck = mealChecks.find(m => m.date === selectedDate);

  const handleAdd = () => {
    if (!items.trim()) return;
    const mealKey = meal.toLowerCase() as "breakfast" | "lunch" | "dinner" | "snack";
    onAdd(meal, items.trim(), calories ? parseInt(calories) : undefined, selectedDate);
    // Auto-check the meal if not already checked
    if (!(dayCheck?.[mealKey])) {
      onToggleMeal(selectedDate, mealKey);
    }
    setItems("");
    setCalories("");
  };

  return (
    <div className="space-y-3">
      {/* Meal check row */}
      <div className="flex gap-2">
        {allMealKeys.map(m => {
          const checked = dayCheck?.[m] ?? false;
          const isCore = (coreMeals as readonly string[]).includes(m);
          return (
            <button
              key={m}
              onClick={() => onToggleMeal(selectedDate, m)}
              className={`flex-1 flex flex-col items-center gap-1 rounded-lg py-2 text-xs font-medium transition-all active:scale-95 border ${
                checked
                  ? "bg-section-food/15 border-section-food/40 text-foreground"
                  : "bg-muted/50 border-border/40 text-muted-foreground"
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                checked ? "bg-section-food text-primary-foreground" : "bg-muted"
              }`}>
                {checked && <Check className="w-3 h-3" />}
              </span>
              <span className="capitalize">{m}</span>
              {!isCore && <span className="text-[9px] text-muted-foreground -mt-0.5">optional</span>}
            </button>
          );
        })}
      </div>

      {/* Food entry form */}
      <div className="flex gap-2">
        <select value={meal} onChange={e => setMeal(e.target.value)}
          className="bg-muted rounded-md px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30">
          {meals.map(m => <option key={m}>{m}</option>)}
        </select>
        <input type="text" placeholder="What did you eat?" value={items} onChange={e => setItems(e.target.value)}
          className="flex-1 min-w-0 bg-muted rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30"
          onKeyDown={e => e.key === "Enter" && handleAdd()} />
      </div>
      <div className="flex gap-2">
        <input type="number" placeholder="Calories (optional)" value={calories} onChange={e => setCalories(e.target.value)}
          className="flex-1 bg-muted rounded-md px-3 py-2 text-sm tabular-nums outline-none focus:ring-2 focus:ring-ring/30"
          onKeyDown={e => e.key === "Enter" && handleAdd()} />
        <button onClick={handleAdd} className="bg-section-food text-primary-foreground rounded-md px-3 py-2 text-sm font-medium active:scale-95 transition-transform">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {dayFood.length > 0 && (
        <ul className="space-y-2 pt-1">
          {dayFood.map(f => (
            <li key={f.id} className="flex items-center gap-2 text-sm group">
              <span className="w-2 h-2 rounded-full bg-section-food/60 shrink-0" />
              <span className="text-xs text-muted-foreground w-16">{f.meal}</span>
              <span className="flex-1 truncate">{f.items}</span>
              {f.calories && <span className="tabular-nums text-muted-foreground text-xs">{f.calories} cal</span>}
              <button onClick={() => onRemove(f.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

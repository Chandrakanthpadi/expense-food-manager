import { useCallback, useEffect, useRef, useState } from "react";
import { getISTDateStr } from "@/lib/utils";
import {
  clearLifeDataInDb,
  deleteCollectionItem,
  loadLifeDataFromDb,
  putCollectionItem,
  replaceLifeDataInDb,
} from "@/lib/lifeDataDb";
import { createEmptyLifeData, mergeLifeData, type LifeData } from "@/lib/lifeDataTypes";

export type {
  Expense,
  ExerciseEntry,
  FoodEntry,
  Habit,
  JournalEntry,
  LifeData,
  MealCheck,
  Task,
} from "@/lib/lifeDataTypes";

export function useLifeData() {
  const [data, setData] = useState<LifeData>(() => createEmptyLifeData());
  const dataRef = useRef<LifeData>(createEmptyLifeData());
  const initPromiseRef = useRef<Promise<LifeData> | null>(null);

  const commitData = useCallback((next: LifeData) => {
    dataRef.current = next;
    setData(next);
    return next;
  }, []);

  const ensureLoaded = useCallback(async () => {
    if (!initPromiseRef.current) {
      initPromiseRef.current = loadLifeDataFromDb().then((loaded) => {
        commitData(loaded);
        return loaded;
      });
    }

    return initPromiseRef.current;
  }, [commitData]);

  useEffect(() => {
    void ensureLoaded();
  }, [ensureLoaded]);

  const uid = () => crypto.randomUUID();
  const today = () => getISTDateStr();

  const addExpense = useCallback((amount: number, category: string, note: string, date?: string) => {
    const entry = { id: uid(), amount, category, note, date: date || today() };
    void ensureLoaded().then(() => {
      const current = dataRef.current;
      commitData({ ...current, expenses: [...current.expenses, entry] });
      return putCollectionItem("expenses", entry);
    });
  }, [commitData, ensureLoaded]);

  const removeExpense = useCallback((id: string) => {
    void ensureLoaded().then(() => {
      const current = dataRef.current;
      commitData({ ...current, expenses: current.expenses.filter((expense) => expense.id !== id) });
      return deleteCollectionItem("expenses", id);
    });
  }, [commitData, ensureLoaded]);

  const addFood = useCallback((meal: string, items: string, calories?: number, date?: string) => {
    const entry = { id: uid(), meal, items, calories, date: date || today() };
    void ensureLoaded().then(() => {
      const current = dataRef.current;
      commitData({ ...current, food: [...current.food, entry] });
      return putCollectionItem("food", entry);
    });
  }, [commitData, ensureLoaded]);

  const removeFood = useCallback((id: string) => {
    void ensureLoaded().then(() => {
      const current = dataRef.current;
      commitData({ ...current, food: current.food.filter((entry) => entry.id !== id) });
      return deleteCollectionItem("food", id);
    });
  }, [commitData, ensureLoaded]);

  const toggleMealCheck = useCallback((date: string, meal: "breakfast" | "lunch" | "dinner" | "snack") => {
    void ensureLoaded().then(() => {
      const current = dataRef.current;
      const existing = current.mealChecks.find((item) => item.date === date);
      const nextMealCheck = existing
        ? { ...existing, [meal]: !existing[meal] }
        : { date, breakfast: false, lunch: false, dinner: false, snack: false, [meal]: true };

      commitData({
        ...current,
        mealChecks: existing
          ? current.mealChecks.map((item) => (item.date === date ? nextMealCheck : item))
          : [...current.mealChecks, nextMealCheck],
      });

      return putCollectionItem("mealChecks", nextMealCheck);
    });
  }, [commitData, ensureLoaded]);

  const addExercise = useCallback((activity: string, duration: number, date?: string) => {
    const entry = { id: uid(), activity, duration, date: date || today() };
    void ensureLoaded().then(() => {
      const current = dataRef.current;
      commitData({ ...current, exercise: [...current.exercise, entry] });
      return putCollectionItem("exercise", entry);
    });
  }, [commitData, ensureLoaded]);

  const removeExercise = useCallback((id: string) => {
    void ensureLoaded().then(() => {
      const current = dataRef.current;
      commitData({ ...current, exercise: current.exercise.filter((entry) => entry.id !== id) });
      return deleteCollectionItem("exercise", id);
    });
  }, [commitData, ensureLoaded]);

  const addHabit = useCallback((name: string) => {
    const habit = { id: uid(), name, completedDates: [] };
    void ensureLoaded().then(() => {
      const current = dataRef.current;
      commitData({ ...current, habits: [...current.habits, habit] });
      return putCollectionItem("habits", habit);
    });
  }, [commitData, ensureLoaded]);

  const toggleHabit = useCallback((id: string, date: string) => {
    void ensureLoaded().then(() => {
      const current = dataRef.current;
      const habit = current.habits.find((item) => item.id === id);
      if (!habit) return;

      const nextHabit = {
        ...habit,
        completedDates: habit.completedDates.includes(date)
          ? habit.completedDates.filter((completedDate) => completedDate !== date)
          : [...habit.completedDates, date],
      };

      commitData({
        ...current,
        habits: current.habits.map((item) => (item.id === id ? nextHabit : item)),
      });

      return putCollectionItem("habits", nextHabit);
    });
  }, [commitData, ensureLoaded]);

  const removeHabit = useCallback((id: string) => {
    void ensureLoaded().then(() => {
      const current = dataRef.current;
      commitData({ ...current, habits: current.habits.filter((habit) => habit.id !== id) });
      return deleteCollectionItem("habits", id);
    });
  }, [commitData, ensureLoaded]);

  const addTask = useCallback((text: string, date?: string) => {
    const task = { id: uid(), text, done: false, date: date || today() };
    void ensureLoaded().then(() => {
      const current = dataRef.current;
      commitData({ ...current, tasks: [...current.tasks, task] });
      return putCollectionItem("tasks", task);
    });
  }, [commitData, ensureLoaded]);

  const toggleTask = useCallback((id: string) => {
    void ensureLoaded().then(() => {
      const current = dataRef.current;
      const task = current.tasks.find((item) => item.id === id);
      if (!task) return;

      const nextTask = { ...task, done: !task.done };
      commitData({
        ...current,
        tasks: current.tasks.map((item) => (item.id === id ? nextTask : item)),
      });

      return putCollectionItem("tasks", nextTask);
    });
  }, [commitData, ensureLoaded]);

  const removeTask = useCallback((id: string) => {
    void ensureLoaded().then(() => {
      const current = dataRef.current;
      commitData({ ...current, tasks: current.tasks.filter((task) => task.id !== id) });
      return deleteCollectionItem("tasks", id);
    });
  }, [commitData, ensureLoaded]);

  const addJournal = useCallback((content: string, mood: string, date?: string) => {
    const entry = { id: uid(), content, mood, date: date || today() };
    void ensureLoaded().then(() => {
      const current = dataRef.current;
      commitData({ ...current, journal: [...current.journal, entry] });
      return putCollectionItem("journal", entry);
    });
  }, [commitData, ensureLoaded]);

  const removeJournal = useCallback((id: string) => {
    void ensureLoaded().then(() => {
      const current = dataRef.current;
      commitData({ ...current, journal: current.journal.filter((entry) => entry.id !== id) });
      return deleteCollectionItem("journal", id);
    });
  }, [commitData, ensureLoaded]);

  const resetData = useCallback(() => {
    const emptyData = createEmptyLifeData();
    commitData(emptyData);
    void clearLifeDataInDb();
    localStorage.removeItem("lifeflow-data");
  }, [commitData]);

  const exportData = useCallback(() => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lifeflow-export-${today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  const importData = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        const merged = mergeLifeData(imported);
        commitData(merged);
        await replaceLifeDataInDb(merged);
        localStorage.removeItem("lifeflow-data");
      } catch {
        alert("Invalid file. Please select a valid Lifeflow export JSON.");
      }
    };
    reader.readAsText(file);
  }, [commitData]);

  return {
    data,
    addExpense, removeExpense,
    addFood, removeFood, toggleMealCheck,
    addExercise, removeExercise,
    addHabit, toggleHabit, removeHabit,
    addTask, toggleTask, removeTask,
    addJournal, removeJournal,
    exportData,
    importData,
    resetData,
  };
}

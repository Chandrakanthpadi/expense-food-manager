import { useCallback, useEffect, useRef, useState } from "react";
import { getISTDateStr } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { createEmptyLifeData, mergeLifeData, type LifeData, type Expense } from "@/lib/lifeDataTypes";

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
  const { user } = useAuth();
  const [data, setData] = useState<LifeData>(() => createEmptyLifeData());
  const dataRef = useRef<LifeData>(createEmptyLifeData());
  const loadedRef = useRef(false);

  const commitData = useCallback((next: LifeData) => {
    dataRef.current = next;
    setData(next);
  }, []);

  // Load all data from Supabase
  useEffect(() => {
    if (!user) {
      commitData(createEmptyLifeData());
      loadedRef.current = false;
      return;
    }

    const load = async () => {
      const [expenses, food, mealChecks, exercise, habits, tasks, journal] = await Promise.all([
        supabase.from("expenses").select("id, amount, category, note, date").order("created_at", { ascending: false }),
        supabase.from("food").select("id, meal, items, calories, date").order("created_at", { ascending: false }),
        supabase.from("meal_checks").select("id, date, breakfast, lunch, dinner, snack"),
        supabase.from("exercise").select("id, activity, duration, date").order("created_at", { ascending: false }),
        supabase.from("habits").select("id, name, completed_dates").order("created_at", { ascending: false }),
        supabase.from("tasks").select("id, text, done, date").order("created_at", { ascending: true }),
        supabase.from("journal").select("id, content, mood, date").order("created_at", { ascending: false }),
      ]);

      commitData(mergeLifeData({
        expenses: expenses.data ?? [],
        food: food.data ?? [],
        mealChecks: (mealChecks.data ?? []).map(m => ({
          date: m.date,
          breakfast: m.breakfast,
          lunch: m.lunch,
          dinner: m.dinner,
          snack: m.snack,
        })),
        exercise: exercise.data ?? [],
        habits: (habits.data ?? []).map(h => ({
          id: h.id,
          name: h.name,
          completedDates: h.completed_dates ?? [],
        })),
        tasks: tasks.data ?? [],
        journal: journal.data ?? [],
      }));
      loadedRef.current = true;
    };

    load();
  }, [user, commitData]);

  const uid = () => crypto.randomUUID();
  const today = () => getISTDateStr();

  // ── Expenses ──
  const addExpense = useCallback((amount: number, category: string, note: string, date?: string) => {
    if (!user) return;
    const entry = { id: uid(), amount, category, note, date: date || today() };
    const current = dataRef.current;
    commitData({ ...current, expenses: [entry, ...current.expenses] });
    supabase.from("expenses").insert({ ...entry, user_id: user.id }).then();
  }, [user, commitData]);

  const removeExpense = useCallback((id: string) => {
    const current = dataRef.current;
    commitData({ ...current, expenses: current.expenses.filter(e => e.id !== id) });
    supabase.from("expenses").delete().eq("id", id).then();
  }, [commitData]);

  const updateExpense = useCallback((id: string, updates: Partial<Expense>) => {
    if (!user) return;
    const current = dataRef.current;
    const entry = current.expenses.find(e => e.id === id);
    if (!entry) return;
    
    const next = { ...entry, ...updates };
    commitData({
      ...current,
      expenses: current.expenses.map(e => e.id === id ? next : e)
    });
    
    supabase.from("expenses").update(updates).eq("id", id).then();
  }, [user, commitData]);


  // ── Food ──
  const addFood = useCallback((meal: string, items: string, calories?: number, date?: string) => {
    if (!user) return;
    const entry = { id: uid(), meal, items, calories: calories ?? null, date: date || today() };
    const current = dataRef.current;
    commitData({ ...current, food: [entry, ...current.food] });
    supabase.from("food").insert({ ...entry, user_id: user.id }).then();
  }, [user, commitData]);

  const removeFood = useCallback((id: string) => {
    const current = dataRef.current;
    commitData({ ...current, food: current.food.filter(e => e.id !== id) });
    supabase.from("food").delete().eq("id", id).then();
  }, [commitData]);

  // ── Meal Checks ──
  const toggleMealCheck = useCallback((date: string, meal: "breakfast" | "lunch" | "dinner" | "snack") => {
    if (!user) return;
    const current = dataRef.current;
    const existing = current.mealChecks.find(m => m.date === date);
    const next = existing
      ? { ...existing, [meal]: !existing[meal] }
      : { date, breakfast: false, lunch: false, dinner: false, snack: false, [meal]: true };

    commitData({
      ...current,
      mealChecks: existing
        ? current.mealChecks.map(m => m.date === date ? next : m)
        : [next, ...current.mealChecks],
    });

    supabase.from("meal_checks").upsert({
      user_id: user.id,
      date: next.date,
      breakfast: next.breakfast,
      lunch: next.lunch,
      dinner: next.dinner,
      snack: next.snack,
    }, { onConflict: "user_id,date" }).then();
  }, [user, commitData]);

  // ── Exercise ──
  const addExercise = useCallback((activity: string, duration: number, date?: string) => {
    if (!user) return;
    const entry = { id: uid(), activity, duration, date: date || today() };
    const current = dataRef.current;
    commitData({ ...current, exercise: [entry, ...current.exercise] });
    supabase.from("exercise").insert({ ...entry, user_id: user.id }).then();
  }, [user, commitData]);

  const removeExercise = useCallback((id: string) => {
    const current = dataRef.current;
    commitData({ ...current, exercise: current.exercise.filter(e => e.id !== id) });
    supabase.from("exercise").delete().eq("id", id).then();
  }, [commitData]);

  // ── Habits ──
  const addHabit = useCallback((name: string) => {
    if (!user) return;
    const habit = { id: uid(), name, completedDates: [] as string[] };
    const current = dataRef.current;
    commitData({ ...current, habits: [habit, ...current.habits] });
    supabase.from("habits").insert({ id: habit.id, name, completed_dates: [], user_id: user.id }).then();
  }, [user, commitData]);

  const toggleHabit = useCallback((id: string, date: string) => {
    const current = dataRef.current;
    const habit = current.habits.find(h => h.id === id);
    if (!habit) return;

    const nextDates = habit.completedDates.includes(date)
      ? habit.completedDates.filter(d => d !== date)
      : [...habit.completedDates, date];

    const nextHabit = { ...habit, completedDates: nextDates };
    commitData({
      ...current,
      habits: current.habits.map(h => h.id === id ? nextHabit : h),
    });

    supabase.from("habits").update({ completed_dates: nextDates }).eq("id", id).then();
  }, [commitData]);

  const removeHabit = useCallback((id: string) => {
    const current = dataRef.current;
    commitData({ ...current, habits: current.habits.filter(h => h.id !== id) });
    supabase.from("habits").delete().eq("id", id).then();
  }, [commitData]);

  // ── Tasks ──
  const addTask = useCallback((text: string, date?: string) => {
    if (!user) return;
    const task = { id: uid(), text, done: false, date: date || today() };
    const current = dataRef.current;
    commitData({ ...current, tasks: [...current.tasks, task] });
    supabase.from("tasks").insert({ ...task, user_id: user.id }).then();
  }, [user, commitData]);

  const toggleTask = useCallback((id: string) => {
    const current = dataRef.current;
    const task = current.tasks.find(t => t.id === id);
    if (!task) return;

    const nextTask = { ...task, done: !task.done };
    commitData({
      ...current,
      tasks: current.tasks.map(t => t.id === id ? nextTask : t),
    });

    supabase.from("tasks").update({ done: nextTask.done }).eq("id", id).then();
  }, [commitData]);

  const removeTask = useCallback((id: string) => {
    const current = dataRef.current;
    commitData({ ...current, tasks: current.tasks.filter(t => t.id !== id) });
    supabase.from("tasks").delete().eq("id", id).then();
  }, [commitData]);

  // ── Journal ──
  const addJournal = useCallback((content: string, mood: string, date?: string) => {
    if (!user) return;
    const entry = { id: uid(), content, mood, date: date || today() };
    const current = dataRef.current;
    commitData({ ...current, journal: [entry, ...current.journal] });
    supabase.from("journal").insert({ ...entry, user_id: user.id }).then();
  }, [user, commitData]);

  const removeJournal = useCallback((id: string) => {
    const current = dataRef.current;
    commitData({ ...current, journal: current.journal.filter(e => e.id !== id) });
    supabase.from("journal").delete().eq("id", id).then();
  }, [commitData]);

  // ── Export / Import / Reset ──
  const exportData = useCallback(() => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lifeflow-export-${today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  const importData = useCallback(async (file: File) => {
    if (!user) return;
    const text = await file.text();
    try {
      const imported = JSON.parse(text) as Partial<LifeData>;
      const merged = mergeLifeData(imported);

      // Delete all existing data then insert imported
      await Promise.all([
        supabase.from("expenses").delete().eq("user_id", user.id),
        supabase.from("food").delete().eq("user_id", user.id),
        supabase.from("meal_checks").delete().eq("user_id", user.id),
        supabase.from("exercise").delete().eq("user_id", user.id),
        supabase.from("habits").delete().eq("user_id", user.id),
        supabase.from("tasks").delete().eq("user_id", user.id),
        supabase.from("journal").delete().eq("user_id", user.id),
      ]);

      // Insert in batches
      const userId = user.id;
      await Promise.all([
        merged.expenses.length > 0 && supabase.from("expenses").insert(merged.expenses.map(e => ({ ...e, user_id: userId }))),
        merged.food.length > 0 && supabase.from("food").insert(merged.food.map(f => ({ ...f, calories: f.calories ?? null, user_id: userId }))),
        merged.mealChecks.length > 0 && supabase.from("meal_checks").insert(merged.mealChecks.map(m => ({ user_id: userId, date: m.date, breakfast: m.breakfast, lunch: m.lunch, dinner: m.dinner, snack: m.snack }))),
        merged.exercise.length > 0 && supabase.from("exercise").insert(merged.exercise.map(e => ({ ...e, user_id: userId }))),
        merged.habits.length > 0 && supabase.from("habits").insert(merged.habits.map(h => ({ id: h.id, name: h.name, completed_dates: h.completedDates, user_id: userId }))),
        merged.tasks.length > 0 && supabase.from("tasks").insert(merged.tasks.map(t => ({ ...t, user_id: userId }))),
        merged.journal.length > 0 && supabase.from("journal").insert(merged.journal.map(j => ({ ...j, user_id: userId }))),
      ]);

      commitData(merged);
    } catch {
      alert("Invalid file. Please select a valid LifeFlow export JSON.");
    }
  }, [user, commitData]);

  const resetData = useCallback(async () => {
    if (!user) return;
    commitData(createEmptyLifeData());
    await Promise.all([
      supabase.from("expenses").delete().eq("user_id", user.id),
      supabase.from("food").delete().eq("user_id", user.id),
      supabase.from("meal_checks").delete().eq("user_id", user.id),
      supabase.from("exercise").delete().eq("user_id", user.id),
      supabase.from("habits").delete().eq("user_id", user.id),
      supabase.from("tasks").delete().eq("user_id", user.id),
      supabase.from("journal").delete().eq("user_id", user.id),
    ]);
  }, [user, commitData]);

  return {
    data,
    addExpense, removeExpense, updateExpense,
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

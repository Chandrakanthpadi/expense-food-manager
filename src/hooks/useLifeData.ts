import { useState, useEffect, useCallback } from "react";

export interface Expense {
  id: string;
  amount: number;
  category: string;
  note: string;
  date: string;
}

export interface FoodEntry {
  id: string;
  meal: string;
  items: string;
  calories?: number;
  date: string;
}

export interface MealCheck {
  date: string;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  snack: boolean;
}

export interface ExerciseEntry {
  id: string;
  activity: string;
  duration: number;
  date: string;
}

export interface Habit {
  id: string;
  name: string;
  completedDates: string[];
}

export interface Task {
  id: string;
  text: string;
  done: boolean;
  date: string;
}

export interface JournalEntry {
  id: string;
  content: string;
  mood: string;
  date: string;
}

export interface LifeData {
  expenses: Expense[];
  food: FoodEntry[];
  mealChecks: MealCheck[];
  exercise: ExerciseEntry[];
  habits: Habit[];
  tasks: Task[];
  journal: JournalEntry[];
}

const STORAGE_KEY = "lifeflow-data";

const defaultData: LifeData = {
  expenses: [],
  food: [],
  mealChecks: [],
  exercise: [],
  habits: [],
  tasks: [],
  journal: [],
};

function load(): LifeData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultData, ...JSON.parse(raw) } : defaultData;
  } catch {
    return defaultData;
  }
}

export function useLifeData() {
  const [data, setData] = useState<LifeData>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const uid = () => crypto.randomUUID();
  const today = () => new Date().toISOString().slice(0, 10);

  const addExpense = useCallback((amount: number, category: string, note: string, date?: string) => {
    setData(d => ({ ...d, expenses: [...d.expenses, { id: uid(), amount, category, note, date: date || today() }] }));
  }, []);

  const removeExpense = useCallback((id: string) => {
    setData(d => ({ ...d, expenses: d.expenses.filter(e => e.id !== id) }));
  }, []);

  const addFood = useCallback((meal: string, items: string, calories?: number, date?: string) => {
    setData(d => ({ ...d, food: [...d.food, { id: uid(), meal, items, calories, date: date || today() }] }));
  }, []);

  const removeFood = useCallback((id: string) => {
    setData(d => ({ ...d, food: d.food.filter(e => e.id !== id) }));
  }, []);

  const addExercise = useCallback((activity: string, duration: number, date?: string) => {
    setData(d => ({ ...d, exercise: [...d.exercise, { id: uid(), activity, duration, date: date || today() }] }));
  }, []);

  const removeExercise = useCallback((id: string) => {
    setData(d => ({ ...d, exercise: d.exercise.filter(e => e.id !== id) }));
  }, []);

  const addHabit = useCallback((name: string) => {
    setData(d => ({ ...d, habits: [...d.habits, { id: uid(), name, completedDates: [] }] }));
  }, []);

  const toggleHabit = useCallback((id: string, date: string) => {
    setData(d => ({
      ...d,
      habits: d.habits.map(h =>
        h.id === id
          ? { ...h, completedDates: h.completedDates.includes(date) ? h.completedDates.filter(d => d !== date) : [...h.completedDates, date] }
          : h
      ),
    }));
  }, []);

  const removeHabit = useCallback((id: string) => {
    setData(d => ({ ...d, habits: d.habits.filter(h => h.id !== id) }));
  }, []);

  const addTask = useCallback((text: string, date?: string) => {
    setData(d => ({ ...d, tasks: [...d.tasks, { id: uid(), text, done: false, date: date || today() }] }));
  }, []);

  const toggleTask = useCallback((id: string) => {
    setData(d => ({ ...d, tasks: d.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t) }));
  }, []);

  const removeTask = useCallback((id: string) => {
    setData(d => ({ ...d, tasks: d.tasks.filter(t => t.id !== id) }));
  }, []);

  const addJournal = useCallback((content: string, mood: string, date?: string) => {
    setData(d => ({ ...d, journal: [...d.journal, { id: uid(), content, mood, date: date || today() }] }));
  }, []);

  const removeJournal = useCallback((id: string) => {
    setData(d => ({ ...d, journal: d.journal.filter(j => j.id !== id) }));
  }, []);

  const exportData = useCallback(() => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lifeflow-export-${today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  return {
    data,
    addExpense, removeExpense,
    addFood, removeFood,
    addExercise, removeExercise,
    addHabit, toggleHabit, removeHabit,
    addTask, toggleTask, removeTask,
    addJournal, removeJournal,
    exportData,
  };
}

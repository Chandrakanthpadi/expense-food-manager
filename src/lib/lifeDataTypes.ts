export interface Expense {
  id: string;
  amount: number;
  category: string;
  note: string;
  date: string;
  /** Friend or family member the money was spent on. */
  person?: string | null;
}

export interface Loan {
  id: string;
  person: string;
  amount: number;
  /** "lent" = I gave money; "repaid" = they paid me back; "borrowed" = I took money; "returned" = I paid it back. */
  kind: "lent" | "repaid" | "borrowed" | "returned";
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
  loans: Loan[];
}

export const STORAGE_KEY = "lifeflow-data";

export const COLLECTION_STORES = [
  "expenses",
  "food",
  "mealChecks",
  "exercise",
  "habits",
  "tasks",
  "journal",
  "loans",
] as const satisfies ReadonlyArray<keyof LifeData>;

export type LifeDataStoreName = typeof COLLECTION_STORES[number];

export function createEmptyLifeData(): LifeData {
  return {
    expenses: [],
    food: [],
    mealChecks: [],
    exercise: [],
    habits: [],
    tasks: [],
    journal: [],
    loans: [],
  };
}

export function mergeLifeData(value?: Partial<LifeData> | null): LifeData {
  return {
    expenses: Array.isArray(value?.expenses) ? value.expenses : [],
    food: Array.isArray(value?.food) ? value.food : [],
    mealChecks: Array.isArray(value?.mealChecks) ? value.mealChecks : [],
    exercise: Array.isArray(value?.exercise) ? value.exercise : [],
    habits: Array.isArray(value?.habits) ? value.habits : [],
    tasks: Array.isArray(value?.tasks) ? value.tasks : [],
    journal: Array.isArray(value?.journal) ? value.journal : [],
    loans: Array.isArray(value?.loans) ? value.loans : [],
  };
}
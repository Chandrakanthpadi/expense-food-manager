import { useState, useEffect } from "react";

export type FeatureKey = "expenses" | "food" | "exercise" | "habits" | "tasks" | "journal";

export interface FeatureSettings {
  expenses: boolean;
  food: boolean;
  exercise: boolean;
  habits: boolean;
  tasks: boolean;
  journal: boolean;
  [key: string]: boolean;
}

const STORAGE_KEY = "lifeflow-feature-settings";

const defaultSettings: FeatureSettings = {
  expenses: true,
  food: true,
  exercise: true,
  habits: true,
  tasks: true,
  journal: true,
};

export function useFeatureSettings() {
  const [settings, setSettings] = useState<FeatureSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return { ...defaultSettings, ...JSON.parse(saved) };
      } catch (e) {
        console.error("Failed to parse feature settings", e);
      }
    }
    return defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const toggleFeature = (key: FeatureKey) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return { settings, toggleFeature };
}

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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

function readCache(): FeatureSettings {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return { ...defaultSettings, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
  }
  return defaultSettings;
}

export function useFeatureSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<FeatureSettings>(readCache);
  const loadedForUser = useRef<string | null>(null);

  // Load preferences from backend on user login
  useEffect(() => {
    if (!user) {
      loadedForUser.current = null;
      return;
    }
    if (loadedForUser.current === user.id) return;
    loadedForUser.current = user.id;

    (async () => {
      const { data, error } = await supabase
        .from("user_preferences")
        .select("features")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Failed to load preferences:", error);
        return;
      }

      if (data?.features) {
        const merged = { ...defaultSettings, ...(data.features as Record<string, boolean>) };
        setSettings(merged);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } else {
        // First time: persist current cached defaults
        await supabase.from("user_preferences").upsert({
          user_id: user.id,
          features: settings,
        }, { onConflict: "user_id" });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Cache locally
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const toggleFeature = (key: FeatureKey) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (user) {
        supabase
          .from("user_preferences")
          .upsert({ user_id: user.id, features: next }, { onConflict: "user_id" })
          .then(({ error }) => {
            if (error) console.error("Failed to save preferences:", error);
          });
      }
      return next;
    });
  };

  return { settings, toggleFeature };
}

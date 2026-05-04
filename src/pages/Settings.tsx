import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Upload, RotateCcw, LogOut, Sparkles, ChevronDown, Trash2 } from "lucide-react";
import { useLifeData } from "@/hooks/useLifeData";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { useAuth } from "@/hooks/useAuth";
import { useFeatureSettings, type FeatureKey } from "@/hooks/useFeatureSettings";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,

  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface InsightRow {
  id: string;
  period_label: string;
  content: string;
  created_at: string;
}

const MONTHLY_LIMIT = 10;

const Settings = () => {
  const navigate = useNavigate();
  const life = useLifeData();
  const { signOut, user } = useAuth();
  const { settings, toggleFeature } = useFeatureSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [aiUsed, setAiUsed] = useState<number | null>(null);
  const [insights, setInsights] = useState<InsightRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const yearMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    (async () => {
      const [{ data: usage }, { data: history }] = await Promise.all([
        supabase.from("ai_usage").select("request_count").eq("user_id", user.id).eq("year_month", yearMonth).maybeSingle(),
        supabase.from("ai_insights_history").select("id, period_label, content, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      ]);
      setAiUsed(usage?.request_count ?? 0);
      setInsights(history ?? []);
    })();
  }, [user]);

  const remaining = aiUsed === null ? null : Math.max(0, MONTHLY_LIMIT - aiUsed);

  const deleteInsight = async (id: string) => {
    const prev = insights;
    setInsights(insights.filter(i => i.id !== id));
    const { error } = await supabase.from("ai_insights_history").delete().eq("id", id);
    if (error) {
      console.error(error);
      setInsights(prev);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6 pb-20 space-y-6">
        <header className="flex items-center gap-3 pb-1">
          <button
            onClick={() => navigate("/")}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted hover:bg-muted-foreground/10 active:scale-95 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-xl font-bold tracking-tight leading-none">Settings</h1>
        </header>

        {/* Feature Preferences */}
        <div className="bg-card rounded-xl border border-border/60 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/40">
            <h2 className="text-sm font-semibold">Feature Preferences</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Toggle features you want to track</p>
          </div>
          <div className="divide-y divide-border/40">
            {(Object.keys(settings) as FeatureKey[]).map((key) => (
              <div key={key} className="flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-all">
                <div className="space-y-0.5">
                  <Label htmlFor={`feature-${key}`} className="text-sm font-medium capitalize">
                    {key}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Enable or disable the {key} tracking feature
                  </p>
                </div>
                <Switch
                  id={`feature-${key}`}
                  checked={settings[key]}
                  onCheckedChange={() => toggleFeature(key)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* AI Insights */}
        <div className="bg-card rounded-xl border border-border/60 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> AI Insights
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {remaining === null
                  ? "Loading usage…"
                  : <><span className="font-medium text-foreground">{remaining}</span> of {MONTHLY_LIMIT} requests left this month</>}
              </p>
            </div>
            {remaining !== null && (
              <div className="text-right shrink-0">
                <p className="text-lg font-bold tabular-nums leading-none">{remaining}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">remaining</p>
              </div>
            )}
          </div>

          {insights.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-muted-foreground">
                No saved insights yet. Generate one from the Insights page to see it here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {insights.map((row) => {
                const isOpen = expandedId === row.id;
                const date = new Date(row.created_at).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
                return (
                  <div key={row.id} className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setExpandedId(isOpen ? null : row.id)}
                        className="flex-1 min-w-0 flex items-center gap-2 text-left active:scale-[0.99] transition-all"
                      >
                        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform ${isOpen ? "rotate-0" : "-rotate-90"}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{row.period_label}</p>
                          <p className="text-[11px] text-muted-foreground">{date}</p>
                        </div>
                      </button>
                      <button
                        onClick={() => deleteInsight(row.id)}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-destructive hover:bg-destructive/10 active:scale-95 transition-all"
                        aria-label="Delete insight"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {isOpen && (
                      <div className="mt-2 px-1 prose prose-sm max-w-none text-sm prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-li:text-foreground/90">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{row.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Data Management */}

        <div className="bg-card rounded-xl border border-border/60 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/40">
            <h2 className="text-sm font-semibold">Data Management</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Export, import, or reset your data</p>
          </div>

          <div className="divide-y divide-border/40">
            {/* Export */}
            <button
              onClick={life.exportData}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/50 active:scale-[0.99] transition-all"
            >
              <span className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary/10 text-primary">
                <Download className="w-4.5 h-4.5" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium">Export Data</p>
                <p className="text-xs text-muted-foreground">Download all your data as a JSON file</p>
              </div>
            </button>

            {/* Import */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/50 active:scale-[0.99] transition-all"
            >
              <span className="w-9 h-9 rounded-lg flex items-center justify-center bg-accent/10 text-accent">
                <Upload className="w-4.5 h-4.5" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium">Import Data</p>
                <p className="text-xs text-muted-foreground">Restore data from a previously exported JSON file</p>
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  life.importData(file);
                  e.target.value = "";
                }
              }}
            />

            {/* Reset */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-destructive/5 active:scale-[0.99] transition-all">
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center bg-destructive/10 text-destructive">
                    <RotateCcw className="w-4.5 h-4.5" />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive">Reset All Data</p>
                    <p className="text-xs text-muted-foreground">Permanently delete all entries — this cannot be undone</p>
                  </div>
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset all data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all your entries — expenses, food logs, tasks, habits, journal, and exercises. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={life.resetData}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, reset everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </div>

        {/* Account */}
        <div className="bg-card rounded-xl border border-border/60 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/40">
            <h2 className="text-sm font-semibold">Account</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
          </div>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-destructive/5 active:scale-[0.99] transition-all"
          >
            <span className="w-9 h-9 rounded-lg flex items-center justify-center bg-destructive/10 text-destructive">
              <LogOut className="w-4.5 h-4.5" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Sign Out</p>
            </div>
          </button>
        </div>
      </div>
    </div>
    </div>
  );
};

export default Settings;

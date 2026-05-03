import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Upload, RotateCcw, LogOut } from "lucide-react";
import { useLifeData } from "@/hooks/useLifeData";

import { useAuth } from "@/hooks/useAuth";
import { useFeatureSettings, type FeatureKey } from "@/hooks/useFeatureSettings";
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

const Settings = () => {
  const navigate = useNavigate();
  const life = useLifeData();
  const { signOut, user } = useAuth();
  const { settings, toggleFeature } = useFeatureSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

        {/* AI Settings */}
        <div className="bg-card rounded-xl border border-border/60 overflow-hidden">
          <div className="px-4 py-3">
            <h2 className="text-sm font-semibold">AI Insights</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Powered by a free model. Each account is limited to <span className="font-medium text-foreground">10 AI requests per month</span>.
            </p>
          </div>
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

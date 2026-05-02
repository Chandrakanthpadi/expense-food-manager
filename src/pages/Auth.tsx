import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LogIn, UserPlus, Loader2, KeyRound, ArrowLeft } from "lucide-react";

type Mode = "signin" | "signup" | "forgot";

const Auth = () => {
  const { user, loading, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const reset = (next: Mode) => {
    setMode(next);
    setError(null);
    setInfo(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);

    try {
      if (mode === "signin" || mode === "signup") {
        const result = mode === "signup"
          ? await signUp(email, password)
          : await signIn(email, password);
        if (result.error) setError(result.error);
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) setError(error.message);
        else setInfo("Check your inbox for a reset link. It will let you set a new password.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const titleMap: Record<Mode, { title: string; subtitle: string }> = {
    signin: { title: "LifeFlow", subtitle: "Sign in to your account" },
    signup: { title: "LifeFlow", subtitle: "Create an account to get started" },
    forgot: { title: "Reset password", subtitle: "Enter your email to receive a reset link" },
  };

  const { title, subtitle } = titleMap[mode];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {(mode === "signin" || mode === "signup") && (
            <div className="space-y-2">
              <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
            </div>
          )}

          {mode === "forgot" && (
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          )}

          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          {info && <p className="text-sm text-muted-foreground text-center">{info}</p>}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : mode === "signup" ? (
              <UserPlus className="w-4 h-4 mr-2" />
            ) : mode === "signin" ? (
              <LogIn className="w-4 h-4 mr-2" />
            ) : (
              <KeyRound className="w-4 h-4 mr-2" />
            )}
            {mode === "signup" && "Sign Up"}
            {mode === "signin" && "Sign In"}
            {mode === "forgot" && "Send reset link"}
          </Button>
        </form>

        {mode === "signin" && (
          <div className="text-center">
            <button type="button" onClick={() => reset("forgot")} className="text-sm text-primary font-medium hover:underline">
              Forgot password?
            </button>
          </div>
        )}

        {(mode === "signin" || mode === "signup") && (
          <p className="text-center text-sm text-muted-foreground">
            {mode === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
            <button type="button" onClick={() => reset(mode === "signup" ? "signin" : "signup")} className="text-primary font-medium hover:underline">
              {mode === "signup" ? "Sign In" : "Sign Up"}
            </button>
          </p>
        )}

        {mode === "forgot" && (
          <button type="button" onClick={() => reset("signin")} className="flex items-center justify-center gap-1 mx-auto text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-3 h-3" /> Back to sign in
          </button>
        )}
      </div>
    </div>
  );
};

export default Auth;

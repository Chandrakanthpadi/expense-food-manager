import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LogIn, UserPlus, Loader2, KeyRound, ArrowLeft } from "lucide-react";

type Mode = "signin" | "signup" | "forgot-email" | "forgot-otp" | "forgot-newpass";

const Auth = () => {
  const { user, loading, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
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

  if (user && mode !== "forgot-newpass") return <Navigate to="/" replace />;

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
      } else if (mode === "forgot-email") {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) setError(error.message);
        else {
          setInfo("We sent a 6-digit code to your email.");
          setMode("forgot-otp");
        }
      } else if (mode === "forgot-otp") {
        const { error } = await supabase.auth.verifyOtp({
          email,
          token: otp,
          type: "recovery",
        });
        if (error) setError(error.message);
        else {
          setInfo(null);
          setMode("forgot-newpass");
        }
      } else if (mode === "forgot-newpass") {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) setError(error.message);
        else {
          setInfo("Password updated. You're signed in.");
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const titleMap: Record<Mode, { title: string; subtitle: string }> = {
    signin: { title: "LifeFlow", subtitle: "Sign in to your account" },
    signup: { title: "LifeFlow", subtitle: "Create an account to get started" },
    "forgot-email": { title: "Reset password", subtitle: "Enter your email to receive a code" },
    "forgot-otp": { title: "Enter code", subtitle: `We sent a 6-digit code to ${email}` },
    "forgot-newpass": { title: "New password", subtitle: "Choose a new password for your account" },
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

          {mode === "forgot-email" && (
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          )}

          {mode === "forgot-otp" && (
            <Input type="text" inputMode="numeric" placeholder="6-digit code" value={otp} onChange={(e) => setOtp(e.target.value.trim())} required maxLength={6} autoComplete="one-time-code" />
          )}

          {mode === "forgot-newpass" && (
            <Input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
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
            {mode === "forgot-email" && "Send code"}
            {mode === "forgot-otp" && "Verify code"}
            {mode === "forgot-newpass" && "Update password"}
          </Button>
        </form>

        {mode === "signin" && (
          <div className="text-center">
            <button type="button" onClick={() => reset("forgot-email")} className="text-sm text-primary font-medium hover:underline">
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

        {(mode === "forgot-email" || mode === "forgot-otp" || mode === "forgot-newpass") && (
          <button type="button" onClick={() => reset("signin")} className="flex items-center justify-center gap-1 mx-auto text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-3 h-3" /> Back to sign in
          </button>
        )}
      </div>
    </div>
  );
};

export default Auth;

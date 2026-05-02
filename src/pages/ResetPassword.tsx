import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KeyRound, Loader2 } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [validLink, setValidLink] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Supabase parses the recovery token from the URL hash and emits a PASSWORD_RECOVERY event.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setValidLink(true);
        setReady(true);
      }
    });

    // Fallback: if there's already a session from a recovery link, allow update.
    supabase.auth.getSession().then(({ data: { session } }) => {
      const hash = window.location.hash;
      if (hash.includes("type=recovery") || (session && hash.includes("access_token"))) {
        setValidLink(true);
      }
      setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    setInfo("Password updated. Redirecting…");
    await supabase.auth.signOut();
    setTimeout(() => navigate("/auth", { replace: true }), 1200);
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Choose a new password</h1>
          <p className="text-sm text-muted-foreground">
            {validLink
              ? "Enter and confirm your new password below."
              : "This reset link is invalid or has expired. Request a new one from the sign-in page."}
          </p>
        </div>

        {validLink && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
            <Input
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />

            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            {info && <p className="text-sm text-muted-foreground text-center">{info}</p>}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <KeyRound className="w-4 h-4 mr-2" />
              )}
              Update password
            </Button>
          </form>
        )}

        {!validLink && (
          <Button variant="outline" className="w-full" onClick={() => navigate("/auth", { replace: true })}>
            Back to sign in
          </Button>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;

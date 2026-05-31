import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { AuroraBackground } from "@/components/AuroraBackground";
import { AivoraLogo } from "@/components/AivoraLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Mail, Lock, Sparkles } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Aivora" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "magic" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/chat", replace: true });
    });
  }, [navigate]);

  const handleGoogle = async () => {
    setLoading(true);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) { toast.error("Google sign-in failed"); setLoading(false); return; }
    if (res.redirected) return;
    navigate({ to: "/chat", replace: true });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
        navigate({ to: "/chat", replace: true });
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin, data: { display_name: name || email.split("@")[0] } },
        });
        if (error) throw error;
        toast.success("Account created");
        navigate({ to: "/chat", replace: true });
      } else if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        toast.success("Magic link sent. Check your email.");
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" });
        if (error) throw error;
        toast.success("Password reset email sent.");
      }
    } catch (err) {
      toast.error((err as Error).message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12">
      <AuroraBackground />
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="flex flex-col items-center gap-3 mb-8">
          <AivoraLogo size={56} />
          <h1 className="font-display text-3xl font-bold text-gradient">Aivora</h1>
          <p className="text-sm text-muted-foreground">The premium AI operating system</p>
        </div>

        <div className="glass-strong gradient-border rounded-2xl p-8 shadow-[var(--shadow-elegant)]">
          <div className="flex gap-1 mb-6 p-1 rounded-xl bg-[oklch(1_0_0/0.04)]">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  mode === m ? "bg-[oklch(0.82_0.16_195/0.18)] text-foreground neon-border" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <Button onClick={handleGoogle} disabled={loading} variant="outline" className="w-full glass hover:bg-[oklch(1_0_0/0.06)] border-[var(--glass-border)]">
            <svg viewBox="0 0 24 24" className="w-4 h-4 mr-2"><path fill="#fff" d="M21.35 11.1H12v3.2h5.35c-.23 1.4-1.66 4.1-5.35 4.1-3.22 0-5.85-2.66-5.85-5.95s2.63-5.95 5.85-5.95c1.83 0 3.06.78 3.76 1.45l2.57-2.48C16.7 3.96 14.6 3 12 3 6.98 3 3 6.98 3 12s3.98 9 9 9c5.2 0 8.65-3.65 8.65-8.78 0-.59-.07-1.04-.3-2.12z"/></svg>
            Continue with Google
          </Button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label>Display name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" className="glass" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@aivora.ai" className="glass pl-9" />
              </div>
            </div>
            {(mode === "login" || mode === "signup") && (
              <div className="space-y-1.5">
                <Label>Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="glass pl-9" />
                </div>
              </div>
            )}
            {mode === "login" && (
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
                  <Checkbox checked={remember} onCheckedChange={(v) => setRemember(!!v)} /> Remember me
                </label>
                <button type="button" onClick={() => setMode("forgot")} className="text-primary hover:text-primary-glow">Forgot password?</button>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-[oklch(0.82_0.16_195)] to-[oklch(0.72_0.22_305)] text-[oklch(0.14_0.04_240)] font-semibold hover:opacity-90 neon-glow">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : mode === "magic" ? "Send magic link" : "Send reset email"}
            </Button>

            <div className="flex justify-between text-xs text-muted-foreground">
              <button type="button" onClick={() => setMode(mode === "magic" ? "login" : "magic")} className="hover:text-foreground">
                {mode === "magic" ? "Back to password" : "Use magic link instead"}
              </button>
              {mode === "forgot" && (
                <button type="button" onClick={() => setMode("login")} className="hover:text-foreground">Back to sign in</button>
              )}
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing you agree to Aivora's <Link to="/login" className="underline">Terms</Link> and <Link to="/login" className="underline">Privacy</Link>.
        </p>
      </div>
    </div>
  );
}
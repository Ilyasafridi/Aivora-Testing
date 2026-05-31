import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuroraBackground } from "@/components/AuroraBackground";
import { AivoraLogo } from "@/components/AivoraLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    navigate({ to: "/chat" });
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      <AuroraBackground />
      <form onSubmit={submit} className="w-full max-w-md glass-strong gradient-border rounded-2xl p-8 space-y-5">
        <div className="flex flex-col items-center gap-3">
          <AivoraLogo size={48} />
          <h1 className="font-display text-2xl text-gradient">Set a new password</h1>
        </div>
        <div className="space-y-1.5">
          <Label>New password</Label>
          <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="glass" />
        </div>
        <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-[oklch(0.82_0.16_195)] to-[oklch(0.72_0.22_305)] text-[oklch(0.14_0.04_240)] font-semibold">
          Update password
        </Button>
      </form>
    </div>
  );
}
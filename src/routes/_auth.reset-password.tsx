import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_auth/reset-password")({
  head: () => ({ meta: [{ title: "Set new password — BizIntel" }] }),
  component: Reset,
});

function Reset() {
  const navigate = useNavigate();
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (p1.length < 8) return toast.error("Password must be at least 8 characters");
    if (p1 !== p2) return toast.error("Passwords do not match");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    toast.success("Password updated. Please sign in.");
    navigate({ to: "/signin" });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Set a new password</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose a strong password you don't use anywhere else.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="p1">New password</Label>
          <Input id="p1" type="password" value={p1} onChange={(e) => setP1(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p2">Confirm password</Label>
          <Input id="p2" type="password" value={p2} onChange={(e) => setP2(e.target.value)} />
        </div>
        <Button type="submit" disabled={loading} className="w-full bg-[color:var(--color-brand)] text-[color:var(--color-brand-foreground)] hover:bg-[color:var(--color-brand)]/90">
          {loading ? "Updating…" : "Update password"}
        </Button>
      </form>
    </div>
  );
}
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_auth/forgot")({
  head: () => ({ meta: [{ title: "Reset password — BizIntel" }] }),
  component: Forgot,
});

function Forgot() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error("Please enter your email");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setLoading(false);
    setSent(true);
  };

  return (
    <div>
      <Link to="/signin" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </Link>
      {!sent ? (
        <>
          <h1 className="text-2xl font-bold text-foreground">Forgot your password?</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter the email tied to your account and we'll send a secure reset link.
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-[color:var(--color-brand)] text-[color:var(--color-brand-foreground)] hover:bg-[color:var(--color-brand)]/90">
              {loading ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        </>
      ) : (
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[color:var(--color-teal)]/20 text-[color:var(--color-teal)]">
            <MailCheck className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Check your inbox</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            We've sent a password reset link to <span className="font-medium text-foreground">{email}</span>. The link expires in 30 minutes.
          </p>
          <Button variant="outline" className="mt-6" onClick={() => setSent(false)}>Send again</Button>
        </div>
      )}
    </div>
  );
}
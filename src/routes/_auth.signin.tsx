import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useAuth } from "@/lib/auth";
import { requestLoginCode, verifyLoginCode } from "@/lib/api";

export const Route = createFileRoute("/_auth/signin")({
  head: () => ({ meta: [{ title: "Sign in — BizIntel" }] }),
  component: SignIn,
});

function SignIn() {
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [showVerify, setShowVerify] = useState(false);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const sendCode = async () => {
    await requestLoginCode(email);
    setCode("");
    setShowVerify(true);
    setCooldown(30);
    toast.success(`Verification code sent to ${email}`);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter your email and password");
      return;
    }
    setLoading(true);
    try {
      await sendCode();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send verification code");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0) return;
    try {
      await sendCode();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not resend code");
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setVerifying(true);
    try {
      await verifyLoginCode(email, code);
      signIn(email);
      setShowVerify(false);
      toast.success("Welcome back");
      navigate({ to: "/setup" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setVerifying(false);
    }
  };

  const quickDemo = () => {
    signIn("demo@bizintel.app", "Demo User", { onboarded: true, mode: "ai" });
    navigate({ to: "/dashboard" });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Sign in to BizIntel</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Continue exploring your business opportunities.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button variant="outline" type="button" onClick={quickDemo}>
          <GoogleIcon className="mr-2 h-4 w-4" /> Google
        </Button>
        <Button variant="outline" type="button" onClick={quickDemo}>
          <AppleIcon className="mr-2 h-4 w-4" /> Apple
        </Button>
      </div>
      <div className="my-6 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs uppercase tracking-widest text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot" className="text-xs font-medium text-[color:var(--color-brand)] hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox defaultChecked /> Keep me signed in
        </label>
        <Button type="submit" disabled={loading} className="w-full bg-[color:var(--color-brand)] text-[color:var(--color-brand-foreground)] hover:bg-[color:var(--color-brand)]/90">
          {loading ? "Sending code…" : "Sign in"}
        </Button>
        <button type="button" onClick={quickDemo} className="w-full text-center text-xs text-muted-foreground hover:text-foreground">
          Or explore with the demo account →
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to BizIntel?{" "}
        <Link to="/signup" className="font-medium text-[color:var(--color-brand)] hover:underline">
          Create an account
        </Link>
      </p>

      <Dialog open={showVerify} onOpenChange={setShowVerify}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Check your email</DialogTitle>
            <DialogDescription>
              We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>. Enter it below to finish signing in.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={verify} className="space-y-4">
            <div className="flex justify-center py-2">
              <InputOTP maxLength={6} value={code} onChange={setCode} autoFocus>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button
                type="submit"
                disabled={verifying || code.length !== 6}
                className="w-full bg-[color:var(--color-brand)] text-[color:var(--color-brand-foreground)] hover:bg-[color:var(--color-brand)]/90"
              >
                {verifying ? "Verifying…" : "Verify & sign in"}
              </Button>
              <button
                type="button"
                onClick={resend}
                disabled={cooldown > 0}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.9 3.6 14.7 2.8 12 2.8 6.9 2.8 2.8 6.9 2.8 12S6.9 21.2 12 21.2c6.9 0 9.4-4.8 9.4-9 0-.6-.1-1.1-.2-1.5H12z"/>
    </svg>
  );
}
function AppleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M16.4 12.6c0-2 1.6-3 1.7-3-1-1.4-2.4-1.6-2.9-1.6-1.2-.1-2.4.7-3 .7-.7 0-1.6-.7-2.6-.7-1.4 0-2.6.8-3.3 2-1.4 2.4-.4 6 1 8 .7 1 1.5 2.1 2.6 2.1s1.4-.7 2.7-.7 1.6.7 2.7.7 1.9-1 2.6-2c.8-1.1 1.2-2.2 1.2-2.3-.1 0-2.3-.9-2.3-3.2zm-2-6c.6-.7 1-1.6 1-2.6-1 .1-2 .7-2.6 1.4-.5.6-1 1.6-1 2.5 1.1.1 2.1-.6 2.6-1.3z"/>
    </svg>
  );
}
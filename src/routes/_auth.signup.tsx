import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Building2, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_auth/signup")({
  head: () => ({ meta: [{ title: "Create account — BizIntel" }] }),
  component: SignUp,
});

function SignUp() {
  const { signUpWith } = useAuth();
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState<"individual" | "organization">("individual");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [country, setCountry] = useState("India");
  const [agree, setAgree] = useState(true);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Please fill all fields");
    if (accountType === "individual" && !name) return toast.error("Please enter your name");
    if (accountType === "organization" && (!orgName || !industry || !companySize || !country))
      return toast.error("Please complete organization details");
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if (!agree) return toast.error("Please accept the terms to continue");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    signUpWith({
      email,
      name: accountType === "organization" ? orgName : name,
      accountType,
      orgName: accountType === "organization" ? orgName : undefined,
      industry: accountType === "organization" ? industry : undefined,
      companySize: accountType === "organization" ? companySize : undefined,
      country: accountType === "organization" ? country : undefined,
      company: accountType === "organization" ? orgName : undefined,
    });
    toast.success("Account created");
    navigate({ to: "/setup" });
  };

  const strength = Math.min(4, Math.floor(password.length / 3));
  const strengthLabel = ["Weak", "Fair", "Good", "Strong", "Excellent"][strength] ?? "";

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Create your account</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Start ranking business opportunities in your city today.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1">
        {([
          { id: "individual", label: "Individual", icon: UserIcon },
          { id: "organization", label: "Organization", icon: Building2 },
        ] as const).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setAccountType(t.id)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
              accountType === t.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="mt-5 space-y-4">
        {accountType === "individual" ? (
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" placeholder="Alex Chen" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="orgName">Organization name</Label>
              <Input id="orgName" placeholder="Acme Ventures" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Industry</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                  <SelectContent>
                    {["Food & Beverage","Retail","Health & Wellness","Technology","Education","Real Estate","Professional Services","Manufacturing","Other"].map((i) => (
                      <SelectItem key={i} value={i}>{i}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Company size</Label>
                <Select value={companySize} onValueChange={setCompanySize}>
                  <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                  <SelectContent>
                    {["1–10","11–50","51–200","201–500","500+"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent>
                  {["India"].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input id="email" type="email" placeholder="alex@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
          {password && (
            <div className="mt-1 flex items-center gap-2">
              <div className="flex flex-1 gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={`h-1 flex-1 rounded ${i < strength ? "bg-[color:var(--color-brand)]" : "bg-secondary"}`}
                  />
                ))}
              </div>
              <span className="text-[11px] text-muted-foreground">{strengthLabel}</span>
            </div>
          )}
        </div>
        <label className="flex items-start gap-2 text-xs text-muted-foreground">
          <Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} className="mt-0.5" />
          <span>
            I agree to the{" "}
            <a className="text-[color:var(--color-brand)] hover:underline" href="#">Terms of Service</a> and{" "}
            <a className="text-[color:var(--color-brand)] hover:underline" href="#">Privacy Policy</a>.
          </span>
        </label>
        <Button type="submit" disabled={loading} className="w-full bg-[color:var(--color-brand)] text-[color:var(--color-brand-foreground)] hover:bg-[color:var(--color-brand)]/90">
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/signin" className="font-medium text-[color:var(--color-brand)] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
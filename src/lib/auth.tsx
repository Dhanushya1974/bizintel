import * as React from "react";
import { useNavigate } from "@tanstack/react-router";

export type User = {
  id: string;
  name: string;
  email: string;
  company?: string;
  role?: string;
  avatarInitials: string;
  onboarded: boolean;
  accountType?: "individual" | "organization";
  orgName?: string;
  industry?: string;
  companySize?: string;
  country?: string;
  state?: string;
  city?: string;
  pincode?: string;
  userType?: string;
  budget?: string;
  experience?: string;
  businessGoal?: string;
  timeline?: string;
  plan?: "explorer" | "starter" | "pro" | "business" | "enterprise";
  /** How the user wants to work: analyse their own idea, or get AI-ranked opportunities. */
  mode?: "own-idea" | "ai";
  /** Free-text description of the user's own business idea (mode === "own-idea"). */
  idea?: string;
  /** Opportunity the user picked from AI recommendations (mode === "ai"). */
  focusOpportunityId?: string;
  /** Candidate site coordinates — from a pasted Google Maps link (exact pin). */
  siteLat?: number;
  siteLng?: number;
  siteLabel?: string;
  /** Approximate coordinates geocoded from the user's city / pincode. */
  geoLat?: number;
  geoLng?: number;
};

type AuthState = {
  user: User | null;
  signIn: (email: string, name?: string, extra?: Partial<User>) => void;
  signUpWith: (u: Partial<User> & { email: string; name: string }) => void;
  signOut: () => void;
  updateUser: (patch: Partial<User>) => void;
};

const AuthCtx = React.createContext<AuthState | null>(null);
const KEY = "bizintel.user";

function loadUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  React.useEffect(() => {
    setUser(loadUser());
  }, []);

  const persist = (u: User | null) => {
    setUser(u);
    if (typeof window !== "undefined") {
      if (u) window.localStorage.setItem(KEY, JSON.stringify(u));
      else window.localStorage.removeItem(KEY);
    }
  };

  const signIn = (email: string, name?: string, extra?: Partial<User>) => {
    const displayName = name || email.split("@")[0].replace(/\W+/g, " ");
    const initials = displayName
      .split(/\s+/)
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";
    persist({
      id: crypto.randomUUID(),
      name: displayName,
      email,
      avatarInitials: initials,
      onboarded: false,
      accountType: "individual",
      plan: "explorer",
      ...extra,
    });
  };

  const signUpWith = (u: Partial<User> & { email: string; name: string }) => {
    const initials = u.name
      .split(/\s+/)
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";
    persist({
      id: crypto.randomUUID(),
      avatarInitials: initials,
      onboarded: false,
      plan: "explorer",
      accountType: "individual",
      ...u,
    } as User);
  };

  const signOut = () => persist(null);
  const updateUser = (patch: Partial<User>) =>
    persist(user ? { ...user, ...patch } : null);

  return (
    <AuthCtx.Provider value={{ user, signIn, signUpWith, signOut, updateUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function useRequireAuth() {
  const { user } = useAuth();
  const navigate = useNavigate();
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = loadUser();
    if (!user && !stored) navigate({ to: "/signin" });
  }, [user, navigate]);
  return user;
}
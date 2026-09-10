import * as React from "react";

const KEY = "bizintel.projects";
const EVENT = "bizintel:projects";

/** A saved analysis. Persisted in localStorage, synced across tabs and components. */
export type Project = {
  id: string;
  title: string;
  location: string;
  businessType: string;
  category: string;
  /** Opportunity the Market / Competitors / Location / Insights tabs analyse. */
  focusOpportunityId: string;
  lat?: number;
  lng?: number;
  score: number;
  status: "Complete";
  /** ISO date (YYYY-MM-DD). */
  createdAt: string;
  updatedAt: string;
};

export type NewProject = Omit<Project, "id" | "status" | "createdAt" | "updatedAt">;

const today = () => new Date().toISOString().slice(0, 10);

function read(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw)
      ? (raw as Project[]).filter((p) => p && typeof p.id === "string")
      : [];
  } catch {
    return [];
  }
}

function write(list: Project[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVENT));
}

/** Non-hook reader — used by the report route to resolve `/projects/$id`. */
export function getProject(id: string): Project | null {
  return read().find((p) => p.id === id) ?? null;
}

export function addProject(input: NewProject): Project {
  const now = today();
  const project: Project = {
    ...input,
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `p_${Date.now().toString(36)}`,
    status: "Complete",
    createdAt: now,
    updatedAt: now,
  };
  write([project, ...read()]);
  return project;
}

/** localStorage-backed list of saved projects, newest first. */
export function useProjects() {
  const [projects, setProjects] = React.useState<Project[]>([]);

  React.useEffect(() => {
    setProjects(read());
    const sync = () => setProjects(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const remove = React.useCallback((id: string) => {
    const next = read().filter((p) => p.id !== id);
    write(next);
    setProjects(next);
  }, []);

  const add = React.useCallback((input: NewProject) => {
    const project = addProject(input);
    setProjects(read());
    return project;
  }, []);

  return { projects, add, remove };
}

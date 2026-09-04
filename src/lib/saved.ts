import * as React from "react";

const KEY = "bizintel.saved.opportunities";
const EVENT = "bizintel:saved-opportunities";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event(EVENT));
}

/** localStorage-backed set of saved opportunity ids, synced across tabs and components. */
export function useSavedOpportunities() {
  const [ids, setIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    setIds(read());
    const sync = () => setIds(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = React.useCallback((id: string) => {
    const current = read();
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    write(next);
    setIds(next);
    return next.includes(id);
  }, []);

  const isSaved = React.useCallback((id: string) => ids.includes(id), [ids]);

  return { ids, isSaved, toggle };
}

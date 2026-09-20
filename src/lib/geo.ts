import { resolveApiUrl } from "@/lib/api";

/** fetch + JSON with a hard client-side timeout, so a slow backend never hangs the UI. */
async function getJson<T>(url: string, timeoutMs = 20_000): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { message?: string }).message || `Request failed (${res.status})`);
  return data as T;
}

export type ResolvedPlace = {
  latitude: number;
  longitude: number;
  source_url?: string;
  resolved_url?: string;
  cached?: boolean;
};

/** Turn a pasted Google Maps link into coordinates via the backend. */
export async function resolveMapsLink(link: string): Promise<ResolvedPlace> {
  const api = resolveApiUrl();
  if (!api) throw new Error("Backend not reachable — start the API to resolve map links.");
  const res = await fetch(`${api}/api/resolve-maps-link`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ maps_link: link }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data as ResolvedPlace;
}

/** Keyless Google Maps embed for a point. */
export function embedUrl(lat: number, lng: number, zoom = 15): string {
  return `https://www.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`;
}

export type GeocodeResult = {
  latitude: number;
  longitude: number;
  label?: string;
  address?: { city?: string | null; state?: string | null; country?: string | null };
  source?: string;
  cached?: boolean;
};

export type NearbyPlace = {
  id: string;
  name: string;
  kind: string;
  lat: number;
  lng: number;
  distanceMi: number;
  info?: string;
};
export type NearbyResult = {
  competitors: NearbyPlace[];
  count: number;
  radius: number;
  keyword?: string;
  broadened?: boolean;
  source: "overpass" | "cache" | string;
};

/** Live nearby competitors from OpenStreetMap (Overpass), around a point. */
export async function fetchNearby(p: {
  lat: number;
  lng: number;
  category?: string;
  name?: string;
  radius?: number;
}): Promise<NearbyResult> {
  const api = resolveApiUrl();
  if (!api) throw new Error("Backend not reachable — start the API for live competitor data.");
  const q = new URLSearchParams({ lat: String(p.lat), lng: String(p.lng) });
  if (p.category) q.set("category", p.category);
  if (p.name) q.set("name", p.name);
  if (p.radius) q.set("radius", String(p.radius));
  // Backend worst case: a full 26s Overpass pass, plus (if that comes up empty) a
  // shorter 10s broadened retry — give it real margin instead of racing it.
  return getJson<NearbyResult>(`${api}/api/nearby?${q.toString()}`, 40_000);
}

export type SiteScoreResult = {
  overall: number;
  rows: { l: string; v: number }[];
  signals: {
    competitorCount: number | null;
    population: number | null;
    place: string | null;
    transitStops: number | null;
    commerce: number | null;
    education: number | null;
  };
  live: boolean;
  source: string;
};

/** Rough settlement class from population, for a "Area type" tile. */
export function areaTypeFromPopulation(pop: number | null): string | null {
  if (pop == null) return null;
  if (pop >= 5_000_000) return "Metro";
  if (pop >= 1_000_000) return "Major city";
  if (pop >= 300_000) return "City";
  if (pop >= 50_000) return "Town";
  return "Local area";
}

/** Location rating computed from live signals (competitor density, population, transit). */
export async function fetchSiteScore(p: {
  lat: number;
  lng: number;
  category?: string;
  name?: string;
  demand?: number;
  competition?: number;
}): Promise<SiteScoreResult> {
  const api = resolveApiUrl();
  if (!api) throw new Error("Backend not reachable — start the API for a live site score.");
  const q = new URLSearchParams({ lat: String(p.lat), lng: String(p.lng) });
  if (p.category) q.set("category", p.category);
  if (p.name) q.set("name", p.name);
  if (p.demand != null) q.set("demand", String(p.demand));
  if (p.competition != null) q.set("competition", String(p.competition));
  // Overpass counts and the population lookup now run concurrently on the backend,
  // but the population lookup can itself fall back to a slower Overpass query
  // (up to ~20s) — give it real margin rather than cutting it off early.
  return getJson<SiteScoreResult>(`${api}/api/site-score?${q.toString()}`, 26_000);
}

/** Geocode a city/pincode via the backend (OSM Nominatim + India pincode service). */
export async function geocodeLocation(place: {
  city?: string;
  pincode?: string;
  state?: string;
  country?: string;
}): Promise<GeocodeResult> {
  const api = resolveApiUrl();
  if (!api) throw new Error("Backend not reachable — start the API to look up locations.");
  const res = await fetch(`${api}/api/geocode`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(place),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data as GeocodeResult;
}

export type IdeaProfile = {
  idea: string;
  businessType: string;
  summary: string;
  customers: string[];
  competitorTerms: string[];
  category: string | null;
  keyword: string;
  wiki: { title: string; extract: string; url: string | null } | null;
  source: "llm" | "rules";
};

/** What the backend understood the idea to be (LLM when configured) + web context. */
export async function analyzeIdea(name: string, category?: string): Promise<IdeaProfile> {
  const api = resolveApiUrl();
  if (!api) throw new Error("Backend not reachable — start the API to analyze the idea.");
  const res = await fetch(`${api}/api/analyze-idea`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, category }),
    signal: AbortSignal.timeout(40_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data as IdeaProfile;
}

export type IdeaResearch = {
  available: boolean;
  reason?: string;
  whatItIs?: string | null;
  marketSize?: string | null;
  growth?: string | null;
  trends?: string[];
  typicalInvestment?: string | null;
  leadingPlayers?: string[];
  regulations?: string[];
  opportunities?: string[];
  risks?: string[];
  sources?: { title: string; url: string }[];
};

/** Live web research (search-grounded LLM) on the idea, with cited sources. */
export async function researchIdea(name: string, location?: string): Promise<IdeaResearch> {
  const api = resolveApiUrl();
  if (!api) throw new Error("Backend not reachable — start the API for web research.");
  const res = await fetch(`${api}/api/research-idea`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, location }),
    signal: AbortSignal.timeout(90_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data as IdeaResearch;
}

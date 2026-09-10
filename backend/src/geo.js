// Resolve a Google Maps share link (incl. maps.app.goo.gl short links) to lat/lng.
// No API key: we follow the redirects ourselves and pull coordinates out of the
// final URL, falling back to the HTML body. Host-allowlisted to avoid SSRF, and
// results are cached in-process.

import {
  getCachedGeocode,
  putCachedGeocode,
  getCachedNearby,
  putCachedNearby,
} from "./db.js";

const ALLOWED_HOSTS = new Set([
  "maps.app.goo.gl",
  "goo.gl",
  "maps.google.com",
  "www.google.com",
  "google.com",
  "www.google.co.in",
  "google.co.in",
]);

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const TIMEOUT_MS = 10_000;
const MAX_HOPS = 6;
const TTL_MS = 24 * 60 * 60 * 1000;

const cache = new Map(); // link -> { value, exp }

function fromCache(key) {
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.value;
  if (hit) cache.delete(key);
  return null;
}

function isAllowed(urlStr) {
  let u;
  try {
    u = new URL(urlStr);
  } catch {
    return false;
  }
  return (u.protocol === "https:" || u.protocol === "http:") && ALLOWED_HOSTS.has(u.hostname);
}

// Most reliable first: !3d!4d is the pinned place; @lat,lng is only the map centre.
const URL_PATTERNS = [
  /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
  /[?&](?:q|query|destination|center|ll)=(-?\d+\.\d+)(?:%2C|,)(-?\d+\.\d+)/,
  /@(-?\d+\.\d+),(-?\d+\.\d+)/,
  /\/(-?\d+\.\d+),(-?\d+\.\d+)/,
];
// The HTML body of a coordinate-less page (e.g. ?q=place+name) is full of unrelated
// lat/lngs and geo-IP guesses — only trust an explicit pinned-place marker there.
const BODY_PATTERNS = [/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/];

function extractCoords(text, patterns = URL_PATTERNS) {
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        return { lat, lng };
      }
    }
  }
  return null;
}

const err = (message, status) => Object.assign(new Error(message), { status });

/** Follow redirects manually, checking every hop against the host allowlist. */
async function fetchFollowing(startUrl) {
  let url = startUrl;
  for (let i = 0; i < MAX_HOPS; i++) {
    if (!isAllowed(url)) throw err("link points outside Google Maps", 400);
    const res = await fetch(url, {
      redirect: "manual",
      headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = new URL(res.headers.get("location"), url).toString();
      continue;
    }
    return { res, finalUrl: url };
  }
  throw err("too many redirects", 400);
}

export async function resolveMapsLink(link) {
  if (typeof link !== "string" || !link.trim()) throw err("maps_link is required", 400);
  link = link.trim();
  if (!isAllowed(link)) throw err("only Google Maps links are supported", 400);

  const cached = fromCache(link);
  if (cached) return { ...cached, cached: true };

  const { res, finalUrl } = await fetchFollowing(link);

  let coords = extractCoords(decodeURIComponent(finalUrl));
  if (!coords) coords = extractCoords(finalUrl);
  if (!coords) {
    const body = await res.text();
    coords = extractCoords(body, BODY_PATTERNS);
  }
  if (!coords) {
    throw err("no pin in that link — open the place in Google Maps and use its Share link", 422);
  }

  const value = {
    latitude: coords.lat,
    longitude: coords.lng,
    source_url: link,
    resolved_url: finalUrl,
  };
  cache.set(link, { value, exp: Date.now() + TTL_MS });
  return value;
}

// --- geocoding: city / pincode -> lat,lng (+ address autofill) -----------

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const GEO_UA = "BizIntel/1.0 (business location intelligence)";
const POSTAL_IN = "https://api.postalpincode.in/pincode";

/** Serialize calls to a shared public API and keep >= minGapMs between them. */
function makeThrottle(minGapMs) {
  let chain = Promise.resolve();
  let last = 0;
  return (fn) => {
    const run = async () => {
      const wait = minGapMs - (Date.now() - last);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      last = Date.now();
      return fn();
    };
    chain = chain.then(run, run);
    return chain;
  };
}
const throttled = makeThrottle(1100); // Nominatim usage policy: max 1 req/s

const norm = (s) => (s || "").trim();
const geoKey = (p) =>
  [p.pincode, p.city, p.state, p.country].map((s) => norm(s).toLowerCase()).join("|");

/** Pull city/state/country out of a Nominatim `address` object (fields vary a lot). */
function pickAddress(a = {}) {
  return {
    city:
      a.city || a.town || a.village || a.municipality || a.suburb || a.county || a.state_district || null,
    state: a.state || null,
    country: a.country || null,
  };
}

/** India-specific, free, no key — far better than Nominatim for IN pincodes. Retried once. */
async function lookupIndiaPincode(pincode) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${POSTAL_IN}/${pincode}`, { signal: AbortSignal.timeout(8000) });
      const json = await res.json();
      const rec = Array.isArray(json) ? json[0] : null;
      const po = rec?.Status === "Success" ? rec.PostOffice?.[0] : null;
      if (po) return { city: po.District || po.Block || po.Name, state: po.State, country: po.Country || "India" };
    } catch {
      /* retry */
    }
    if (attempt === 0) await new Promise((r) => setTimeout(r, 1200));
  }
  return null;
}

const IN_STATES = new Set([
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana",
  "Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur",
  "Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
  "Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Jammu and Kashmir","Ladakh",
  "Puducherry","Chandigarh",
]);

/** Last-resort: pull city/state out of a Nominatim display_name like "Chittoor, Andhra Pradesh, 517001, India". */
function deriveFromLabel(label) {
  if (!label) return { city: null, state: null };
  const parts = label.split(",").map((s) => s.trim()).filter((s) => s && !/^\d[\d\s-]*$/.test(s));
  const last = parts[parts.length - 1];
  const segs = /india/i.test(last || "") ? parts.slice(0, -1) : parts;
  const state = segs.find((s) => IN_STATES.has(s)) || null;
  const city = segs.find((s) => s !== state) || null;
  return { city, state };
}

async function queryNominatim(params) {
  const url = new URL(NOMINATIM);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");
  for (const [k, v] of Object.entries(params)) if (norm(v)) url.searchParams.set(k, norm(v));
  const res = await fetch(url, {
    headers: { "User-Agent": GEO_UA, "Accept-Language": "en" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw err(`geocoder returned ${res.status}`, 502);
  const rows = await res.json();
  const r = Array.isArray(rows) ? rows[0] : null;
  if (!r) return null;
  const lat = parseFloat(r.lat);
  const lng = parseFloat(r.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { latitude: lat, longitude: lng, label: r.display_name || null, address: r.address || {} };
}

export async function geocode(place) {
  const city = norm(place?.city);
  const pincode = norm(place?.pincode);
  const state = norm(place?.state);
  const country = norm(place?.country);
  if (!city && !pincode) throw err("city or pincode is required", 400);

  const key = geoKey({ city, pincode, state, country });
  const memHit = fromCache("geo:" + key);
  if (memHit) return { ...memHit, cached: true };
  const dbHit = await getCachedGeocode(key);
  if (dbHit) {
    cache.set("geo:" + key, { value: dbHit, exp: Date.now() + TTL_MS });
    return { ...dbHit, cached: true };
  }

  // Address components: prefer the dedicated India service for 6-digit IN pincodes.
  let address = null;
  const looksIndian = /^\d{6}$/.test(pincode) && (!country || /^(india|in)$/i.test(country));
  if (looksIndian) address = await lookupIndiaPincode(pincode);

  // Coordinates: Nominatim, structured first then freeform.
  let hit = await throttled(() =>
    queryNominatim({
      postalcode: pincode,
      city: address?.city || city,
      state: address?.state || state,
      country: address?.country || country,
    }),
  );
  if (!hit) {
    const q = [pincode, city, state, country].filter(Boolean).join(", ");
    hit = await throttled(() => queryNominatim({ q }));
  }
  if (!hit) throw err("could not geocode that location", 422);

  if (!address) address = pickAddress(hit.address);
  // fill any gap from the display_name so autofill has something for every pincode
  if (!address.city || !address.state) {
    const d = deriveFromLabel(hit.label);
    address = {
      city: address.city || d.city,
      state: address.state || d.state,
      country: address.country || (d.city || d.state ? "India" : null),
    };
  }

  const value = {
    latitude: hit.latitude,
    longitude: hit.longitude,
    label: hit.label,
    address,
    source: "nominatim",
  };
  cache.set("geo:" + key, { value, exp: Date.now() + TTL_MS });
  // only persist once we have a usable place name — otherwise let it retry later
  if (address.city || address.state) putCachedGeocode(key, value).catch(() => {});
  return value;
}

// --- nearby competitors: OSM Overpass -----------------------------------

// Public Overpass instances are frequently overloaded (429/504) — try mirrors in turn.
const OVERPASS_ENDPOINTS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.osm.ch/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
];
const throttledOverpass = makeThrottle(1100);

// keyword -> Overpass element selectors (node + way each)
const NEARBY_SELECTORS = {
  coffee: [`["amenity"~"^(cafe|bakery)$"]`, `["shop"="bakery"]`, `["cuisine"~"coffee"]`],
  bakery: [`["shop"="bakery"]`, `["amenity"="cafe"]`],
  wine: [`["shop"="wine"]`, `["amenity"~"^(bar|pub)$"]`],
  bar: [`["amenity"~"^(bar|pub|biergarten)$"]`, `["shop"="wine"]`],
  restaurant: [`["amenity"~"^(restaurant|fast_food)$"]`],
  fitness: [
    `["leisure"~"^(fitness_centre|sports_centre)$"]`,
    `["amenity"="gym"]`,
    `["sport"~"pilates|yoga|fitness"]`,
  ],
  pet: [
    `["shop"~"^(pet|pet_grooming)$"]`,
    `["amenity"~"^(veterinary|animal_boarding)$"]`,
  ],
};
const CATEGORY_KEYWORD = {
  "Food & Beverage": "restaurant",
  "Health & Wellness": "fitness",
  "Consumer Services": "pet",
};

// Wider nets, used when the specific query finds nothing (sparse OSM coverage).
const BROAD_SELECTORS = {
  food: [
    `["amenity"~"^(cafe|restaurant|fast_food|bar|pub|ice_cream|food_court|biergarten)$"]`,
    `["shop"~"^(bakery|confectionery|coffee|pastry|deli|convenience)$"]`,
  ],
  fitness: [
    `["leisure"~"^(fitness_centre|sports_centre|sports_hall|dance)$"]`,
    `["amenity"="gym"]`,
    `["sport"]`,
  ],
  pet: [`["shop"~"pet"]`, `["amenity"~"^(veterinary|animal_boarding|animal_shelter)$"]`],
};
const KEYWORD_FAMILY = {
  coffee: "food",
  bakery: "food",
  wine: "food",
  bar: "food",
  restaurant: "food",
  fitness: "fitness",
  pet: "pet",
};

function keywordFor(name = "", category = "") {
  const n = String(name).toLowerCase();
  if (/coffee|caf[eé]/.test(n)) return "coffee";
  if (/bakery|patisserie|bread/.test(n)) return "bakery";
  if (/wine/.test(n)) return "wine";
  if (/\b(bar|pub|brew|tap)\b/.test(n)) return "bar";
  if (/pilates|yoga|fitness|gym|wellness|studio/.test(n)) return "fitness";
  if (/\bpet|dog|grooming|\bvet\b|daycare/.test(n)) return "pet";
  if (/poke|bowl|salad|restaurant|kitchen|eatery|diner|food/.test(n)) return "restaurant";
  return CATEGORY_KEYWORD[category] || "restaurant";
}

function tidyInfo(s) {
  const clean = String(s).replace(/^[\s,;]+/, "").trim();
  return clean.length > 44 ? clean.slice(0, 43).trimEnd() + "…" : clean;
}

function haversineMi(aLat, aLng, bLat, bLng) {
  const R = 3958.7613;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function buildOverpassQuery(lat, lng, radius, selectors) {
  const clauses = selectors
    .flatMap((sel) => [
      `node${sel}(around:${radius},${lat},${lng});`,
      `way${sel}(around:${radius},${lat},${lng});`,
    ])
    .join("");
  return `[out:json][timeout:25];(${clauses});out center 80;`;
}

async function runOverpass(query) {
  let lastStatus = 0;
  const deadline = Date.now() + 22_000; // whole call budget — fail fast, let the UI use estimates
  for (const endpoint of OVERPASS_ENDPOINTS) {
    if (Date.now() > deadline) break;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": GEO_UA },
        body: "data=" + encodeURIComponent(query),
        signal: AbortSignal.timeout(8_000),
      });
      if (res.ok) return res.json();
      lastStatus = res.status;
    } catch {
      lastStatus = lastStatus || 599;
    }
  }
  throw err(`places lookup unavailable (upstream ${lastStatus})`, 502);
}

function parsePlaces(elements, lat, lng, keyword) {
  const seen = new Set();
  return (elements || [])
    .map((el) => {
      const t = el.tags || {};
      const name = t.name || t["name:en"] || t.brand;
      const plat = el.lat ?? el.center?.lat;
      const plng = el.lon ?? el.center?.lon;
      if (!name || plat == null || plng == null) return null;
      const kind = t.amenity || t.shop || t.leisure || t.sport || keyword;
      return {
        id: `${el.type}/${el.id}`,
        name,
        kind: String(kind).replace(/_/g, " "),
        lat: plat,
        lng: plng,
        distanceMi: +haversineMi(lat, lng, plat, plng).toFixed(2),
        info: tidyInfo(
          t.cuisine
            ? String(t.cuisine).replace(/[_;]/g, (m) => (m === "_" ? " " : ", "))
            : t["addr:street"] || "",
        ),
      };
    })
    .filter(Boolean)
    .filter((c) => {
      const k = c.name.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => a.distanceMi - b.distanceMi)
    .slice(0, 15);
}

export async function nearby(params) {
  const lat = Number(params?.lat);
  const lng = Number(params?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw err("valid lat and lng are required", 400);
  }
  const radius = Math.min(5000, Math.max(200, Number(params?.radius) || 2000));
  const keyword = keywordFor(params?.name, params?.category);
  const selectors = NEARBY_SELECTORS[keyword] || NEARBY_SELECTORS.restaurant;

  const key = `nearby:v4:${lat.toFixed(3)},${lng.toFixed(3)}:${keyword}:${radius}`;
  const mem = fromCache(key);
  if (mem) return { ...mem, source: "cache" };
  const dbHit = await getCachedNearby(key);
  if (dbHit) {
    cache.set(key, { value: dbHit, exp: Date.now() + TTL_MS });
    return { ...dbHit, source: "cache" };
  }

  let competitors = parsePlaces(
    (await throttledOverpass(() => runOverpass(buildOverpassQuery(lat, lng, radius, selectors))))
      .elements,
    lat,
    lng,
    keyword,
  );
  let effRadius = radius;
  let broadened = false;

  // Sparse OSM area — widen the radius and the category net, once.
  if (competitors.length === 0) {
    effRadius = Math.min(5000, radius * 2.5);
    const broad = BROAD_SELECTORS[KEYWORD_FAMILY[keyword] || "food"];
    competitors = parsePlaces(
      (await throttledOverpass(() =>
        runOverpass(buildOverpassQuery(lat, lng, effRadius, broad)),
      )).elements,
      lat,
      lng,
      keyword,
    );
    broadened = competitors.length > 0;
  }

  const value = { competitors, count: competitors.length, radius: effRadius, keyword, broadened };
  cache.set(key, { value, exp: Date.now() + (competitors.length ? TTL_MS : 60 * 60 * 1000) });
  // Don't persist an empty result — OSM data or the area may fill in later.
  if (competitors.length) putCachedNearby(key, value).catch(() => {});
  return { ...value, source: "overpass" };
}

// --- site score: combine live signals into a location rating -------------

/**
 * Several `out count` results in a single Overpass request.
 * groups: { name: { radius, selectors } }  ->  { name: number | null }
 */
async function overpassCounts(lat, lng, groups) {
  const names = Object.keys(groups);
  const setDefs = names
    .map((n) => {
      const { radius, selectors } = groups[n];
      const clauses = selectors
        .map((s) => `node${s}(around:${radius},${lat},${lng});way${s}(around:${radius},${lat},${lng});`)
        .join("");
      return `(${clauses})->.${n};`;
    })
    .join("");
  const outs = names.map((n) => `.${n} out count;`).join("");
  const data = await throttledOverpass(() =>
    runOverpass(`[out:json][timeout:25];${setDefs}${outs}`),
  );
  const counts = (data.elements || []).filter((e) => e.type === "count");
  const out = {};
  names.forEach((n, i) => {
    const el = counts[i];
    out[n] = el?.tags ? Number(el.tags.total ?? el.tags.nodes ?? 0) : null;
  });
  return out;
}

const toInt = (v) => {
  const n = parseInt(String(v ?? "").replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Nearest tagged place (city/town/…) with a population, within 40 km — Overpass fallback. */
async function nearestPlacePopulation(lat, lng) {
  try {
    const data = await throttledOverpass(() =>
      runOverpass(
        `[out:json][timeout:25];node["place"~"^(city|town|municipality|suburb|village)$"]["population"](around:40000,${lat},${lng});out tags 60;`,
      ),
    );
    let best = null;
    for (const el of data.elements || []) {
      const pop = toInt(el.tags?.population);
      if (!pop || el.lat == null) continue;
      const d = haversineMi(lat, lng, el.lat, el.lon);
      if (!best || d < best.d) best = { d, pop, name: el.tags.name || null };
    }
    return best ? { pop: best.pop, name: best.name } : null;
  } catch {
    return null;
  }
}

/** Population + place name for a point. Nominatim reverse first, Overpass place node as fallback. */
async function placePopulation(lat, lng) {
  let name = null;
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("zoom", "10");
    url.searchParams.set("extratags", "1");
    const res = await fetch(url, {
      headers: { "User-Agent": GEO_UA, "Accept-Language": "en" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.ok) {
      const j = await res.json();
      const a = j?.address || {};
      name = a.city || a.town || a.municipality || a.county || a.state_district || j?.name || null;
      const pop = toInt(j?.extratags?.population);
      if (pop) return { pop, name };
    }
  } catch {
    /* fall through to Overpass */
  }
  const fromOsm = await nearestPlacePopulation(lat, lng);
  if (fromOsm) return { pop: fromOsm.pop, name: name || fromOsm.name };
  return name ? { pop: null, name } : null;
}

const scoreClamp = (n) => Math.round(Math.max(4, Math.min(99, n)));

export async function siteScore(params) {
  const lat = Number(params?.lat);
  const lng = Number(params?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw err("valid lat and lng are required", 400);
  }
  const demand = Math.max(0, Math.min(100, Number(params?.demand) || 0));
  const competition = Math.max(0, Math.min(100, Number(params?.competition) || 0));
  const keyword = keywordFor(params?.name, params?.category);

  const key = `site:v3:${lat.toFixed(3)},${lng.toFixed(3)}:${keyword}`;
  const mem = fromCache(key);
  if (mem) return { ...mem, source: "cache" };
  const dbHit = await getCachedNearby(key);
  if (dbHit) {
    cache.set(key, { value: dbHit, exp: Date.now() + TTL_MS });
    return { ...dbHit, source: "cache" };
  }

  let competitorCount = null;
  let transitStops = null;
  let commerce = null;
  let education = null;
  let population = null;
  let place = null;

  try {
    // one Overpass request, four counts
    const c = await overpassCounts(lat, lng, {
      comp: { radius: 2000, selectors: NEARBY_SELECTORS[keyword] || NEARBY_SELECTORS.restaurant },
      transit: {
        radius: 800,
        selectors: [
          `["highway"="bus_stop"]`,
          `["public_transport"="platform"]`,
          `["railway"~"station|halt|tram_stop"]`,
        ],
      },
      commerce: { radius: 1000, selectors: [`["office"]`, `["shop"]`] },
      education: { radius: 1500, selectors: [`["amenity"~"^(school|college|university)$"]`] },
    });
    competitorCount = c.comp;
    transitStops = c.transit;
    commerce = c.commerce;
    education = c.education;
  } catch {
    /* keep nulls — each sub-score falls back to the model figure */
  }
  try {
    const p = await throttled(() => placePopulation(lat, lng));
    if (p) {
      population = p.pop;
      place = p.name;
    }
  } catch {
    /* keep null */
  }

  // Diminishing-returns curves: each extra competitor / stop matters a bit less.
  const headroom =
    competitorCount == null
      ? scoreClamp(100 - competition)
      : scoreClamp(100 - 9 * Math.sqrt(competitorCount));
  const popScore =
    population == null
      ? demand || 55
      : scoreClamp(20 + 14 * Math.log10(Math.max(population, 1000) / 1000));
  const footfall = scoreClamp(0.6 * popScore + 0.4 * (demand || 55));
  const demandMatch = demand || Math.round((headroom + footfall) / 2);
  const accessibility =
    transitStops == null
      ? scoreClamp(58 + (demand - 55) * 0.4)
      : scoreClamp(40 + 20 * Math.log10(transitStops + 1));

  const rows = [
    { l: "Competition headroom", v: headroom },
    { l: "Footfall potential", v: footfall },
    { l: "Demand match", v: demandMatch },
    { l: "Accessibility", v: accessibility },
  ];
  // Consider it "live" only when the Overpass counts came back; a Nominatim-only
  // hit still leaves 3 of 4 sub-scores on the model, so don't lock it in.
  const gotCounts = competitorCount != null && transitStops != null;
  const value = {
    overall: Math.round(rows.reduce((s, r) => s + r.v, 0) / rows.length),
    rows,
    signals: { competitorCount, population, place, transitStops, commerce, education },
    live: gotCounts,
  };
  // Only cache a genuinely live result — otherwise the next request retries Overpass.
  if (gotCounts) {
    cache.set(key, { value, exp: Date.now() + TTL_MS });
    putCachedNearby(key, value).catch(() => {});
  }
  return { ...value, source: gotCounts ? "overpass" : "partial" };
}

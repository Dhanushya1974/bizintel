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
// v2: bumped after the district-HQ-vs-actual-town fix (Block preferred over District)
// so previously cached wrong results (keyed without a version) are bypassed instead
// of being served forever — geocode_cache has no TTL.
const geoKey = (p) =>
  "v2|" + [p.pincode, p.city, p.state, p.country].map((s) => norm(s).toLowerCase()).join("|");

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
      const offices = rec?.Status === "Success" ? rec.PostOffice ?? [] : [];
      // A pincode covers many branch/sub offices (often villages) — prefer the Head
      // Post Office entry, since its Name/Block line up with the actual town.
      const po = offices.find((o) => o.BranchType === "Head Post Office") ?? offices[0];
      if (po) {
        // District is a big administrative area, not the town — e.g. pincode 517325's
        // District is "Chittoor" even though the actual town is Madanapalle. Block
        // (the taluk/mandal, usually named after its headquarters town) is what
        // actually identifies the place a pincode belongs to; District is a last resort.
        return {
          city: po.Block || po.Name || po.District,
          district: po.District,
          state: po.State,
          country: po.Country || "India",
        };
      }
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

  // Coordinates: Nominatim, structured first then freeform. `county` (the district)
  // disambiguates towns that share a name across multiple districts in the same
  // state — without it, e.g. "Rayachoti" can match a same-named village elsewhere.
  // It's a soft preference, not a hard filter: the postal API's district names are
  // sometimes older/renamed versions of OSM's admin names (e.g. "Cuddapah" vs OSM's
  // "YSR Kadapa"), so requiring an exact county match can turn a working lookup
  // into a failed one — always fall back to the no-county attempt if it comes up empty.
  const baseParams = {
    postalcode: pincode,
    city: address?.city || city,
    state: address?.state || state,
    country: address?.country || country,
  };
  let hit = address?.district
    ? await throttled(() => queryNominatim({ ...baseParams, county: address.district }))
    : null;
  if (!hit) hit = await throttled(() => queryNominatim(baseParams));
  if (!hit) {
    const q = [pincode, city, address?.district, state, country].filter(Boolean).join(", ");
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
// Ordered by measured reliability from this deployment's network — the two that
// consistently time out (rather than fail fast) go last so a bad mirror doesn't
// eat the whole time budget before a working one gets a turn.
const OVERPASS_ENDPOINTS = [
  "https://overpass.osm.ch/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
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
  retail: [
    `["shop"~"^(clothes|shoes|department_store|mall|supermarket|convenience|electronics|furniture|jewelry|gift|variety_store)$"]`,
  ],
  tech: [
    `["shop"~"^(computer|electronics|mobile_phone)$"]`,
    `["office"~"^(it|telecommunication|coworking)$"]`,
  ],
  education: [
    `["amenity"~"^(school|college|university|language_school|driving_school)$"]`,
    `["shop"="books"]`,
  ],
  hospitality: [
    `["tourism"~"^(hotel|guest_house|hostel|motel)$"]`,
    `["amenity"="hotel"]`,
  ],
  // No specific business-type signal — count general commercial activity nearby
  // instead of guessing a category (previously silently defaulted to "restaurant").
  generic: [`["shop"]`, `["office"]`],
};
const CATEGORY_KEYWORD = {
  "Food & Beverage": "restaurant",
  "Health & Wellness": "fitness",
  "Consumer Services": "pet",
  Retail: "retail",
  Technology: "tech",
  Education: "education",
  Hospitality: "hospitality",
  Other: "generic",
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
  retail: [`["shop"]`],
  tech: [`["shop"~"^(computer|electronics|mobile_phone|hardware)$"]`, `["office"]`],
  education: [`["amenity"~"^(school|college|university|kindergarten|language_school)$"]`],
  hospitality: [`["tourism"]`, `["amenity"~"^(hotel|restaurant)$"]`],
  generic: [`["shop"]`, `["office"]`, `["amenity"~"^(restaurant|cafe)$"]`],
};
const KEYWORD_FAMILY = {
  coffee: "food",
  bakery: "food",
  wine: "food",
  bar: "food",
  restaurant: "food",
  fitness: "fitness",
  pet: "pet",
  retail: "retail",
  tech: "tech",
  education: "education",
  hospitality: "hospitality",
  generic: "generic",
};

function keywordFor(name = "", category = "") {
  const n = String(name).toLowerCase();
  if (/coffee|caf[eé]/.test(n)) return "coffee";
  if (/bakery|patisserie|bread/.test(n)) return "bakery";
  if (/wine/.test(n)) return "wine";
  if (/\b(bar|pub|brew|tap)\b/.test(n)) return "bar";
  if (/pilates|yoga|fitness|gym|wellness|studio/.test(n)) return "fitness";
  if (/\bpet|dog|grooming|\bvet\b|daycare/.test(n)) return "pet";
  if (/poke|bowl|salad|restaurant|kitchen|eatery|diner|\bfood\b/.test(n)) return "restaurant";
  if (/\b(hotel|resort|lodge|homestay|hostel|stay)\b/.test(n)) return "hospitality";
  if (/\b(school|academy|tutor|coaching|institute|classes|training)\b/.test(n)) return "education";
  if (/\b(software|\bit\b|computer|electronics|repair|mobile|gadget)\b/.test(n)) return "tech";
  if (/\b(shop|store|boutique|retail|mart|showroom)\b/.test(n)) return "retail";
  return CATEGORY_KEYWORD[category] || "generic";
}

// --- Geoapify Places: preferred over the free Overpass mirrors when configured,
// since it's authenticated and reliable instead of best-effort community infra.
// Built on the same OSM dataset, so we normalize its output into the exact same
// { type, id, lat, lon, tags } shape parsePlaces() already knows how to read.
const GEOAPIFY_CATEGORIES = {
  food: "catering,commercial.food_and_drink",
  fitness: "sport,leisure.fitness_centre",
  pet: "pet,service.veterinary",
  retail: "commercial",
  tech: "commercial.electronics,office.it,office.coworking",
  education: "education",
  hospitality: "accommodation",
  generic: "commercial,office,catering",
};

async function geoapifyNearby(lat, lng, radius, keyword) {
  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey) return null;
  const categories = GEOAPIFY_CATEGORIES[KEYWORD_FAMILY[keyword] || "food"];
  const url = new URL("https://api.geoapify.com/v2/places");
  url.searchParams.set("categories", categories);
  url.searchParams.set("filter", `circle:${lng},${lat},${radius}`);
  url.searchParams.set("bias", `proximity:${lng},${lat}`);
  url.searchParams.set("limit", "40");
  url.searchParams.set("apiKey", apiKey);
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) {
    console.warn(`[geoapify] HTTP ${res.status}`);
    throw err(`geoapify returned ${res.status}`, 502);
  }
  const data = await res.json();
  return (data.features || []).map((f, i) => {
    const p = f.properties || {};
    const raw = p.datasource?.raw || {};
    return {
      type: "node",
      id: p.place_id || p.osm_id || `geoapify-${i}`,
      lat: f.geometry?.coordinates?.[1],
      lon: f.geometry?.coordinates?.[0],
      tags: { name: p.name, ...raw },
    };
  });
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

async function runOverpass(query, budgetMs = 22_000) {
  let lastStatus = 0;
  const deadline = Date.now() + budgetMs; // whole call budget — fail fast, let the UI use estimates
  // Cycle through the mirror list (not just one pass) until the budget runs out — these
  // free public mirrors rate-limit in bursts, and a mirror that's 429ing now is often
  // fine a few seconds later, so a second lap can succeed where a single pass wouldn't.
  for (let i = 0; Date.now() < deadline; i++) {
    const endpoint = OVERPASS_ENDPOINTS[i % OVERPASS_ENDPOINTS.length];
    const remaining = deadline - Date.now();
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": GEO_UA },
        body: "data=" + encodeURIComponent(query),
        signal: AbortSignal.timeout(Math.min(6_000, remaining)),
      });
      if (res.ok) return res.json();
      lastStatus = res.status;
      console.warn(`[overpass] ${endpoint} -> HTTP ${res.status}`);
    } catch (e) {
      lastStatus = lastStatus || 599;
      console.warn(`[overpass] ${endpoint} -> ${e.name}: ${e.message}`);
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

  // v5: bumped so results cached before GEOAPIFY_API_KEY was configured (Overpass-only,
  // pre-fix) aren't served for up to 7 more days — force a fresh, Geoapify-backed lookup.
  const key = `nearby:v5:${lat.toFixed(3)},${lng.toFixed(3)}:${keyword}:${radius}`;
  const mem = fromCache(key);
  if (mem) return { ...mem, source: "cache" };
  const dbHit = await getCachedNearby(key);
  if (dbHit) {
    cache.set(key, { value: dbHit, exp: Date.now() + TTL_MS });
    return { ...dbHit, source: "cache" };
  }

  let competitors = [];
  let effRadius = radius;
  let broadened = false;
  let source = "overpass";

  // Authenticated Geoapify first when a key is configured — reliable, no shared
  // free-mirror rate limits. Only fall back to Overpass if it's unset or fails.
  try {
    const geoEls = await geoapifyNearby(lat, lng, radius, keyword);
    if (geoEls) {
      competitors = parsePlaces(geoEls, lat, lng, keyword);
      source = "geoapify";
    }
  } catch (e) {
    console.warn(`[geoapify] falling back to Overpass: ${e.message}`);
  }

  if (competitors.length === 0 && source !== "geoapify") {
    competitors = parsePlaces(
      (
        await throttledOverpass(() =>
          runOverpass(buildOverpassQuery(lat, lng, radius, selectors), 26_000),
        )
      ).elements,
      lat,
      lng,
      keyword,
    );

    // Sparse OSM area — widen the radius and the category net, once. Shorter budget:
    // this is a bonus best-effort retry, not worth doubling the client's whole wait.
    if (competitors.length === 0) {
      effRadius = Math.min(5000, radius * 2.5);
      const broad = BROAD_SELECTORS[KEYWORD_FAMILY[keyword] || "food"];
      competitors = parsePlaces(
        (
          await throttledOverpass(() =>
            runOverpass(buildOverpassQuery(lat, lng, effRadius, broad), 10_000),
          )
        ).elements,
        lat,
        lng,
        keyword,
      );
      broadened = competitors.length > 0;
    }
  }

  const value = { competitors, count: competitors.length, radius: effRadius, keyword, broadened };
  cache.set(key, { value, exp: Date.now() + (competitors.length ? TTL_MS : 60 * 60 * 1000) });
  // Don't persist an empty result — the source area may fill in later.
  if (competitors.length) putCachedNearby(key, value).catch(() => {});
  return { ...value, source };
}

// --- site score: combine live signals into a location rating -------------

/**
 * Several `out count` results in a single Overpass request.
 * groups: { name: { radius, selectors } }  ->  { name: number | null }
 */
async function overpassCounts(lat, lng, groups, budgetMs = 22_000) {
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
    runOverpass(`[out:json][timeout:25];${setDefs}${outs}`, budgetMs),
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
        10_000,
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

  // v4: same reason as the nearby cache bump above.
  const key = `site:v4:${lat.toFixed(3)},${lng.toFixed(3)}:${keyword}`;
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

  // Run the Overpass counts, the population lookup, and (when configured) an
  // authenticated Geoapify competitor count concurrently — different upstreams,
  // so this roughly halves wall-clock time instead of paying every budget in turn.
  const [countsResult, popResult, geoCompResult] = await Promise.allSettled([
    overpassCounts(
      lat,
      lng,
      {
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
      },
      12_000,
    ),
    throttled(() => placePopulation(lat, lng)),
    geoapifyNearby(lat, lng, 2000, keyword),
  ]);
  if (countsResult.status === "fulfilled") {
    competitorCount = countsResult.value.comp;
    transitStops = countsResult.value.transit;
    commerce = countsResult.value.commerce;
    education = countsResult.value.education;
  }
  if (popResult.status === "fulfilled" && popResult.value) {
    population = popResult.value.pop;
    place = popResult.value.name;
  }
  // Geoapify (authenticated, reliable) beats the free Overpass count when available.
  if (geoCompResult.status === "fulfilled" && geoCompResult.value) {
    competitorCount = geoCompResult.value.length;
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
  // Consider it "live" when we have a real competitor count (Geoapify or Overpass)
  // plus at least one other live signal — a Nominatim-only hit isn't enough to
  // call the whole score live.
  const gotCounts =
    competitorCount != null && (transitStops != null || geoCompResult.status === "fulfilled");
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

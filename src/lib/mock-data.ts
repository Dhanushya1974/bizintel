export type Opportunity = {
  id: string;
  name: string;
  category: string;
  score: number; // 0-100
  confidence: "High" | "Medium" | "Low";
  demand: number;
  competition: number;
  investmentMin: number;
  investmentMax: number;
  breakEvenMonths: number;
  rationale: string;
  risks: string[];
  tags: string[];
};

export type Competitor = {
  id: string;
  name: string;
  category: string;
  distanceMi: number;
  rating: number;
  reviews: number;
  priceLevel: 1 | 2 | 3 | 4;
  lat: number;
  lng: number;
};

export type SavedProject = {
  id: string;
  title: string;
  location: string;
  businessType: string;
  updatedAt: string;
  score: number;
  status: "Draft" | "Analyzing" | "Complete";
};

export type Report = {
  id: string;
  title: string;
  location: string;
  createdAt: string;
  format: "PDF" | "CSV" | "XLSX";
  sizeKb: number;
};

export type Notification = {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  kind: "insight" | "system" | "billing" | "collab";
};

export type ChatThread = {
  id: string;
  title: string;
  updatedAt: number;
  messages: { id: string; role: "user" | "assistant"; content: string; ts: number }[];
};

export const OPPORTUNITIES: Opportunity[] = [
  {
    id: "opp-1",
    name: "Specialty Coffee & Bakery",
    category: "Food & Beverage",
    score: 87,
    confidence: "High",
    demand: 82,
    competition: 34,
    investmentMin: 120000,
    investmentMax: 210000,
    breakEvenMonths: 14,
    rationale:
      "Dense residential foot traffic, above-median household income, and only two comparable operators within a 6-minute walk.",
    risks: ["Rising lease rates", "Barista labor supply"],
    tags: ["High demand", "Under-served"],
  },
  {
    id: "opp-2",
    name: "Boutique Pilates Studio",
    category: "Health & Wellness",
    score: 81,
    confidence: "High",
    demand: 74,
    competition: 41,
    investmentMin: 180000,
    investmentMax: 260000,
    breakEvenMonths: 18,
    rationale:
      "Strong 25–44 female demographic, wellness search intent up 38% YoY, no premium boutique studio within 1.5 miles.",
    risks: ["Instructor retention", "Membership churn"],
    tags: ["Premium fit", "Rising demand"],
  },
  {
    id: "opp-3",
    name: "Neighborhood Wine Bar",
    category: "Food & Beverage",
    score: 74,
    confidence: "Medium",
    demand: 66,
    competition: 52,
    investmentMin: 220000,
    investmentMax: 340000,
    breakEvenMonths: 22,
    rationale:
      "Evening foot traffic strong, but three established wine bars nearby. Differentiation on food and events required.",
    risks: ["Licensing timeline", "Competitor saturation"],
    tags: ["Evening economy"],
  },
  {
    id: "opp-4",
    name: "Pet Daycare & Grooming",
    category: "Consumer Services",
    score: 69,
    confidence: "Medium",
    demand: 71,
    competition: 58,
    investmentMin: 95000,
    investmentMax: 165000,
    breakEvenMonths: 20,
    rationale:
      "High pet-ownership index, limited grooming supply, but requires 3,500+ sq ft with outdoor access.",
    risks: ["Zoning limits", "Real estate scarcity"],
    tags: ["Underserved"],
  },
  {
    id: "opp-5",
    name: "Fast-Casual Poke Bowls",
    category: "Food & Beverage",
    score: 58,
    confidence: "Low",
    demand: 54,
    competition: 71,
    investmentMin: 140000,
    investmentMax: 220000,
    breakEvenMonths: 26,
    rationale:
      "Category is crowded within a 1-mile radius. Consider adjacent white-space or brand differentiation.",
    risks: ["Category fatigue", "Delivery margin pressure"],
    tags: ["Saturated"],
  },
];

export const COMPETITORS: Competitor[] = [
  { id: "c1", name: "Fremont Coffee Company", category: "Coffee", distanceMi: 0.2, rating: 4.6, reviews: 812, priceLevel: 2, lat: 47.6512, lng: -122.3499 },
  { id: "c2", name: "Milstead & Co", category: "Coffee", distanceMi: 0.4, rating: 4.7, reviews: 1204, priceLevel: 2, lat: 47.6488, lng: -122.3542 },
  { id: "c3", name: "Sea Wolf Bakery", category: "Bakery", distanceMi: 0.3, rating: 4.6, reviews: 987, priceLevel: 2, lat: 47.6521, lng: -122.3480 },
  { id: "c4", name: "Caffe Ladro", category: "Coffee", distanceMi: 0.7, rating: 4.4, reviews: 623, priceLevel: 2, lat: 47.6470, lng: -122.3520 },
  { id: "c5", name: "Anchorhead Coffee", category: "Coffee", distanceMi: 1.1, rating: 4.5, reviews: 445, priceLevel: 2, lat: 47.6543, lng: -122.3455 },
];

export const DEMAND_TIMESERIES = [
  { month: "Jan", demand: 62, competition: 40 },
  { month: "Feb", demand: 65, competition: 41 },
  { month: "Mar", demand: 71, competition: 43 },
  { month: "Apr", demand: 76, competition: 44 },
  { month: "May", demand: 78, competition: 45 },
  { month: "Jun", demand: 82, competition: 47 },
  { month: "Jul", demand: 84, competition: 48 },
  { month: "Aug", demand: 83, competition: 48 },
  { month: "Sep", demand: 80, competition: 49 },
  { month: "Oct", demand: 79, competition: 50 },
  { month: "Nov", demand: 82, competition: 51 },
  { month: "Dec", demand: 86, competition: 52 },
];

export const REVENUE_FORECAST = [
  { month: "M1", revenue: 12000, cost: 22000 },
  { month: "M3", revenue: 28000, cost: 26000 },
  { month: "M6", revenue: 46000, cost: 32000 },
  { month: "M9", revenue: 58000, cost: 36000 },
  { month: "M12", revenue: 72000, cost: 40000 },
  { month: "M18", revenue: 96000, cost: 46000 },
  { month: "M24", revenue: 118000, cost: 52000 },
];

export const DEMOGRAPHICS = [
  { label: "Median age", value: "34" },
  { label: "Median HH income", value: "$104k" },
  { label: "Population (1mi)", value: "18,420" },
  { label: "Daytime workers", value: "6,240" },
  { label: "Renter households", value: "58%" },
  { label: "College degree+", value: "71%" },
];

export const SAVED_PROJECTS: SavedProject[] = [
  { id: "p1", title: "Ballard coffee concept", location: "Ballard, Seattle, WA", businessType: "Coffee shop", updatedAt: "2026-07-14", score: 87, status: "Complete" },
  { id: "p2", title: "Fremont wellness studio", location: "Fremont, Seattle, WA", businessType: "Pilates studio", updatedAt: "2026-07-10", score: 81, status: "Complete" },
  { id: "p3", title: "Capitol Hill wine bar", location: "Capitol Hill, Seattle, WA", businessType: "Wine bar", updatedAt: "2026-07-05", score: 74, status: "Complete" },
  { id: "p4", title: "Green Lake pet daycare", location: "Green Lake, Seattle, WA", businessType: "Pet services", updatedAt: "2026-06-28", score: 69, status: "Draft" },
];

export const REPORTS: Report[] = [
  { id: "r1", title: "Ballard opportunity report", location: "Ballard, Seattle, WA", createdAt: "2026-07-14", format: "PDF", sizeKb: 1840 },
  { id: "r2", title: "Fremont wellness deep-dive", location: "Fremont, Seattle, WA", createdAt: "2026-07-10", format: "PDF", sizeKb: 2210 },
  { id: "r3", title: "Competitor export — coffee", location: "Ballard, Seattle, WA", createdAt: "2026-07-08", format: "CSV", sizeKb: 68 },
];

export const NOTIFICATIONS: Notification[] = [
  { id: "n1", title: "Analysis complete", body: "Your Ballard coffee analysis is ready to review.", time: "2h ago", read: false, kind: "insight" },
  { id: "n2", title: "New competitor detected", body: "A new bakery opened within 0.3 mi of your saved Fremont site.", time: "1d ago", read: false, kind: "insight" },
  { id: "n3", title: "Report exported", body: "Your PDF report for Capitol Hill was generated.", time: "3d ago", read: true, kind: "system" },
  { id: "n4", title: "Invoice paid", body: "Growth plan renewed for August.", time: "1w ago", read: true, kind: "billing" },
];

export type PlanId = "explorer" | "starter" | "pro" | "business" | "enterprise";

export type PlanFeature = { label: string; included: boolean };

export type Plan = {
  id: PlanId;
  name: string;
  tagline: string;
  priceMonthly: string;
  priceYearly: string;
  highlight?: boolean;
  cta: string;
  features: string[];
};

export const PLANS: Plan[] = [
  {
    id: "explorer",
    name: "Explorer",
    tagline: "Discover the platform, free forever.",
    priceMonthly: "₹0",
    priceYearly: "₹0",
    cta: "Current plan",
    features: [
      "5 AI chats / day",
      "2 Business analyses / month",
      "2 Competitor analyses / month",
      "Demo market reports",
      "Demo location intelligence",
      "Save up to 3 projects",
      "Watermarked PDF export",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    tagline: "For solo founders validating an idea.",
    priceMonthly: "₹299",
    priceYearly: "₹2,999",
    cta: "Upgrade to Starter",
    features: [
      "200 AI chats / month",
      "25 Business analyses",
      "Live market data",
      "Competitor analysis",
      "Full PDF reports",
      "AI recommendations",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Serious operators scaling to launch.",
    priceMonthly: "₹699",
    priceYearly: "₹6,999",
    highlight: true,
    cta: "Upgrade to Pro",
    features: [
      "Unlimited AI (fair usage)",
      "Unlimited business analyses",
      "Advanced location intelligence",
      "AI business plans",
      "ROI prediction",
      "SWOT analysis",
      "Unlimited projects",
      "Priority support",
    ],
  },
  {
    id: "business",
    name: "Business",
    tagline: "Teams collaborating on multiple ventures.",
    priceMonthly: "₹1,999",
    priceYearly: "₹19,999",
    cta: "Upgrade to Business",
    features: [
      "Team collaboration",
      "Shared dashboard",
      "Role management",
      "Advanced analytics",
      "Collaboration requests",
      "Business network",
      "API access",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Custom deployments for large organizations.",
    priceMonthly: "Custom",
    priceYearly: "Custom",
    cta: "Contact sales",
    features: [
      "Custom AI models",
      "Dedicated success manager",
      "SLA & SSO",
      "Custom integrations",
      "Onboarding & training",
    ],
  },
];

export type PlanLimits = {
  aiChatsPerDay: number | "unlimited";
  businessAnalysesPerMonth: number | "unlimited";
  competitorAnalysesPerMonth: number | "unlimited";
  savedProjects: number | "unlimited";
  liveMarketData: boolean;
  fullPdfExport: boolean;
  advancedLocation: boolean;
  teamCollab: boolean;
};

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  explorer: {
    aiChatsPerDay: 5,
    businessAnalysesPerMonth: 2,
    competitorAnalysesPerMonth: 2,
    savedProjects: 3,
    liveMarketData: false,
    fullPdfExport: false,
    advancedLocation: false,
    teamCollab: false,
  },
  starter: {
    aiChatsPerDay: 200,
    businessAnalysesPerMonth: 25,
    competitorAnalysesPerMonth: 25,
    savedProjects: 50,
    liveMarketData: true,
    fullPdfExport: true,
    advancedLocation: false,
    teamCollab: false,
  },
  pro: {
    aiChatsPerDay: "unlimited",
    businessAnalysesPerMonth: "unlimited",
    competitorAnalysesPerMonth: "unlimited",
    savedProjects: "unlimited",
    liveMarketData: true,
    fullPdfExport: true,
    advancedLocation: true,
    teamCollab: false,
  },
  business: {
    aiChatsPerDay: "unlimited",
    businessAnalysesPerMonth: "unlimited",
    competitorAnalysesPerMonth: "unlimited",
    savedProjects: "unlimited",
    liveMarketData: true,
    fullPdfExport: true,
    advancedLocation: true,
    teamCollab: true,
  },
  enterprise: {
    aiChatsPerDay: "unlimited",
    businessAnalysesPerMonth: "unlimited",
    competitorAnalysesPerMonth: "unlimited",
    savedProjects: "unlimited",
    liveMarketData: true,
    fullPdfExport: true,
    advancedLocation: true,
    teamCollab: true,
  },
};

export const CURRENT_USAGE = {
  aiChatsToday: 3,
  businessAnalysesThisMonth: 1,
  competitorAnalysesThisMonth: 2,
  savedProjects: 2,
};

export type Collaboration = {
  id: string;
  business: string;
  category: string;
  location: string;
  compatibility: number;
  reason: string;
  benefit: string;
  logoInitials: string;
};

export const COLLABORATIONS: Collaboration[] = [
  {
    id: "col-1",
    business: "Sunrise Bakery",
    category: "Bakery",
    location: "Ballard, Seattle",
    compatibility: 94,
    reason: "Complementary morning traffic and shared target demographic (25–44 professionals).",
    benefit: "+18% projected AM ticket size via co-branded pastry + coffee bundles.",
    logoInitials: "SB",
  },
  {
    id: "col-2",
    business: "PNW Roasters Co.",
    category: "Coffee supplier",
    location: "Georgetown, Seattle",
    compatibility: 91,
    reason: "Local roaster with wholesale program aligned to specialty positioning.",
    benefit: "12–15% cost reduction vs. national suppliers; freshness guarantee.",
    logoInitials: "PR",
  },
  {
    id: "col-3",
    business: "Evergreen Events",
    category: "Event organizer",
    location: "Seattle metro",
    compatibility: 86,
    reason: "Books 40+ community events monthly, needs specialty caterers.",
    benefit: "Steady off-peak revenue stream, +₹65k/mo estimated.",
    logoInitials: "EE",
  },
  {
    id: "col-4",
    business: "NorthLake Offices",
    category: "Office catering",
    location: "South Lake Union",
    compatibility: 82,
    reason: "22 tech offices within 2 mi seeking daily coffee & pastry service.",
    benefit: "Recurring B2B contracts, predictable weekday cash flow.",
    logoInitials: "NL",
  },
  {
    id: "col-5",
    business: "Studio Nordic",
    category: "Interior designer",
    location: "Capitol Hill, Seattle",
    compatibility: 78,
    reason: "Specializes in hospitality build-outs on Starter-friendly budgets.",
    benefit: "Turn-key design + branded interior in 6–8 weeks.",
    logoInitials: "SN",
  },
  {
    id: "col-6",
    business: "GreenLeaf Farms",
    category: "Ingredient supplier",
    location: "Snoqualmie Valley",
    compatibility: 74,
    reason: "Organic sourcing appeals to premium coffee & bakery brand story.",
    benefit: "Marketing lift: farm-to-cup narrative, +8% price tolerance.",
    logoInitials: "GL",
  },
];

export type CollabRequest = {
  id: string;
  from: string;
  business: string;
  message: string;
  time: string;
  status: "pending" | "accepted" | "declined";
};

export const COLLAB_REQUESTS: CollabRequest[] = [
  { id: "cr1", from: "Sunrise Bakery", business: "Bakery partnership", message: "Loved your Ballard concept — want to explore a morning bundle pilot?", time: "3h ago", status: "pending" },
  { id: "cr2", from: "NorthLake Offices", business: "Office catering contract", message: "We have 4 offices needing daily service starting September.", time: "2d ago", status: "pending" },
  { id: "cr3", from: "PNW Roasters Co.", business: "Wholesale supply", message: "Sample kit sent — let's schedule a tasting call.", time: "5d ago", status: "accepted" },
];
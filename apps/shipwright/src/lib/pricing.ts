// The one source of truth for Shipwright plans. The pricing page, the dashboard and (Day 21) Stripe all read this.
// The mobile app never sells anything (store rules): it only links to the web.
// Until launch every button goes to the sample report. There is no checkout yet.
// These prices are a v1 hypothesis (Day 13). The interviews may change them.

export type Price = {
  amount: number;
  currency: "USD";
  // "quote" means the final price is agreed per project, and `amount` is the starting price ("from $499").
  interval: "once" | "month" | "quote";
};

export type Plan = {
  id: "free" | "fix_pack" | "guardian" | "expert";
  name: string;
  price: Price;
  tagline: string;
  features: readonly string[];
  cta: { label: string; href: string };
  highlight?: boolean;
};

const SAMPLE_REPORT = { label: "See a sample report", href: "/demo" } as const;

// The first three ids match the `plan` column in the database.
export const PLANS = [
  {
    id: "free",
    name: "Free scan",
    price: { amount: 0, currency: "USD", interval: "once" },
    tagline: "Find out if your app is safe to launch.",
    features: [
      "1 app",
      "Production score",
      "All finding titles",
      "Full detail and proof for the top 3",
    ],
    cta: SAMPLE_REPORT,
  },
  {
    id: "fix_pack",
    name: "Fix Pack",
    price: { amount: 149, currency: "USD", interval: "once" },
    tagline: "We fix what we found, with pull requests you can review.",
    features: [
      "Full report with proof",
      "Up to 10 fix pull requests",
      "A re-scan within 30 days",
      "One-time price, per app",
    ],
    cta: SAMPLE_REPORT,
    // Day 21: stripePriceId
  },
  {
    id: "guardian",
    name: "Guardian",
    // Annual plan: 2 months free. It is a second Stripe price on Day 21, so it is not a field here yet.
    price: { amount: 39, currency: "USD", interval: "month" },
    tagline: "Every push is checked, so problems don't come back.",
    features: [
      "Audit on every push",
      "Weekly re-scan",
      "Alerts",
      "Fix pull requests (fair use)",
      "3 seats",
      "Per app. Annual: 2 months free",
    ],
    cta: SAMPLE_REPORT,
    highlight: true,
    // Day 21: stripePriceId
  },
  {
    id: "expert",
    name: "Expert",
    price: { amount: 499, currency: "USD", interval: "quote" },
    tagline: "A senior developer fixes the hard problems.",
    features: ["A senior developer fixes the complex issue", "Quoted per project, from $499"],
    cta: SAMPLE_REPORT,
  },
] as const satisfies readonly Plan[];

export type PlanId = (typeof PLANS)[number]["id"];

const money = (amount: number) => `$${amount.toLocaleString("en-US")}`;

// The price as the page shows it, split in two so the amount can be big and the unit small.
export function formatPrice(price: Price): { amount: string; unit: string } {
  if (price.interval === "month") return { amount: money(price.amount), unit: "per month" };
  if (price.interval === "quote") return { amount: `From ${money(price.amount)}`, unit: "quoted per project" };
  return price.amount === 0 ? { amount: money(0), unit: "to start" } : { amount: money(price.amount), unit: "one-time" };
}

const [, FIX_PACK, GUARDIAN, EXPERT] = PLANS;

// The /pricing meta description. Built from PLANS, so it can never disagree with the cards.
export const PRICING_DESCRIPTION = `Start with a free scan. A ${FIX_PACK.name} is ${money(FIX_PACK.price.amount)} once, ${GUARDIAN.name} is ${money(GUARDIAN.price.amount)} a month, and expert help starts at ${money(EXPERT.price.amount)}.`;

// What a founder uses today, by category (no brand names). `us` marks the Shipwright cell.
// The audit price range comes from docs/product/validation.md (competitor map).
export const COMPARE = [
  { who: "Free scanners", result: "A report", us: false },
  { who: "Manual audit", result: `${money(199)}–${money(1499)}, no fixes`, us: false },
  { who: "Shipwright", result: "Proof + fix PRs + watches every push", us: true },
] as const;

// One table cell: true = included, false = not included, text = a short detail.
// The Expert column says "Quoted" because its scope is agreed per project, not fixed.
export type FeatureCell = boolean | string;

export type FeatureRow = { label: string; plans: Record<PlanId, FeatureCell> };

export const FEATURE_MATRIX = [
  { label: "Apps covered", plans: { free: "1 app", fix_pack: "Per app", guardian: "Per app", expert: "Per project" } },
  { label: "Production score", plans: { free: true, fix_pack: true, guardian: true, expert: "Quoted" } },
  { label: "All finding titles", plans: { free: true, fix_pack: true, guardian: true, expert: "Quoted" } },
  { label: "Full detail and proof", plans: { free: "Top 3", fix_pack: true, guardian: true, expert: "Quoted" } },
  { label: "Fix pull requests", plans: { free: false, fix_pack: "Up to 10", guardian: "Fair use", expert: "Quoted" } },
  { label: "Re-scan", plans: { free: false, fix_pack: "Within 30 days", guardian: "Weekly", expert: "Quoted" } },
  { label: "Audit on every push", plans: { free: false, fix_pack: false, guardian: true, expert: "Quoted" } },
  { label: "Alerts", plans: { free: false, fix_pack: false, guardian: true, expert: "Quoted" } },
  { label: "Senior developer", plans: { free: false, fix_pack: false, guardian: false, expert: true } },
] as const satisfies readonly FeatureRow[];

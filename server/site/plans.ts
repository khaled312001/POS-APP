/**
 * The plan ladder — one definition.
 *
 * Three ladders used to disagree: 49/99/199 on this site, 199/499/1999/4999
 * inside /api/landing/subscribe, and two invented tier names in the licence
 * email. `subscription_plans` is the authority: paymentService prices a
 * checkout from the row's `price` column and never trusts the caller, so the
 * amount a visitor is charged always comes from the database.
 *
 * The numbers below exist for two jobs and no others:
 *   1. seeding a `subscription_plans` row when the catalogue is missing one,
 *   2. rendering a sensible price into the pre-rendered HTML before the
 *      catalogue request comes back (these pages are CDN-cached, so they
 *      cannot be built against the live table).
 * Once a row exists, its price wins on the page and in the charge.
 *
 * Kept free of any database or Stripe import: `server/site/index.ts` is
 * bundled by scripts/post-export.js to pre-render the site, and pulling
 * ./db into that bundle would open a MySQL pool at build time.
 */

export type BillingCycle = "monthly" | "yearly";

export interface SitePlan {
  /** Stable id used by the pricing page and the catalogue endpoint. */
  slug: string;
  /** Matches subscription_plans.name; Stripe shows the line item as "Kassenta <name>". */
  name: string;
  /** CHF per location per month, excluding VAT. */
  monthly: number;
  /** English one-liner, stored as the row's description. */
  summary: string;
  /** English feature list, stored as the row's features JSON. */
  features: string[];
}

export const CURRENCY = "CHF";

/** Yearly billing is charged once for twelve months at a fifth off. */
export const YEARLY_DISCOUNT = 0.2;

export const STARTER: SitePlan = {
  slug: "starter",
  name: "Starter",
  monthly: 49,
  summary: "One counter, one screen. For a single cafe, kiosk or small shop.",
  features: [
    "POS on one device, unlimited products and staff PINs",
    "Swiss VAT, cash rounding and TWINT",
    "Sales and inventory reports with CSV export",
    "Email support, next business day",
  ],
};

export const PROFESSIONAL: SitePlan = {
  slug: "professional",
  name: "Professional",
  monthly: 99,
  summary: "Counter plus your own online channel, delivery and loyalty.",
  features: [
    "Everything in Starter, on up to five devices",
    "Branded online storefront and table QR ordering",
    "Delivery zones, drivers and customer tracking links",
    "Loyalty tiers, wallet, promo codes and referrals",
    "WhatsApp and email order notifications",
    "Phone and chat support during business hours",
  ],
};

export const ENTERPRISE: SitePlan = {
  slug: "enterprise",
  name: "Enterprise",
  monthly: 199,
  summary: "Several branches under one roof, with the API and consolidated reporting.",
  features: [
    "Everything in Professional, unlimited devices",
    "Multi-branch console with consolidated reporting",
    "REST API, webhooks and accounting export",
    "Caller ID integration and custom vertical modules",
    "Named contact, priority response and on-site onboarding",
  ],
};

export const PLANS: SitePlan[] = [STARTER, PROFESSIONAL, ENTERPRISE];

/** The per-month figure quoted under yearly billing — what the toggle shows. */
export function yearlyMonthly(plan: SitePlan): number {
  return Math.round(plan.monthly * (1 - YEARLY_DISCOUNT));
}

/** What a yearly plan is actually charged, once, for twelve months. */
export function yearlyTotal(plan: SitePlan): number {
  return yearlyMonthly(plan) * 12;
}

/** One `subscription_plans` row per plan and billing period. */
export interface PlanRow {
  slug: string;
  name: string;
  interval: BillingCycle;
  /** Charged once per period, in CHF. */
  price: number;
  description: string;
  features: string[];
}

export const PLAN_ROWS: PlanRow[] = PLANS.flatMap((plan) => [
  {
    slug: plan.slug,
    name: plan.name,
    interval: "monthly" as BillingCycle,
    price: plan.monthly,
    description: plan.summary,
    features: plan.features,
  },
  {
    slug: plan.slug,
    name: plan.name,
    interval: "yearly" as BillingCycle,
    price: yearlyTotal(plan),
    description: `${plan.summary} Billed once for twelve months.`,
    features: plan.features,
  },
]);

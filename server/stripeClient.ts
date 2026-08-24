/**
 * Stripe credentials and client.
 *
 * History: this file used to read its keys exclusively from the Replit
 * connector API. Production runs on Hostinger under Passenger, where
 * REPL_IDENTITY / WEB_REPL_RENEWAL are never set, so every caller got
 * "X-Replit-Token not found for repl/depl" and every card payment 500'd.
 *
 * Resolution order is now:
 *   1. STRIPE_SECRET_KEY / STRIPE_PUBLISHABLE_KEY from the environment.
 *   2. The Replit connector, so Replit dev keeps working untouched.
 *   3. Nothing - callers get null and are expected to degrade, not throw.
 *
 * Nothing here ever puts the secret key on the wire to a client. The only
 * value safe to hand a browser is the publishable key; use
 * getStripePublishableKey() for that and never getStripeSecretKey().
 */
import Stripe from "stripe";

export type StripeMode = "live" | "test";

export interface StripeCredentials {
  secretKey: string;
  publishableKey: string | null;
  mode: StripeMode;
  source: "env" | "replit";
}

/** Cached across calls; Stripe clients are designed to be long-lived. */
let cached: { creds: StripeCredentials; client: Stripe } | null = null;
let replitCache: { publishableKey: string; secretKey: string } | null = null;

function clean(v: string | undefined | null): string | null {
  if (!v) return null;
  // Copy/paste from the dashboard drags in quotes and stray whitespace.
  const t = v.trim().replace(/^["']|["']$/g, "");
  return t.length ? t : null;
}

function modeOf(secretKey: string): StripeMode {
  return secretKey.startsWith("sk_live_") || secretKey.startsWith("rk_live_")
    ? "live"
    : "test";
}

function envCredentials(): StripeCredentials | null {
  const secretKey = clean(process.env.STRIPE_SECRET_KEY);
  if (!secretKey) return null;
  if (!/^(sk|rk)_(live|test)_/.test(secretKey)) {
    console.warn(
      "[stripe] STRIPE_SECRET_KEY is set but does not look like a Stripe secret key " +
        "(expected sk_live_ / sk_test_ / rk_live_ / rk_test_). Ignoring it.",
    );
    return null;
  }

  const publishableKey = clean(process.env.STRIPE_PUBLISHABLE_KEY);
  const mode = modeOf(secretKey);

  // A live secret paired with a test publishable key produces PaymentIntents
  // the browser cannot confirm, and the failure surfaces as an opaque
  // "No such payment_intent". Cheap to catch here.
  if (publishableKey) {
    const pubMode: StripeMode = publishableKey.startsWith("pk_live_") ? "live" : "test";
    if (pubMode !== mode) {
      console.warn(
        `[stripe] key mode mismatch: secret is ${mode} but publishable is ${pubMode}. ` +
          "Payments will fail until both come from the same Stripe environment.",
      );
    }
  }

  return { secretKey, publishableKey, mode, source: "env" };
}

async function replitCredentials(): Promise<StripeCredentials | null> {
  if (replitCache) {
    return {
      secretKey: replitCache.secretKey,
      publishableKey: replitCache.publishableKey,
      mode: modeOf(replitCache.secretKey),
      source: "replit",
    };
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!hostname || !xReplitToken) return null;

  try {
    const isProduction = process.env.REPLIT_DEPLOYMENT === "1";
    const url = new URL(`https://${hostname}/api/v2/connection`);
    url.searchParams.set("include_secrets", "true");
    url.searchParams.set("connector_names", "stripe");
    url.searchParams.set("environment", isProduction ? "production" : "development");

    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json", "X-Replit-Token": xReplitToken },
    });
    const data: any = await response.json();
    const settings = data.items?.[0]?.settings;
    if (!settings?.secret) return null;

    replitCache = { publishableKey: settings.publishable, secretKey: settings.secret };
    return {
      secretKey: settings.secret,
      publishableKey: settings.publishable ?? null,
      mode: modeOf(settings.secret),
      source: "replit",
    };
  } catch (err: any) {
    console.warn("[stripe] Replit connector lookup failed:", err?.message || err);
    return null;
  }
}

/**
 * Resolve credentials, or null when Stripe is simply not configured.
 * Never throws - callers decide whether that is fatal for their route.
 */
export async function getStripeCredentials(): Promise<StripeCredentials | null> {
  if (cached) return cached.creds;
  const creds = envCredentials() ?? (await replitCredentials());
  if (!creds) return null;

  const apiVersion = clean(process.env.STRIPE_API_VERSION);
  cached = {
    creds,
    client: new Stripe(creds.secretKey, {
      // Omitting apiVersion pins the SDK's own version, which is what the
      // bundled TypeScript types describe. STRIPE_API_VERSION is an escape
      // hatch for pinning to the account default instead.
      ...(apiVersion ? { apiVersion: apiVersion as any } : {}),
      appInfo: { name: "Kassenta POS", url: "https://kassenta.com" },
      maxNetworkRetries: 2,
      timeout: 20000,
    }),
  };
  console.log(
    `[stripe] configured from ${creds.source} in ${creds.mode} mode` +
      (creds.publishableKey ? "" : " (no publishable key set)"),
  );
  return cached.creds;
}

/** True when a usable secret key is present. */
export async function isStripeConfigured(): Promise<boolean> {
  return (await getStripeCredentials()) !== null;
}

export async function getStripeMode(): Promise<StripeMode | null> {
  const creds = await getStripeCredentials();
  return creds ? creds.mode : null;
}

/**
 * The Stripe client, or null when unconfigured.
 * Prefer this over requireStripeClient() in routes that can degrade.
 */
export async function getStripeClient(): Promise<Stripe | null> {
  await getStripeCredentials();
  return cached ? cached.client : null;
}

/**
 * The Stripe client, throwing a tagged error when unconfigured so route
 * handlers can map it to a 503 instead of leaking a stack trace.
 */
export async function requireStripeClient(): Promise<Stripe> {
  const client = await getStripeClient();
  if (!client) {
    const err: any = new Error(
      "Stripe is not configured. Set STRIPE_SECRET_KEY (and STRIPE_PUBLISHABLE_KEY) in the server environment.",
    );
    err.code = "STRIPE_NOT_CONFIGURED";
    err.statusCode = 503;
    throw err;
  }
  return client;
}

/** Back-compat name. Kept so existing call sites keep compiling. */
export async function getUncachableStripeClient(): Promise<Stripe> {
  return requireStripeClient();
}

/** Safe to send to a browser. Null when unset. */
export async function getStripePublishableKey(): Promise<string | null> {
  const creds = await getStripeCredentials();
  return creds ? creds.publishableKey : null;
}

/**
 * The publishable key, but only if it genuinely is one.
 *
 * Use this for anything written into an HTML page or a JSON config blob. A
 * one-character mistake in the environment - a secret key pasted into the
 * publishable slot - would otherwise ship a live `sk_` to every browser that
 * loads the site. Returns "" rather than throwing so a page still renders.
 */
export async function getBrowserSafeStripeKey(): Promise<string> {
  const key = await getStripePublishableKey();
  if (!key) return "";
  if (!key.startsWith("pk_")) {
    console.error(
      "[stripe] REFUSING to expose STRIPE_PUBLISHABLE_KEY to a browser: it does not " +
        "start with pk_. Check the environment - a secret key may be in the wrong slot.",
    );
    return "";
  }
  return key;
}

/** Server-side only. Never return this from an HTTP handler. */
export async function getStripeSecretKey(): Promise<string | null> {
  const creds = await getStripeCredentials();
  return creds ? creds.secretKey : null;
}

export function getStripeWebhookSecret(): string | null {
  return clean(process.env.STRIPE_WEBHOOK_SECRET);
}

/** Test hook / used after rotating keys without a restart. */
export function resetStripeCache(): void {
  cached = null;
  replitCache = null;
}

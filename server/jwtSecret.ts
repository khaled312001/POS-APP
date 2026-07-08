import crypto from "crypto";

/**
 * Single source of truth for the JWT signing secret.
 *
 * In production JWT_SECRET MUST be provided via the environment. If it is
 * missing we do NOT fall back to a committed literal (that would let anyone
 * with the source forge super-admin tokens). Instead we generate a random
 * per-process secret and log loudly — the server still boots, but every
 * existing token is invalidated on restart, which is a safe failure mode that
 * forces the operator to notice and set the env var.
 */
function resolveSecret(): string {
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv && fromEnv.length >= 32) return fromEnv;

  if (process.env.NODE_ENV === "production") {
    // eslint-disable-next-line no-console
    console.error(
      "[SECURITY] JWT_SECRET is not set (or too short). Using a random " +
        "per-process secret; all sessions will be invalidated on restart. " +
        "Set a strong JWT_SECRET (>=32 chars) in the environment.",
    );
  }
  return crypto.randomBytes(48).toString("hex");
}

export const JWT_SECRET = resolveSecret();

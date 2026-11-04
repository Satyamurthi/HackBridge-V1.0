/**
 * HackBridge Versioning & Release Isolation Protocol
 *
 * Current Production Baseline: v5.0 (Promoted to Production per user instruction)
 * - In-Hackathon Leaderboard with Gold/Silver/Bronze trophies
 * - Stage Uploads & Trace complete deliverable files & links crosscheck
 * - Host-approved marks gate (students only see marks after Host publishes results)
 * - Winners green indicator on student hackathon cards
 */

export const PROD_VERSION = "5.0.0";
export const V5_VERSION = "5.0.0";
export const V4_LEGACY_VERSION = "4.0.0";

export function isV5Enabled(context?: {
  headers?: Headers | { get: (key: string) => string | null };
  searchParams?: URLSearchParams | { get: (key: string) => string | null };
  queryString?: string;
}): boolean {
  // 1. Explicit legacy v4 request fallback
  if (context?.searchParams) {
    const vParam = context.searchParams.get("v") || context.searchParams.get("version");
    if (vParam === "4.0" || vParam === "4.0.0" || vParam === "4") {
      return false;
    }
  }

  if (context?.queryString) {
    const params = new URLSearchParams(context.queryString);
    const vParam = params.get("v") || params.get("version");
    if (vParam === "4.0" || vParam === "4.0.0" || vParam === "4") {
      return false;
    }
  }

  if (context?.headers) {
    const vHeader =
      context.headers.get("x-hackbridge-version") ||
      context.headers.get("x-version");

    if (vHeader === "4.0" || vHeader === "4.0.0" || vHeader === "4") {
      return false;
    }
  }

  // 2. Active default in production is now v5.0!
  return true;
}

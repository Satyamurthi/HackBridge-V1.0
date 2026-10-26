import crypto from "crypto";

/**
 * Generates a unique, collision-resistant student Hackathon ID
 * Format: HB-XXXXXX (e.g., HB-782914 or HB-9AF204)
 */
export function generateHackathonId(): string {
  const chars = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // exclude easily confused chars (I, O)
  let result = "";
  const randomBytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  return `HB-${result}`;
}

/**
 * Generates a unique Team ID
 * Format: TEAM-XXXXXX (e.g., TEAM-402918)
 * Generated only after verified payment
 */
export function generateTeamId(): string {
  const chars = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let result = "";
  const randomBytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  return `TEAM-${result}`;
}

/**
 * Validates whether an ID matches the strict HB-XXXXXX pattern
 */
export function isValidHackathonId(id: string): boolean {
  return /^HB-[A-Z0-9]{6}$/.test(id.trim().toUpperCase());
}

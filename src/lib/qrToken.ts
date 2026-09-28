// Signed QR ticket tokens — HMAC-SHA256 (Web Crypto), truncated tag for compact QR.
// Format encoded in QR: SG1.<b64u(payload)>.<b64u(tag8)>
// payload = `${code}:${user_id}`
//
// The secret is loaded once from `settings.qr_secret` (admin-managed value).
// We avoid embedding the secret in any client bundle — the row is read on demand.

import { supabase } from "@/integrations/supabase/client";

const PREFIX = "SG1";
const PREFIX_V2 = "SG2"; // versioned tokens: payload = `${code}:${user_id}:${qr_version}`
const TAG_BYTES = 8; // 64-bit truncation — plenty for event ticket scope

let secretCache: string | null = null;
let secretInFlight: Promise<string> | null = null;

async function getSecret(): Promise<string> {
  if (secretCache) return secretCache;
  if (secretInFlight) return secretInFlight;
  secretInFlight = (async () => {
    const { data } = await supabase.from("settings").select("value").eq("key", "qr_secret").maybeSingle();
    if (data?.value) {
      secretCache = data.value;
      return data.value;
    }
    // Auto-create a secret if missing — never block the user with this error.
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const generated = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
    try {
      // Re-check then insert to avoid duplicates if another tab raced us.
      const { data: again } = await supabase.from("settings").select("value").eq("key", "qr_secret").maybeSingle();
      if (again?.value) { secretCache = again.value; return again.value; }
      await supabase.from("settings").insert({ key: "qr_secret", value: generated });
    } catch { /* best-effort; fall back to in-memory secret for this session */ }
    secretCache = generated;
    return generated;
  })().finally(() => { secretInFlight = null; });
  return secretInFlight;
}

function b64uEncode(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 1) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64uDecode(str: string): Uint8Array {
  const pad = str.length % 4 ? "=".repeat(4 - (str.length % 4)) : "";
  const bin = atob(str.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacSha256(secret: string, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return new Uint8Array(sig);
}

/** Build a compact, signed QR payload string for a ticket.
 *  Pass `qrVersion` so reprints can invalidate older QRs.
 */
export async function signQrToken(code: string, userId: string, qrVersion: number = 1): Promise<string> {
  const secret = await getSecret();
  const payload = `${code}:${userId}:${qrVersion}`;
  const tag = (await hmacSha256(secret, payload)).slice(0, TAG_BYTES);
  const payloadB = b64uEncode(new TextEncoder().encode(payload));
  const tagB = b64uEncode(tag);
  return `${PREFIX_V2}.${payloadB}.${tagB}`;
}

export interface VerifiedQr {
  valid: boolean;
  code?: string;
  userId?: string;
  /** Version embedded in the QR. The scanner must compare this with the
   *  current `users.qr_version`; if it doesn't match, the ticket was reprinted
   *  and this QR is no longer valid. */
  qrVersion?: number;
}

/** Verify a scanned QR string. Also tolerates raw codes (e.g. "SG-1234") as fallback. */
export async function verifyQrToken(raw: string): Promise<VerifiedQr> {
  const trimmed = raw.trim();
  // Fallback: scanner picked up the plain code (manual fallback, low-trust)
  if (/^SG-\d{3,5}$/i.test(trimmed) || /^[A-Z]{2,4}-\d{3,5}$/i.test(trimmed)) {
    return { valid: false, code: trimmed.toUpperCase() };
  }
  const parts = trimmed.split(".");
  if (parts.length !== 3 || (parts[0] !== PREFIX && parts[0] !== PREFIX_V2)) return { valid: false };
  try {
    const secret = await getSecret();
    const payload = new TextDecoder().decode(b64uDecode(parts[1]));
    const tag = b64uDecode(parts[2]);
    const expected = (await hmacSha256(secret, payload)).slice(0, TAG_BYTES);
    if (expected.length !== tag.length) return { valid: false };
    let ok = 1;
    for (let i = 0; i < tag.length; i += 1) ok &= expected[i] === tag[i] ? 1 : 0;
    if (!ok) return { valid: false };
    const [code, userId, versionRaw] = payload.split(":");
    if (!code || !userId) return { valid: false };
    const qrVersion = versionRaw ? Number(versionRaw) : 1;
    return { valid: true, code, userId, qrVersion };
  } catch {
    return { valid: false };
  }
}

/** Build the URL string that we encode into PDF QR images. */
export async function buildSignedTicketQrPayload(code: string, userId: string, qrVersion: number = 1): Promise<string> {
  return signQrToken(code, userId, qrVersion);
}
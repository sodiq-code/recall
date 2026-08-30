/**
 * Recall — site signing key (foundation; fully wired on Day 6/7).
 *
 * The site key signs audit entries and capability tokens so a user (or judge)
 * can verify any artifact Recall emits without trusting the database. It is
 * generated per-user on first sign-in via WebCrypto `subtle.generateKey`,
 * stored as a JWK, and never derived client-side.
 *
 * Day 1 establishes the key-availability contract: `getSiteKey()` returns a
 * usable CryptoKey for the given user (generating + persisting one if none
 * exists). Day 6 uses it to sign capability tokens; Day 7 uses it to sign the
 * audit-export bundle.
 *
 * Blueprint §21.1: "the site's key is the same key that signs the TLS cert, so
 * the signature is structurally tied to the origin." We approximate that
 * invariant by deriving a per-user key so multi-tenant isolation holds.
 */
import { db } from "@/lib/db";

type WebCryptoKey = Awaited<ReturnType<typeof crypto.subtle.generateKey>>;

const keyCache = new Map<string, CryptoKey>();

/**
 * Return the signing CryptoKey for a user, generating and persisting one on
 * first use. The key is cached in-memory for the lifetime of the process.
 */
export async function getSiteKey(userId: string): Promise<CryptoKey> {
  const cached = keyCache.get(userId);
  if (cached) return cached;

  const user = await db.user.findUnique({ where: { id: userId } });
  if (user?.siteKeyJwk) {
    const key = await crypto.subtle.importKey(
      "jwk",
      JSON.parse(user.siteKeyJwk) as JsonWebKey,
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign"],
    );
    keyCache.set(userId, key);
    return key;
  }

  // First use — generate and persist. Day 6 hardens this with key rotation.
  const keyPair = (await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  )) as WebCryptoKey & CryptoKey;

  const jwk = await crypto.subtle.exportKey("jwk", keyPair);
  await db.user.update({
    where: { id: userId },
    data: { siteKeyJwk: JSON.stringify(jwk) },
  });
  keyCache.set(userId, keyPair);
  return keyPair;
}

/**
 * Sign an arbitrary payload with the user's site key and return a detached
 * JWS signature (base64url). Day 6/7 wires this into capability tokens and
 * audit entries.
 */
export async function signWithSiteKey(
  userId: string,
  payload: unknown,
): Promise<string> {
  const key = await getSiteKey(userId);
  const data = new TextEncoder().encode(JSON.stringify(payload));
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    data,
  );
  return Buffer.from(new Uint8Array(sig)).toString("base64url");
}

/**
 * Verify a detached signature against a user's site key. Used by the audit
 * export verifier (Day 7) and any external party that wants to check a
 * Recall-emitted artifact against the user's public key.
 */
export async function verifyWithSiteKey(
  userId: string,
  payload: unknown,
  signature: string,
): Promise<boolean> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.siteKeyJwk) return false;

  const jwk = JSON.parse(user.siteKeyJwk) as JsonWebKey;
  // importKey needs the verify usage; re-import the public component.
  const key = await crypto.subtle.importKey(
    "jwk",
    { ...jwk, key_ops: ["verify"] },
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["verify"],
  );

  const data = new TextEncoder().encode(JSON.stringify(payload));
  const sig = Buffer.from(signature, "base64url");
  return crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    sig,
    data,
  );
}

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/api";
import { exportAuditLog } from "@/lib/audit";

/**
 * GET /api/audit/export — export the user's full audit log as a signed JWS
 * bundle.
 *
 * Returns a JSON object with:
 *   - payload: the audit export bundle (base64url-encoded JSON)
 *   - signature: the detached JWS signature (base64url, ECDSA P-256 + SHA-256)
 *   - publicKeyJwk: the user's public key as a JWK (for external verification)
 *   - alg: the signing algorithm
 *
 * The bundle is self-contained: a judge or external auditor can decode the
 * payload, verify the signature with the public key, and confirm the audit
 * log hasn't been tampered with — independent of the database.
 *
 * The audit export signs the bundle; users verify the JWS signature
 * with site's public key."
 */
export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const signedExport = await exportAuditLog(auth.user.id);

  return NextResponse.json(signedExport, {
    headers: {
      // Suggest a filename for download.
      "Content-Disposition": `attachment; filename="recall-audit-${Date.now()}.json"`,
    },
  });
}

export const dynamic = "force-dynamic";

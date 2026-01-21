import "server-only";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

/**
 * Firebase Admin is used ONLY on the server to verify ID tokens.
 *
 * Set env:
 *  - FIREBASE_ADMIN_SERVICE_ACCOUNT (JSON string)
 */
export function getAdminAuth() {
  const svc = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (!svc) {
    throw new Error(
      "Missing FIREBASE_ADMIN_SERVICE_ACCOUNT env var. Create a Firebase service account key and paste the JSON as a single-line string."
    );
  }
  const parsed = JSON.parse(svc);
  const app = getApps().length
    ? getApps()[0]!
    : initializeApp({
        credential: cert({
          projectId: parsed.project_id,
          clientEmail: parsed.client_email,
          privateKey: (parsed.private_key as string).replace(/\\n/g, "\n"),
        }),
      });
  return getAuth(app);
}

export async function requireUserUidFromAuthHeader(req: Request) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) throw new Error("Missing Authorization: Bearer <token> header.");
  const token = m[1]!;
  const adminAuth = getAdminAuth();
  const decoded = await adminAuth.verifyIdToken(token);
  return decoded.uid;
}

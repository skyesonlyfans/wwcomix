import "server-only";

import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export function getAdminDb() {
  const svc = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (!svc) throw new Error("Missing FIREBASE_ADMIN_SERVICE_ACCOUNT env var.");
  const parsed = JSON.parse(svc);

  const app =
    getApps().length
      ? getApps()[0]!
      : initializeApp({
          credential: cert({
            projectId: parsed.project_id,
            clientEmail: parsed.client_email,
            privateKey: (parsed.private_key as string).replace(/\n/g, "
"),
          }),
        });

  return getFirestore(app);
}

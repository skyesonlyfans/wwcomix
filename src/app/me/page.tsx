"use client";

import AuthGate, { useAuth } from "@/components/AuthGate";
import { useEffect, useState } from "react";
import { getProfile } from "@/lib/profile";
import { useRouter } from "next/navigation";

export default function MePage() {
  return (
    <AuthGate fallback={<main className="container"><div className="card">Sign in to view your profile.</div></main>}>
      <Inner />
    </AuthGate>
  );
}

function Inner() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      if (!user) return;
      const p = await getProfile(user.uid);
      if (!p) router.replace("/onboarding");
      else router.replace(`/profile/${p.usernameLower}`);
      setLoading(false);
    })();
  }, [user, router]);

  return <main className="container"><div className="card">{loading ? "Loading…" : "Redirecting…"}</div></main>;
}

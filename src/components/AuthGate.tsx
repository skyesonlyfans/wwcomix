"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
  }, []);
  return { user, loading };
}

export default function AuthGate({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="container"><div className="card">Loading…</div></div>;
  if (!user) return <>{fallback ?? <div className="container"><div className="card">Please sign in.</div></div>}</>;
  return <>{children}</>;
}

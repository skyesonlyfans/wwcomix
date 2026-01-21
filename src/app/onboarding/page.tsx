"use client";

import AuthGate, { useAuth } from "@/components/AuthGate";
import { normalizeUsername } from "@/lib/username";
import { reserveUsernameAndCreateProfile, getProfile } from "@/lib/profile";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  return (
    <AuthGate fallback={<main className="container"><div className="card">Sign in first.</div></main>}>
      <Inner />
    </AuthGate>
  );
}

function Inner() {
  const { user } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) return;
      setDisplayName(user.displayName ?? "");
      const existing = await getProfile(user.uid);
      if (existing) router.replace(`/profile/${existing.usernameLower}`);
    })();
  }, [user, router]);

  async function submit() {
    setErr(null);
    if (!user) return;
    const n = normalizeUsername(username);
    if (!n.ok) { setErr(n.error); return; }
    setBusy(true);
    try {
      await reserveUsernameAndCreateProfile({
        uid: user.uid,
        username: n.username,
        usernameLower: n.usernameLower,
        displayName: displayName || (user.displayName ?? n.username),
        photoURL: user.photoURL,
        bio: bio || null,
      });
      router.replace(`/profile/${n.usernameLower}`);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to create profile.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container">
      <div className="card">
        <h2 style={{marginTop:0}}>Create your profile</h2>
        <p className="small">Pick a unique username (3–20 chars: a–z, 0–9, _).</p>
        <div className="row">
          <div>
            <label>Username</label>
            <input value={username} onChange={(e)=>setUsername(e.target.value)} placeholder="e.g. skye_rules" />
          </div>
          <div>
            <label>Display name</label>
            <input value={displayName} onChange={(e)=>setDisplayName(e.target.value)} placeholder="Skye" />
          </div>
        </div>
        <div style={{marginTop:12}}>
          <label>Bio (optional)</label>
          <textarea value={bio} onChange={(e)=>setBio(e.target.value)} placeholder="Your hottest takes…" rows={3} />
        </div>
        {err && <p style={{color:"tomato"}}>{err}</p>}
        <button className="primary" onClick={submit} disabled={busy}>{busy ? "Creating…" : "Create profile"}</button>
      </div>
    </main>
  );
}

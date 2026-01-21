"use client";

import AuthGate, { useAuth } from "@/components/AuthGate";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createThread, listWallThreads, type ThreadVisibility } from "@/lib/threads";

export default function WallPage() {
  return (
    <main className="container">
      <AuthGate fallback={<Inner signedIn={false} />} >
        <Inner signedIn />
      </AuthGate>
    </main>
  );
}

function Inner({ signedIn }: { signedIn: boolean }) {
  const { user } = useAuth();
  const [threads, setThreads] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<ThreadVisibility>("public");

  async function refresh() {
    const t = await listWallThreads(user?.uid);
    setThreads(t);
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [user?.uid]);

  async function makeThread() {
    if (!user) return;
    const t = title.trim();
    if (!t) return;
    setBusy(true);
    try {
      const allowedUids = visibility === "friends" ? [user.uid] : undefined;
      const id = await createThread({ title: t, visibility, createdBy: user.uid, allowedUids });
      setTitle("");
      window.location.href = `/thread/${id}`;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="row" style={{ alignItems: "baseline" }}>
        <div style={{ flex: "1 1 420px" }}>
          <h1 style={{ margin: 0 }}>Wall</h1>
          <p>
            Public threads show up for everyone. Friends-only threads are visible only to the allowed people (rooms automatically set this up).
          </p>
        </div>
        <div style={{ flex: "0 0 auto" }}>
          <Link className="badge" href="/rooms">Start a co-op Room →</Link>
        </div>
      </div>

      {signedIn ? (
        <div className="card" style={{ marginTop: 12 }}>
          <h2 style={{ marginTop: 0 }}>New thread</h2>
          <div className="row">
            <div style={{ flex: "2 1 360px" }}>
              <label>Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 'Who wins: Magneto vs Vader?'" />
            </div>
            <div style={{ flex: "1 1 220px" }}>
              <label>Visibility</label>
              <select value={visibility} onChange={(e) => setVisibility(e.target.value as any)}>
                <option value="public">Public</option>
                <option value="friends">Friends-only</option>
              </select>
            </div>
          </div>
          <button className="primary" onClick={makeThread} disabled={busy}>Create</button>
          <div className="small" style={{ marginTop: 6 }}>
            Tip: For room battles, the thread is created automatically inside the room.
          </div>
        </div>
      ) : (
        <div className="item" style={{ marginTop: 12 }}>
          <b>Sign in to create and reply.</b>
          <div className="small">You can still browse public threads.</div>
        </div>
      )}

      <div className="card" style={{ marginTop: 12 }}>
        <h2 style={{ marginTop: 0 }}>Threads</h2>
        {threads.length === 0 ? (
          <div className="small">No threads yet.</div>
        ) : (
          <div className="list">
            {threads.map((t: any) => (
              <Link key={t.id} href={`/thread/${t.id}`} className="item" style={{ textDecoration: "none" }}>
                <div className="row" style={{ alignItems: "baseline" }}>
                  <div style={{ flex: "1 1 420px" }}>
                    <b>{t.title}</b>
                    {t.battleSummary ? <div className="small">{t.battleSummary}</div> : null}
                    {t.roomId ? <div className="small">Room: <span className="kbd">{t.roomId}</span></div> : null}
                  </div>
                  <div style={{ flex: "0 0 auto" }}>
                    <span className="badge">{t.visibility === "public" ? "Public" : "Friends-only"}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

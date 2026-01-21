"use client";

import AuthGate, { useAuth } from "@/components/AuthGate";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createRoom, listIncomingInvites, listRoomsForUser, respondInvite, type Room, type RoomMode, type RoomVisibility } from "@/lib/rooms";

export default function RoomsPage() {
  return (
    <AuthGate fallback={<main className="container"><div className="card">Sign in to use Rooms.</div></main>}>
      <Inner />
    </AuthGate>
  );
}

function Inner() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<RoomMode>("1v1");
  const [visibility, setVisibility] = useState<RoomVisibility>("friends");
  const [title, setTitle] = useState("");

  async function refresh() {
    if (!user) return;
    const [r, inv] = await Promise.all([listRoomsForUser(user.uid), listIncomingInvites(user.uid)]);
    setRooms(r);
    setInvites(inv);
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [user?.uid]);

  async function makeRoom() {
    if (!user) return;
    setBusy(true);
    try {
      const id = await createRoom({ createdBy: user.uid, mode, visibility, title });
      setTitle("");
      await refresh();
      // navigate:
      window.location.href = `/rooms/${id}`;
    } finally {
      setBusy(false);
    }
  }

  async function actInvite(id: string, action: "accepted" | "declined") {
    setBusy(true);
    try {
      await respondInvite(id, action);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container">
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Rooms</h1>
        <p>
          Rooms let you invite friends to pick heroes on their side, run a shared 1v1 or 2v2, and discuss it in one place.
        </p>

        {invites.length ? (
          <div className="card" style={{ marginTop: 12 }}>
            <h2 style={{ marginTop: 0 }}>Invites</h2>
            <div className="list">
              {invites.map((i: any) => (
                <div key={i.id} className="item">
                  <div><b>Room:</b> <span className="kbd">{i.roomId}</span> • <b>Side:</b> Team {i.side}</div>
                  <div className="row" style={{ marginTop: 8 }}>
                    <button className="primary" onClick={() => actInvite(i.id, "accepted")} disabled={busy}>Accept</button>
                    <button onClick={() => actInvite(i.id, "declined")} disabled={busy}>Decline</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid2" style={{ marginTop: 12 }}>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Create a room</h2>
            <div className="row">
              <div>
                <label>Mode</label>
                <select value={mode} onChange={(e) => setMode(e.target.value as any)}>
                  <option value="1v1">1v1</option>
                  <option value="2v2">2v2</option>
                </select>
              </div>
              <div>
                <label>Visibility</label>
                <select value={visibility} onChange={(e) => setVisibility(e.target.value as any)}>
                  <option value="friends">Friends-only thread</option>
                  <option value="public">Public thread</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <label>Title (optional)</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 'Batman vs Vader — settle it'" />
            </div>
            <div style={{ marginTop: 12 }}>
              <button className="primary" onClick={makeRoom} disabled={busy}>Create room</button>
            </div>
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0 }}>Your rooms</h2>
            {rooms.length === 0 ? (
              <div className="small">No rooms yet. Create one and invite a friend.</div>
            ) : (
              <div className="list">
                {rooms.map((r: any) => (
                  <Link key={r.id} href={`/rooms/${r.id}`} className="item" style={{ textDecoration: "none" }}>
                    <b>{r.title ?? "Room"}</b>
                    <div className="small">Mode {r.mode} • {r.visibility === "public" ? "Public" : "Friends-only"} • Status {r.status}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <hr className="hr" />
        <div className="small">
          Want solo battles? Use <Link href="/battle">Battle</Link>. Want to browse stats? Use <Link href="/heroes">Heroes</Link>. Want threads? Use <Link href="/wall">Wall</Link>.
        </div>
      </div>
    </main>
  );
}

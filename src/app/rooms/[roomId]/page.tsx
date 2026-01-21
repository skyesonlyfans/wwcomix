"use client";

import AuthGate, { useAuth } from "@/components/AuthGate";
import HeroPicker from "@/components/HeroPicker";
import type { Hero } from "@/lib/hero";
import { simulateBattle } from "@/lib/battle";
import { auth } from "@/lib/firebase";
import { attachThread, getRoom, isRoomReady, sendRoomInvite, setPick, type Room } from "@/lib/rooms";
import { addPost, createThread, getThread, listPosts, type Thread } from "@/lib/threads";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

async function fetchHero(id: string): Promise<Hero> {
  const r = await fetch(`/api/superhero/hero/${encodeURIComponent(id)}`);
  const data = await r.json();
  if (data?.response === "error") throw new Error(data?.error ?? "Failed");
  return data as Hero;
}

type Pick = { id: string; hero?: Hero };

export default function RoomPage() {
  return (
    <AuthGate fallback={<main className="container"><div className="card">Sign in to open this room.</div></main>}>
      <Inner />
    </AuthGate>
  );
}

function Inner() {
  const { roomId } = useParams() as any;
  const { user } = useAuth();
  const [room, setRoom] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"picks" | "battle" | "thread">("picks");
  const [err, setErr] = useState<string | null>(null);

  const [inviteName, setInviteName] = useState("");
  const [inviteSide, setInviteSide] = useState<"A" | "B">("B");

  const [thread, setThread] = useState<any | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [postBody, setPostBody] = useState("");

  // local pick state to show names
  const [pA0, setPA0] = useState<Pick>({ id: "" });
  const [pA1, setPA1] = useState<Pick>({ id: "" });
  const [pB0, setPB0] = useState<Pick>({ id: "" });
  const [pB1, setPB1] = useState<Pick>({ id: "" });

  async function refresh() {
    const r = await getRoom(String(roomId));
    setRoom(r);
    setErr(null);
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Resolve hero IDs into names for pickers
  useEffect(() => {
    (async () => {
      if (!room) return;
      const mode = room.mode as "1v1" | "2v2";
      const getId = (side: "A" | "B", slot: number) => {
        const t = side === "A" ? room.teamA : room.teamB;
        return (t?.picks ?? [])[slot] ?? "";
      };
      const ids = [
        ["A", 0, getId("A", 0)],
        ["A", 1, mode === "2v2" ? getId("A", 1) : ""],
        ["B", 0, getId("B", 0)],
        ["B", 1, mode === "2v2" ? getId("B", 1) : ""],
      ] as any[];
      const setters: any = { "A0": setPA0, "A1": setPA1, "B0": setPB0, "B1": setPB1 };

      for (const [s, slot, id] of ids) {
        const key = `${s}${slot}`;
        if (!id) { setters[key]({ id: "" }); continue; }
        try {
          const hero = await fetchHero(id);
          setters[key]({ id, hero });
        } catch {
          setters[key]({ id });
        }
      }
    })();
  }, [room?.teamA?.picks?.join(","), room?.teamB?.picks?.join(","), room?.mode]);

  const ready = useMemo(() => (room ? isRoomReady(room as any) : false), [room]);

  const youInRoom = useMemo(() => {
    if (!user || !room) return false;
    return (room.participants ?? []).includes(user.uid);
  }, [user?.uid, room?.participants?.join(",")]);

  async function ensureThread() {
    if (!user || !room) return;
    if (room.threadId) {
      const t = await getThread(room.threadId);
      setThread(t);
      return;
    }
    setBusy(true);
    try {
      const allowedUids = room.visibility === "friends" ? (room.participants ?? []) : undefined;
      const title = room.title ?? "Room thread";
      const tid = await createThread({
        title,
        visibility: room.visibility,
        createdBy: room.createdBy,
        allowedUids,
        roomId: room.id,
      });
      await attachThread(room.id, tid);
      const t = await getThread(tid);
      setThread(t);
    } finally {
      setBusy(false);
    }
  }

  async function refreshPosts() {
    if (!room?.threadId) return;
    const ps = await listPosts(room.threadId);
    setPosts(ps);
  }

  useEffect(() => { if (tab === "thread") { ensureThread().then(refreshPosts); } /* eslint-disable-next-line */ }, [tab, room?.threadId]);

  async function sendInvite() {
    if (!user || !room) return;
    setBusy(true);
    setErr(null);
    try {
      await sendRoomInvite({ roomId: room.id, fromUid: user.uid, toUsername: inviteName, side: inviteSide });
      setInviteName("");
    } catch (e: any) {
      setErr(e?.message ?? "Invite failed");
    } finally {
      setBusy(false);
    }
  }

  async function pick(side: "A" | "B", slot: number, p: Pick) {
    if (!room) return;
    setBusy(true);
    try {
      await setPick({ roomId: room.id, side, slot, heroId: p.id });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function runBattle() {
    if (!room) return;
    setBusy(true);
    setErr(null);
    try {
      const mode = room.mode as "1v1" | "2v2";
      const idsA = (room.teamA?.picks ?? []).filter(Boolean).slice(0, mode === "1v1" ? 1 : 2);
      const idsB = (room.teamB?.picks ?? []).filter(Boolean).slice(0, mode === "1v1" ? 1 : 2);

      const [teamA, teamB] = await Promise.all([Promise.all(idsA.map(fetchHero)), Promise.all(idsB.map(fetchHero))]);

      const res = simulateBattle({ mode, teamA, teamB });
      // store battle log
      const token = await auth.currentUser?.getIdToken();
      await fetch(`/api/rooms/saveBattle`, {
        method: "POST",
        headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ roomId: room.id, battle: res }),
      });
      await refresh();
      setTab("battle");
      await ensureThread();
      if (room.threadId) {
        await addPost(room.threadId, { authorUid: (user as any).uid, body: `🧨 **Battle run!** ${res.summary}\n\nSeed: \`${res.seed}\`\nWinner: Team ${res.winner}\n\n(Scroll up in Battle tab for the full play-by-play.)` });
      }
    } catch (e: any) {
      setErr(e?.message ?? "Battle failed");
    } finally {
      setBusy(false);
    }
  }

  async function post() {
    if (!user || !room?.threadId) return;
    const body = postBody.trim();
    if (!body) return;
    setBusy(true);
    try {
      await addPost(room.threadId, { authorUid: user.uid, body });
      setPostBody("");
      await refreshPosts();
    } finally {
      setBusy(false);
    }
  }

  if (!room) {
    return (
      <main className="container">
        <div className="card">Loading room…</div>
      </main>
    );
  }

  return (
    <main className="container">
      <div className="card">
        <div className="row" style={{ alignItems: "baseline" }}>
          <div style={{ flex: "1 1 380px" }}>
            <h1 style={{ margin: 0 }}>{room.title ?? "Room"}</h1>
            <p>Mode {room.mode} • {room.visibility === "public" ? "Public" : "Friends-only"} • {room.status}</p>
          </div>
          <div style={{ flex: "0 0 auto" }}>
            <Link className="badge" href="/rooms">← Back to Rooms</Link>
          </div>
        </div>

        {!youInRoom ? (
          <div className="item">
            <b>You’re not a participant in this room.</b>
            <div className="small">Ask the host to invite you by username.</div>
          </div>
        ) : null}

        <div className="tabs" style={{ marginTop: 10 }}>
          <button className={`tab ${tab==="picks"?"active":""}`} onClick={() => setTab("picks")}>Picks</button>
          <button className={`tab ${tab==="battle"?"active":""}`} onClick={() => setTab("battle")}>Battle</button>
          <button className={`tab ${tab==="thread"?"active":""}`} onClick={() => setTab("thread")}>Thread</button>
        </div>

        {err ? <p style={{ color: "tomato" }}>{err}</p> : null}

        {tab === "picks" ? (
          <div className="grid2" style={{ marginTop: 12 }}>
            <div className="card">
              <h2 style={{ marginTop: 0 }}>Team A</h2>
              <div className="small">Players: {(room.teamA?.uids ?? []).map((u:string)=>u.slice(0,6)).join(", ") || "—"}</div>
              <div style={{ marginTop: 10 }}>
                <HeroPicker label="A1" value={pA0} onPick={(p) => pick("A", 0, p)} />
              </div>
              {room.mode === "2v2" ? (
                <div style={{ marginTop: 10 }}>
                  <HeroPicker label="A2" value={pA1} onPick={(p) => pick("A", 1, p)} />
                </div>
              ) : null}
            </div>

            <div className="card">
              <h2 style={{ marginTop: 0 }}>Team B</h2>
              <div className="small">Players: {(room.teamB?.uids ?? []).map((u:string)=>u.slice(0,6)).join(", ") || "—"}</div>
              <div style={{ marginTop: 10 }}>
                <HeroPicker label="B1" value={pB0} onPick={(p) => pick("B", 0, p)} />
              </div>
              {room.mode === "2v2" ? (
                <div style={{ marginTop: 10 }}>
                  <HeroPicker label="B2" value={pB1} onPick={(p) => pick("B", 1, p)} />
                </div>
              ) : null}
            </div>

            <div className="card" style={{ gridColumn: "1 / -1" }}>
              <div className="row" style={{ alignItems: "center" }}>
                <div style={{ flex: "1 1 380px" }}>
                  <b>Ready?</b> {ready ? <span className="badge">All picks locked</span> : <span className="badge">Waiting on picks</span>}
                  <div className="small">When both sides are full and picked, run the battle and auto-post it into the thread.</div>
                </div>
                <div style={{ flex: "0 0 auto" }}>
                  <button className="primary" disabled={!ready || busy} onClick={runBattle}>Run battle</button>
                </div>
              </div>

              {user?.uid === room.createdBy ? (
                <div className="card" style={{ marginTop: 12 }}>
                  <h3 style={{ marginTop: 0 }}>Invite a friend</h3>
                  <div className="row">
                    <div>
                      <label>Friend username</label>
                      <input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="@username" />
                    </div>
                    <div>
                      <label>Side</label>
                      <select value={inviteSide} onChange={(e) => setInviteSide(e.target.value as any)}>
                        <option value="A">Team A</option>
                        <option value="B">Team B</option>
                      </select>
                    </div>
                  </div>
                  <button className="primary" onClick={sendInvite} disabled={busy}>Send invite</button>
                  <div className="small" style={{ marginTop: 6 }}>
                    Tip: For 1v1, invite exactly one friend to Team B. For 2v2, invite up to 3 friends across sides.
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {tab === "battle" ? (
          <div className="card" style={{ marginTop: 12 }}>
            <h2 style={{ marginTop: 0 }}>Battle</h2>
            {!room.battle ? (
              <div className="small">No battle yet. Go to Picks → Run battle.</div>
            ) : (
              <>
                <div className="item"><b>{room.battle.summary}</b></div>
                <div className="list" style={{ marginTop: 10 }}>
                  {(room.battle.log ?? []).map((l: string, i: number) => (
                    <div key={i} className="item">{l}</div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : null}

        {tab === "thread" ? (
          <div className="card" style={{ marginTop: 12 }}>
            <h2 style={{ marginTop: 0 }}>Thread</h2>
            <p>One place to argue, cite feats, and share comics for this room.</p>

            {room.threadId ? (
              <div className="small">Also visible on the <Link href="/wall">Wall</Link>.</div>
            ) : (
              <div className="small">Creating thread…</div>
            )}

            <div style={{ marginTop: 10 }} className="card">
              <label>Post</label>
              <textarea value={postBody} onChange={(e) => setPostBody(e.target.value)} rows={4} placeholder="Drop your argument. Bonus points: cite a round number or a key moment." />
              <div className="row" style={{ marginTop: 10 }}>
                <button className="primary" onClick={post} disabled={busy}>Post</button>
                <button className="ghost" onClick={() => setPostBody((b) => b + (b ? "\n\n" : "") + "📎 Share a comic from My Comics: paste a /reader link here so friends can open it in kthoom.")}>Share comic tip</button>
                <button className="ghost" onClick={() => setPostBody((b) => b + (b ? "\n\n" : "") + "🧾 Cite: mention the seed + the round that changed the fight (momentum swings, crits, counters).")}>Cite battle tip</button>
              </div>
            </div>

            <div className="list" style={{ marginTop: 12 }}>
              {posts.length === 0 ? <div className="item small">No posts yet. Be the first to start the argument.</div> : null}
              {posts.map((p: any) => (
                <div key={p.id} className="item">
                  <div className="small">From <span className="kbd">{String(p.authorUid).slice(0, 6)}</span></div>
                  <div style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>{p.body}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}

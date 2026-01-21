"use client";

import AuthGate, { useAuth } from "@/components/AuthGate";
import { normalizeUsername } from "@/lib/username";
import { acceptRequest, cancelRequest, declineRequest, getUserPublicProfile, listFriends, listIncoming, listOutgoing, sendFriendRequest, uidByUsername } from "@/lib/friends";
import { useEffect, useState } from "react";

export default function FriendsPage() {
  return (
    <AuthGate fallback={<main className="container"><div className="card">Sign in to manage friends.</div></main>}>
      <Inner />
    </AuthGate>
  );
}

function Inner() {
  const { user } = useAuth();
  const [friendName, setFriendName] = useState("");
  const [err, setErr] = useState<string|null>(null);
  const [info, setInfo] = useState<string|null>(null);
  const [incoming, setIncoming] = useState<any[]>([]);
  const [outgoing, setOutgoing] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (!user) return;
    const [inc, out, uids] = await Promise.all([listIncoming(user.uid), listOutgoing(user.uid), listFriends(user.uid)]);
    setIncoming(inc); setOutgoing(out);
    const profiles = await Promise.all(uids.map(uid => getUserPublicProfile(uid)));
    setFriends(profiles.filter(Boolean));
  }

  useEffect(()=>{ refresh(); }, [user]);

  async function add() {
    setErr(null); setInfo(null);
    if (!user) return;
    const n = normalizeUsername(friendName);
    if (!n.ok) { setErr(n.error); return; }
    setBusy(true);
    try {
      const toUid = await uidByUsername(n.usernameLower);
      if (!toUid) throw new Error("No user with that username.");
      await sendFriendRequest(user.uid, toUid);
      setInfo("Request sent!");
      setFriendName("");
      await refresh();
    } catch(e:any) {
      setErr(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container">
      <div className="card">
        <h2 style={{marginTop:0}}>Friends</h2>

        <div className="card">
          <h3 style={{marginTop:0}}>Add a friend by username</h3>
          <div className="row">
            <input value={friendName} onChange={(e)=>setFriendName(e.target.value)} placeholder="@username" />
            <div style={{flex:"0 0 180px"}}>
              <button className="primary" disabled={busy} onClick={add}>Send request</button>
            </div>
          </div>
          {err && <p style={{color:"tomato"}}>{err}</p>}
          {info && <p style={{color:"limegreen"}}>{info}</p>}
        </div>

        <div className="row" style={{marginTop:12}}>
          <div className="card">
            <h3 style={{marginTop:0}}>Your friends</h3>
            {friends.length===0 ? <p className="small">No friends yet — send a request!</p> : (
              <ul>
                {friends.map((f:any) => (
                  <li key={f.uid} style={{marginBottom:8, display:"flex", gap:10, alignItems:"center"}}>
                    <img src={f.photoURL ?? "/favicon.ico"} alt="" width={32} height={32} style={{borderRadius:999}} />
                    <div>
                      <div><b>@{f.username ?? "user"}</b></div>
                      <div className="small" style={{opacity:.85}}>{f.displayName ?? ""}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card">
            <h3 style={{marginTop:0}}>Incoming</h3>
            {incoming.length===0 ? <p className="small">No incoming requests.</p> : (
              <ul>
                {incoming.map(r => (
                  <li key={r.id} style={{marginBottom:8}}>
                    <div className="small">From UID: {r.fromUid}</div>
                    <button className="primary" onClick={async()=>{ await acceptRequest(r.id); await refresh(); }}>Accept</button>{" "}
                    <button onClick={async()=>{ await declineRequest(r.id); await refresh(); }}>Decline</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card">
            <h3 style={{marginTop:0}}>Outgoing</h3>
            {outgoing.length===0 ? <p className="small">No outgoing requests.</p> : (
              <ul>
                {outgoing.map(r => (
                  <li key={r.id} style={{marginBottom:8}}>
                    <div className="small">To UID: {r.toUid}</div>
                    <button onClick={async()=>{ await cancelRequest(r.id); await refresh(); }}>Cancel</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <p className="small" style={{marginTop:12}}>
          Next upgrade: show friend display names by fetching their profiles from the stored UIDs.
        </p>
      </div>
    </main>
  );
}

"use client";

import AuthGate, { useAuth } from "@/components/AuthGate";
import Link from "next/link";
import { useEffect, useState } from "react";
import { addPost, getThread, listPosts } from "@/lib/threads";
import { useParams } from "next/navigation";

export default function ThreadPage() {
  return (
    <main className="container">
      <Inner />
    </main>
  );
}

function Inner() {
  const { threadId } = useParams() as any;
  const { user } = useAuth();
  const [thread, setThread] = useState<any | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    const t = await getThread(String(threadId));
    setThread(t);
    if (t) {
      const ps = await listPosts(String(threadId));
      setPosts(ps);
    }
  }

  useEffect(() => { refresh(); const t=setInterval(refresh, 5000); return ()=>clearInterval(t); /* eslint-disable-next-line */ }, [threadId]);

  async function post() {
    if (!user) return;
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    setErr(null);
    try {
      await addPost(String(threadId), { authorUid: user.uid, body: text });
      setBody("");
      await refresh();
    } catch (e:any) {
      setErr(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="row" style={{ alignItems: "baseline" }}>
        <div style={{ flex: "1 1 420px" }}>
          <h1 style={{ margin: 0 }}>{thread?.title ?? "Thread"}</h1>
          <p>
            {thread?.visibility === "public" ? "Public thread." : "Friends-only thread."}
            {thread?.roomId ? <> • From room <Link href={`/rooms/${thread.roomId}`} className="kbd">{thread.roomId}</Link></> : null}
          </p>
        </div>
        <div style={{ flex: "0 0 auto" }}>
          <Link className="badge" href="/wall">← Back to Wall</Link>
        </div>
      </div>

      {err ? <p style={{ color: "tomato" }}>{err}</p> : null}

      <div className="card" style={{ marginTop: 12 }}>
        <h2 style={{ marginTop: 0 }}>Post</h2>
        <AuthGate fallback={<div className="small">Sign in to reply.</div>}>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Make your case. Cite rounds, feats, and any comic links (your legal uploads via /reader)." />
          <div className="row" style={{ marginTop: 10 }}>
            <button className="primary" onClick={post} disabled={busy}>Post</button>
            <button className="ghost" onClick={() => setBody((b) => b + (b ? "\n\n" : "") + "📚 Share a comic: paste a link like /reader?comicId=YOUR_ID so others can open it in kthoom.")}>Share comic hint</button>
            <button className="ghost" onClick={() => setBody((b) => b + (b ? "\n\n" : "") + "🧾 Cite battle: mention seed + the moment (crit, counter, momentum swing) that decided it.")}>Cite hint</button>
          </div>
        </AuthGate>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h2 style={{ marginTop: 0 }}>Replies</h2>
        {posts.length === 0 ? <div className="small">No replies yet.</div> : null}
        <div className="list">
          {posts.map((p: any) => (
            <div key={p.id} className="item">
              <div className="small">From <span className="kbd">{String(p.authorUid).slice(0, 6)}</span></div>
              <div style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>{p.body}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

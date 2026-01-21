"use client";

import AuthGate, { useAuth } from "@/components/AuthGate";
import { addComicLink, deleteComic, listMyComics, ComicVisibility } from "@/lib/comics";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function MyComicsPage() {
  return (
    <AuthGate fallback={<main className="container"><div className="card">Sign in to manage your comics.</div></main>}>
      <Inner />
    </AuthGate>
  );
}

function Inner() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [visibility, setVisibility] = useState<ComicVisibility>("friends");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [comics, setComics] = useState<any[]>([]);

  async function refresh() {
    if (!user) return;
    const items = await listMyComics(user.uid);
    setComics(items);
  }

  useEffect(() => { refresh(); }, [user]);

  async function submit() {
    setErr(null); setInfo(null);
    if (!user) return;
    setBusy(true);
    try {
      await addComicLink({ uid: user.uid, title, sourceUrl, visibility });
      setInfo("Saved! 🎉");
      setTitle("");
      setSourceUrl("");
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to save comic link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container">
      <div className="card">
        <h2 style={{ marginTop: 0 }}>My Comics</h2>
        <p className="small">
          Instead of uploading (which gets expensive fast), you add an <b>https://</b> link to a <b>.cbz</b> or <b>.cbr</b> file you host yourself.
          Then you can share the reader link with friends.
        </p>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Add a comic link</h3>
          <div className="row">
            <div>
              <label>Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="X-Men of Apocalypse (2026)" />
            </div>
            <div>
              <label>Visibility</label>
              <select value={visibility} onChange={(e) => setVisibility(e.target.value as ComicVisibility)}>
                <option value="friends">Friends</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
              <div className="small">Controls who can see this on your profile + on the Wall.</div>
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <label>Direct file URL (must end in .cbz or .cbr)</label>
            <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://example.com/my-comic.cbz" />
          </div>

          {err && <p style={{ color: "tomato" }}>{err}</p>}
          {info && <p style={{ color: "limegreen" }}>{info}</p>}

          <button className="primary" onClick={submit} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>Your library</h3>
          {comics.length === 0 ? (
            <p className="small">No comics yet.</p>
          ) : (
            <ul>
              {comics.map((c) => (
                <li key={c.id} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <b>{c.title}</b> <span className="badge">{c.visibility}</span>
                      <div className="small" style={{ opacity: 0.9 }}>{c.sourceUrl}</div>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <Link href={`/reader?comicId=${encodeURIComponent(c.id)}`} className="link">Open</Link>
                      <button onClick={async () => { if (!user) return; await deleteComic(user.uid, c.id); await refresh(); }}>
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="small" style={{ marginTop: 6 }}>
                    Share with friends: <code>/reader?comicId={c.id}</code>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>Local file reading</h3>
          <p className="small">If you’d rather not host files anywhere, open kthoom and use its built-in “Open” button to load a local CBZ/CBR.</p>
          <Link href="/reader" className="link">Open Reader</Link>
        </div>
      </div>
    </main>
  );
}

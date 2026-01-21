"use client";

import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const KTHOOM_URL = "https://codedread.github.io/kthoom/index.html";

function buildKthoomLink(sourceUrl: string) {
  const u = new URL(KTHOOM_URL);
  u.searchParams.set("bookUri", sourceUrl);
  return u.toString();
}

async function canViewComic(viewerUid: string | null, comic: any): Promise<boolean> {
  const visibility = comic.visibility as string;
  if (visibility === "public") return true;
  if (!viewerUid) return false;
  if (comic.ownerUid === viewerUid) return true;
  if (visibility === "private") return false;
  // friends
  const edge = await getDoc(doc(db, "friends", comic.ownerUid, "edges", viewerUid));
  return edge.exists();
}

export default function ReaderPage() {
  const sp = useSearchParams();
  const comicId = sp.get("comicId");
  const urlParam = sp.get("url");

  const [state, setState] = useState<{ title?: string; sourceUrl?: string; error?: string }>({});

  useEffect(() => {
    (async () => {
      setState({});

      // If a raw URL is provided, we don't need Firestore.
      if (urlParam) {
        setState({ title: "Comic", sourceUrl: urlParam });
        return;
      }

      if (!comicId) {
        setState({ title: "Reader" });
        return;
      }

      try {
        const snap = await getDoc(doc(db, "comics", comicId));
        if (!snap.exists()) throw new Error("Comic not found.");
        const comic = snap.data() as any;

        const viewerUid = auth.currentUser?.uid ?? null;
        const ok = await canViewComic(viewerUid, comic);
        if (!ok) {
          throw new Error(comic.visibility === "friends" ? "Friends-only comic. Sign in (and be friends) to view." : "Private comic.");
        }

        setState({ title: comic.title ?? "Comic", sourceUrl: comic.sourceUrl });
      } catch (e: any) {
        setState({ error: e?.message ?? "Failed to load comic." });
      }
    })();
  }, [comicId, urlParam]);

  const kthoomLink = useMemo(() => (state.sourceUrl ? buildKthoomLink(state.sourceUrl) : null), [state.sourceUrl]);

  return (
    <main className="container">
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Reader</h2>
        <p className="small">
          This app doesn’t store files. Instead, it opens CBZ/CBR links in an external reader (kthoom). You can also open local files using kthoom’s own “Open” button.
        </p>

        {state.error ? <p style={{ color: "tomato" }}>{state.error}</p> : null}

        {!comicId && !urlParam ? (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Open kthoom</h3>
            <p className="small">Use this when you want to open a comic from your device (no upload).</p>
            <a className="link" href={KTHOOM_URL} target="_blank" rel="noreferrer">Open kthoom in a new tab</a>
          </div>
        ) : null}

        {kthoomLink ? (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>{state.title}</h3>
            <div className="row" style={{ alignItems: "center" }}>
              <a className="primary" href={kthoomLink} target="_blank" rel="noreferrer">Open in kthoom</a>
              <Link className="link" href="/my-comics">Back to My Comics</Link>
            </div>
            <p className="small" style={{ marginTop: 10 }}>
              Tip: If the host blocks cross-site downloads, try hosting the file somewhere that allows direct downloads.
            </p>
          </div>
        ) : null}
      </div>
    </main>
  );
}

"use client";

import { db } from "@/lib/firebase";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGate, { useAuth } from "@/components/AuthGate";

type Profile = {
  uid: string;
  username: string;
  usernameLower: string;
  displayName: string;
  photoURL?: string | null;
  bio?: string | null;
};

type Comic = {
  id: string;
  ownerUid: string;
  title: string;
  visibility: "private" | "friends" | "public";
  storagePath: string;
  createdAt?: any;
};

export default function ProfilePage({ params }: { params: { username: string } }) {
  return (
    <AuthGate fallback={<main className="container"><div className="card">Sign in to view profiles.</div></main>}>
      <Inner usernameLower={params.username.toLowerCase()} />
    </AuthGate>
  );
}

function Inner({ usernameLower }: { usernameLower: string }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [comics, setComics] = useState<Comic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const q1 = query(collection(db, "users"), where("usernameLower", "==", usernameLower), limit(1));
      const snap = await getDocs(q1);
      const p = snap.docs[0]?.data() as Profile | undefined;
      if (!p) { setProfile(null); setLoading(false); return; }
      setProfile(p);

      const q2 = query(collection(db, "comics"), where("ownerUid","==",p.uid), limit(20));
      const s2 = await getDocs(q2);
      setComics(s2.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
      setLoading(false);
    })();
  }, [usernameLower]);

  const isMe = user && profile && user.uid === profile.uid;

  if (loading) return <main className="container"><div className="card">Loading…</div></main>;
  if (!profile) return <main className="container"><div className="card">Profile not found.</div></main>;

  return (
    <main className="container">
      <div className="card">
        <div style={{display:"flex", alignItems:"center", gap:12, flexWrap:"wrap"}}>
          {profile.photoURL ? <img src={profile.photoURL} alt="" width={64} height={64} style={{borderRadius:16, objectFit:"cover"}} /> : null}
          <div>
            <h2 style={{margin:"0 0 4px 0"}}>{profile.displayName} <span className="badge">@{profile.usernameLower}</span></h2>
            {profile.bio ? <div className="small">{profile.bio}</div> : <div className="small">No bio yet.</div>}
          </div>
        </div>

        <hr style={{margin:"16px 0"}} />

        <div className="row">
          <div className="card">
            <h3 style={{marginTop:0}}>My Comics</h3>
            <p className="small">Uploaded CBZ/CBR (legal/user-owned). Open in kthoom.</p>
            {isMe ? <p><Link href="/my-comics">Manage uploads</Link></p> : null}
            {comics.length === 0 ? <p className="small">No comics listed yet.</p> : (
              <ul>
                {comics.map(c => (
                  <li key={c.id} style={{marginBottom:6}}>
                    <b>{c.title}</b> <span className="badge">{c.visibility}</span>{" "}
                    <Link href={`/reader?comicId=${encodeURIComponent(c.id)}`}>Read</Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card">
            <h3 style={{marginTop:0}}>Debate tools</h3>
            <ul>
              <li><Link href="/battle">Start a battle</Link> (seeded logs)</li>
              <li><Link href="/discussion">Discussion</Link> (cite heroes + share reader links)</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}

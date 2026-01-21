"use client";

import { useState } from "react";
import AuthGate from "@/components/AuthGate";
import type { Hero } from "@/lib/hero";
import Link from "next/link";

export default function HeroesPage() {
  return (
    <AuthGate fallback={<main className="container"><div className="card">Sign in to search heroes.</div></main>}>
      <Inner />
    </AuthGate>
  );
}

function StatRow({ label, value }: { label: string; value: any }) {
  return <div className="small"><b>{label}:</b> {value ?? "?"}</div>;
}

function Inner() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [results, setResults] = useState<Hero[]>([]);

  async function search() {
    setErr(null);
    setBusy(true);
    try {
      const r = await fetch(`/api/superhero/search?name=${encodeURIComponent(q)}`);
      const data = await r.json();
      if (data?.response !== "success") throw new Error(data?.error ?? "Search failed");
      setResults(data.results as Hero[]);
    } catch (e: any) {
      setErr(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container">
      <div className="card">
        <h2 style={{marginTop:0}}>Hero search</h2>
        <div className="row">
          <div>
            <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search Batman, Goku, Storm…" />
          </div>
          <div style={{flex:"0 0 180px"}}>
            <button className="primary" onClick={search} disabled={busy || !q.trim()}>{busy ? "Searching…" : "Search"}</button>
          </div>
        </div>
        {err && <p style={{color:"tomato"}}>{err}</p>}
        <div style={{marginTop:12}}>
          {results.length === 0 ? <p className="small">No results yet.</p> : (
            <div className="row">
              {results.map(h => (
                <div className="card" key={h.id}>
                  <div style={{display:"flex", gap:12}}>
                    {h.image?.url ? <img src={h.image.url} alt="" width={80} height={80} style={{borderRadius:14, objectFit:"cover"}}/> : null}
                    <div>
                      <b>{h.name}</b>
                      <div className="small">ID: {h.id}</div>
                      <div className="small">
                        <Link href={`/battle?pickA=${encodeURIComponent(h.id)}`}>Battle as Team A</Link>
                      </div>
                    </div>
                  </div>
                  <hr style={{margin:"10px 0"}} />
                  <StatRow label="INT" value={h.powerstats?.intelligence} />
                  <StatRow label="STR" value={h.powerstats?.strength} />
                  <StatRow label="SPD" value={h.powerstats?.speed} />
                  <StatRow label="DUR" value={h.powerstats?.durability} />
                  <StatRow label="PWR" value={h.powerstats?.power} />
                  <StatRow label="CMB" value={h.powerstats?.combat} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

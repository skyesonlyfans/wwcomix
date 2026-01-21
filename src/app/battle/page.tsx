"use client";

import AuthGate from "@/components/AuthGate";
import type { Hero } from "@/lib/hero";
import { simulateBattle } from "@/lib/battle";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import HeroPicker from "@/components/HeroPicker";

async function fetchHero(id: string): Promise<Hero> {
  const r = await fetch(`/api/superhero/hero/${encodeURIComponent(id)}`);
  const data = await r.json();
  if (data?.response === "error") throw new Error(data?.error ?? "Failed");
  return data as Hero;
}

type Pick = { id: string; hero?: Hero };

export default function BattlePage() {
  return (
    <AuthGate fallback={<main className="container"><div className="card">Sign in to battle.</div></main>}>
      <Inner />
    </AuthGate>
  );
}

function Inner() {
  const sp = useSearchParams();
  const pickA = sp.get("pickA");

  const [mode, setMode] = useState<"1v1" | "2v2">("1v1");

  const [a1, setA1] = useState<Pick>({ id: pickA ?? "" });
  const [b1, setB1] = useState<Pick>({ id: "" });
  const [a2, setA2] = useState<Pick>({ id: "" });
  const [b2, setB2] = useState<Pick>({ id: "" });

  const [seed, setSeed] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [summary, setSummary] = useState<string>("");

  useEffect(() => {
    if (mode === "1v1") {
      setA2({ id: "" });
      setB2({ id: "" });
    }
  }, [mode]);

  // If query param provided, resolve it so picker shows a name
  useEffect(() => {
    (async () => {
      const id = pickA ?? "";
      if (!id) return;
      try {
        const h = await fetchHero(id);
        setA1({ id, hero: h });
      } catch {
        // ignore; user can search manually
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ready = useMemo(() => {
    if (!a1.id || !b1.id) return false;
    if (mode === "2v2" && (!a2.id || !b2.id)) return false;
    return true;
  }, [a1.id, b1.id, a2.id, b2.id, mode]);

  async function run() {
    setErr(null);
    setBusy(true);
    setLog([]);
    setSummary("");
    try {
      const idsA = [a1.id, ...(mode === "2v2" ? [a2.id] : [])].filter(Boolean);
      const idsB = [b1.id, ...(mode === "2v2" ? [b2.id] : [])].filter(Boolean);

      const [teamA, teamB] = await Promise.all([
        Promise.all(idsA.map(fetchHero)),
        Promise.all(idsB.map(fetchHero)),
      ]);

      const seedNum = seed.trim() ? parseInt(seed.trim(), 10) : undefined;
      const res = simulateBattle({ mode, teamA, teamB, seed: seedNum });

      setLog(res.log);
      setSummary(res.summary ?? "");
    } catch (e: any) {
      setErr(e?.message ?? "Battle failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container">
      <div className="card">
        <div className="row" style={{ alignItems: "baseline" }}>
          <div style={{ flex: "1 1 360px" }}>
            <h1 style={{ margin: 0 }}>Battle Arena</h1>
            <p>Pick heroes fast (search by name), then run a narrated fight you can argue about.</p>
          </div>
          <div style={{ flex: "0 0 auto" }}>
            <Link className="badge" href="/rooms">Want friends to pick sides? Use Rooms →</Link>
          </div>
        </div>

        <div className="grid2" style={{ marginTop: 12 }}>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Mode</h2>
            <select value={mode} onChange={(e) => setMode(e.target.value as any)}>
              <option value="1v1">1v1 Duel</option>
              <option value="2v2">2v2 Team Battle</option>
            </select>
            <div style={{ marginTop: 10 }}>
              <label>Seed (optional, reproducible)</label>
              <input value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="e.g. 12345" />
              <div className="small">Same picks + same seed = same log (perfect for debates).</div>
            </div>
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0 }}>Tips</h2>
            <div className="small">
              - Start typing a name (2+ chars) and pick from results. <br />
              - You can still browse on <Link href="/heroes">Heroes</Link> if you want deeper stats. <br />
              - For co-op battles + a shared discussion thread, create a <Link href="/rooms">Room</Link>.
            </div>
          </div>
        </div>

        <div className="grid2" style={{ marginTop: 12 }}>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Team A</h2>
            <HeroPicker label="A1" value={a1} onPick={setA1} placeholder="Search hero name…" />
            {mode === "2v2" ? <div style={{ marginTop: 10 }}><HeroPicker label="A2" value={a2} onPick={setA2} /></div> : null}
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0 }}>Team B</h2>
            <HeroPicker label="B1" value={b1} onPick={setB1} placeholder="Search hero name…" />
            {mode === "2v2" ? <div style={{ marginTop: 10 }}><HeroPicker label="B2" value={b2} onPick={setB2} /></div> : null}
          </div>
        </div>

        {err ? <p style={{ color: "tomato" }}>{err}</p> : null}

        <div className="row" style={{ marginTop: 12 }}>
          <button className="primary" onClick={run} disabled={busy || !ready}>
            {busy ? "Fighting…" : ready ? "Run battle" : "Pick heroes to start"}
          </button>
          <Link className="badge" href="/wall">See public/friends threads on the Wall →</Link>
        </div>

        <hr className="hr" />

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Battle Log</h2>
          {summary ? <div className="item"><b>Result:</b> {summary}</div> : null}
          {log.length === 0 ? (
            <div className="small">No fight yet. Pick your lineup and hit Run.</div>
          ) : (
            <div className="list">
              {log.map((l, i) => (
                <div key={i} className="item">{l}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

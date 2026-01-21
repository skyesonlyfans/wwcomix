"use client";

import type { Hero } from "@/lib/hero";
import { useEffect, useMemo, useRef, useState } from "react";

type Pick = { id: string; hero?: Hero };

export default function HeroPicker({
  label,
  value,
  onPick,
  placeholder,
}: {
  label: string;
  value: Pick;
  onPick: (p: Pick) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState(value.hero?.name ?? "");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [results, setResults] = useState<Hero[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as any)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    setQ(value.hero?.name ?? (value.id ? `#${value.id}` : ""));
  }, [value.id, value.hero?.name]);

  const canSearch = useMemo(() => q.trim().length >= 2, [q]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!open) return;
      if (!canSearch) {
        setResults([]);
        setErr(null);
        return;
      }
      setBusy(true);
      setErr(null);
      try {
        const r = await fetch(`/api/superhero/search?name=${encodeURIComponent(q.trim())}`);
        const data = await r.json();
        if (data?.response !== "success") throw new Error(data?.error ?? "Search failed");
        const arr = (data.results ?? []) as Hero[];
        if (!cancelled) setResults(arr.slice(0, 12));
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Failed");
      } finally {
        if (!cancelled) setBusy(false);
      }
    }

    const t = setTimeout(run, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, open, canSearch]);

  function pickHero(h: Hero) {
    onPick({ id: String((h as any).id ?? ""), hero: h });
    setQ(h.name);
    setOpen(false);
  }

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <label>{label}</label>
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder ?? "Type a hero name (e.g. Batman)"}
        aria-autocomplete="list"
        aria-expanded={open}
      />
      <div className="small">
        {value.id ? <>Selected ID: <span className="kbd">{value.id}</span></> : "Search and pick a hero."}
      </div>

      {open ? (
        <div className="dropdown" role="listbox" aria-label="Hero search results">
          <div style={{ padding: "10px 12px" }} className="small">
            {busy ? "Searching…" : err ? err : canSearch ? "Pick a hero" : "Type 2+ characters to search"}
          </div>
          {results.map((h) => (
            <button key={(h as any).id ?? h.name} type="button" onClick={() => pickHero(h)}>
              <b>{h.name}</b>
              <div className="small">
                {(h.biography as any)?.publisher ? `${(h.biography as any).publisher} • ` : ""}
                ID {(h as any).id}
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

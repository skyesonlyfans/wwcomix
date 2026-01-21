export type Powerstats = {
  intelligence?: string | number | null;
  strength?: string | number | null;
  speed?: string | number | null;
  durability?: string | number | null;
  power?: string | number | null;
  combat?: string | number | null;
};

export type Hero = {
  id: string;
  name: string;
  powerstats: Powerstats;
  biography?: any;
  appearance?: any;
  work?: any;
  connections?: any;
  image?: { url?: string };
};

export function toStat(n: any, fallback = 50) {
  const v = typeof n === "string" ? parseInt(n, 10) : typeof n === "number" ? n : NaN;
  if (!Number.isFinite(v)) return fallback;
  return Math.max(0, Math.min(100, v));
}

export function heroCore(h: Hero) {
  const ps = h.powerstats ?? {};
  const intel = toStat(ps.intelligence);
  const str = toStat(ps.strength);
  const spd = toStat(ps.speed);
  const dur = toStat(ps.durability);
  const pow = toStat(ps.power);
  const cmb = toStat(ps.combat);

  const hp = 120 + dur * 2;
  const atk = str + pow * 0.6 + cmb * 0.25;
  const def = dur + cmb * 0.5 + intel * 0.15;
  const init = spd + intel * 0.25;

  return { intel, str, spd, dur, pow, cmb, hp, atk, def, init };
}

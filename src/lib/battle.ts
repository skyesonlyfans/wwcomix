import type { Hero } from "@/lib/hero";
import { heroCore } from "@/lib/hero";

type RNG = () => number;

function mulberry32(seed: number): RNG {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

function pick<T>(rng: RNG, arr: T[]) { return arr[Math.floor(rng() * arr.length)]!; }

const verbs = ["slams","blitzes","outplays","feints","counters","snaps back with","tags","pressures","ambushes","clips"];
const flair = ["🔥","⚡","💥","🛡️","🧠","🗯️","🌪️","👊","✨","🩸"];
const taunts = [
  "The crowd goes feral.",
  "That one’s going on the highlight reel.",
  "Somebody check the multiverse rulebook.",
  "This is why power-scaling is a blood sport.",
];

function dmgRoll(rng: RNG) { return 0.85 + rng() * 0.35; }
function critChance(intel: number, spd: number) { return Math.min(0.30, (intel + spd) / 1000); }
function momentumDelta(rng: RNG) { return rng() < 0.18 ? (rng() < 0.5 ? -8 : 8) : 0; }

export type BattleMode = "1v1" | "2v2";
export type BattleResult = {
  seed: number;
  mode: BattleMode;
  winner: "A" | "B";
  rounds: number;
  summary: string;
  log: string[];
  finalHP: { A: number[]; B: number[] };
};

type Fighter = { hero: Hero; hp: number; atk: number; def: number; init: number; intel: number; spd: number; dur: number; cmb: number; pow: number; };

function fighterFromHero(hero: Hero): Fighter {
  const c = heroCore(hero);
  return { hero, hp: c.hp, atk: c.atk, def: c.def, init: c.init, intel: c.intel, spd: c.spd, dur: c.dur, cmb: c.cmb, pow: c.pow };
}

function alive(fs: Fighter[]) { return fs.filter(f => f.hp > 0); }

function targetPick(rng: RNG, enemies: Fighter[]) {
  const living = alive(enemies);
  if (living.length === 0) return null;
  if (rng() < 0.5) return living.sort((a,b)=>a.hp-b.hp)[0]!;
  return pick(rng, living);
}

function attackLine(rng: RNG, a: Fighter, t: Fighter, isCrit: boolean, dmg: number, momentum: number) {
  const v = pick(rng, verbs);
  const f = pick(rng, flair);
  const spice = momentum !== 0 ? ` ⚡ Momentum ${momentum > 0 ? "surge" : "dip"}!` : "";
  const crit = isCrit ? " 💥 **CRIT!**" : "";
  return `${f} **${a.hero.name}** ${v} **${t.hero.name}** for **${Math.round(dmg)}** damage.${crit}${spice}`;
}

export function simulateBattle(opts: {
  mode: BattleMode;
  teamA: Hero[];
  teamB: Hero[];
  seed?: number;
  maxRounds?: number;
}): BattleResult {
  const seed = opts.seed ?? Math.floor(Math.random() * 1e9);
  const rng = mulberry32(seed);
  const maxRounds = opts.maxRounds ?? 20;

  const A = opts.teamA.map(fighterFromHero);
  const B = opts.teamB.map(fighterFromHero);

  const log: string[] = [];
  log.push(`🎬 **CROSS-UNIVERSE SHOWDOWN** — Seed \`${seed}\``);
  log.push(`🅰️ Team A: ${A.map(x=>x.hero.name).join(", ")}`);
  log.push(`🅱️ Team B: ${B.map(x=>x.hero.name).join(", ")}`);
  log.push(pick(rng, taunts));

  let momentum = 0;

  for (let round = 1; round <= maxRounds; round++) {
    if (alive(A).length === 0 || alive(B).length === 0) break;

    log.push(`\n### Round ${round}`);
    momentum += momentumDelta(rng);

    const order = [...alive(A).map(f=>({side:"A" as const, f})), ...alive(B).map(f=>({side:"B" as const, f}))]
      .sort((x,y) => (y.f.init - x.f.init) + (rng() - 0.5) * 5);

    for (const turn of order) {
      const enemy = turn.side === "A" ? B : A;
      const attacker = turn.f;
      if (attacker.hp <= 0) continue;

      const t = targetPick(rng, enemy);
      if (!t) break;

      const base = Math.max(4, attacker.atk - t.def * 0.55);
      const crit = rng() < critChance(attacker.intel, attacker.spd);
      const swing = 1 + (momentum / 60);
      const dmg = base * dmgRoll(rng) * swing * (crit ? 1.6 : 1.0);

      t.hp = Math.max(0, t.hp - dmg);
      log.push(attackLine(rng, attacker, t, crit, dmg, momentum));

      if (t.hp <= 0) {
        log.push(`☠️ **${t.hero.name}** drops!`);
        momentum += turn.side === "A" ? 6 : -6;
      }

      if (alive(enemy).length === 0) break;
    }
  }

  const aAlive = alive(A).length;
  const bAlive = alive(B).length;

  let winner: "A" | "B" = aAlive === bAlive ? (A.reduce((s,f)=>s+f.hp,0) >= B.reduce((s,f)=>s+f.hp,0) ? "A":"B") : (aAlive > bAlive ? "A":"B");

  log.push(`\n## Result`);
  log.push(winner === "A" ? `🏆 **Team A wins** — ${A.map(x=>x.hero.name).join(", ")}` : `🏆 **Team B wins** — ${B.map(x=>x.hero.name).join(", ")}`);
  log.push(`Final HP — A: ${A.map(x=>Math.round(x.hp)).join(" / ")} | B: ${B.map(x=>Math.round(x.hp)).join(" / ")}`);

  return { seed, mode: opts.mode, winner, rounds: log.filter(x=>x.startsWith("### Round")).length, log, finalHP: { A: A.map(x=>x.hp), B: B.map(x=>x.hp) } };
}

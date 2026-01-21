import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const name = url.searchParams.get("name")?.trim();
  if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });

  const token = process.env.SUPERHERO_API_TOKEN;
  if (!token) return NextResponse.json({ error: "Server missing SUPERHERO_API_TOKEN" }, { status: 500 });

  const upstream = `https://superheroapi.com/api/${token}/search/${encodeURIComponent(name)}`;
  const r = await fetch(upstream, { cache: "no-store" });
  const data = await r.json();
  return NextResponse.json(data, { status: r.status });
}

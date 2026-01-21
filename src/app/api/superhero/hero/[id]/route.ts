import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const token = process.env.SUPERHERO_API_TOKEN;
  if (!token) return NextResponse.json({ error: "Server missing SUPERHERO_API_TOKEN" }, { status: 500 });

  const upstream = `https://superheroapi.com/api/${token}/${encodeURIComponent(params.id)}`;
  const r = await fetch(upstream, { cache: "no-store" });
  const data = await r.json();
  return NextResponse.json(data, { status: r.status });
}

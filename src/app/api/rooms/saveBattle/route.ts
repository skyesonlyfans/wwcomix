import { NextResponse } from "next/server";
import { requireUserUidFromAuthHeader } from "@/lib/firebaseAdmin";
import { getAdminDb } from "@/lib/firestoreAdmin";

export async function POST(req: Request) {
  try {
    const uid = await requireUserUidFromAuthHeader(req);
    const body = await req.json();
    const roomId = String(body.roomId || "");
    const battle = body.battle;
    if (!roomId) return NextResponse.json({ error: "Missing roomId" }, { status: 400 });

    const db = getAdminDb();
    const ref = db.collection("rooms").doc(roomId);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const room = snap.data() as any;
    const participants = room.participants ?? [];
    if (!participants.includes(uid)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

    await ref.update({
      battle,
      status: "done",
      updatedAt: new Date(),
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 400 });
  }
}

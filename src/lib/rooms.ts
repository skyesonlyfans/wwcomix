"use client";

import { db } from "@/lib/firebase";
import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { uidByUsername } from "@/lib/friends";

export type RoomMode = "1v1" | "2v2";
export type RoomVisibility = "public" | "friends";

export type Room = {
  createdBy: string;
  mode: RoomMode;
  visibility: RoomVisibility;
  title: string;
  participants: string[];
  teamA: { uids: string[]; picks: string[] }; // heroIds
  teamB: { uids: string[]; picks: string[] };
  status: "lobby" | "ready" | "done";
  threadId?: string;
  battle?: any;
  createdAt?: any;
  updatedAt?: any;
};

export type RoomInvite = {
  fromUid: string;
  toUid: string;
  side: "A" | "B";
  status: "pending" | "accepted" | "declined" | "canceled";
  createdAt?: any;
  updatedAt?: any;
};

export async function createRoom(opts: {
  createdBy: string;
  mode: RoomMode;
  visibility: RoomVisibility;
  title?: string;
}) {
  const title = opts.title?.trim() || (opts.mode === "1v1" ? "Co-op Duel Room" : "2v2 Team Room");
  const room: Omit<Room, "createdAt" | "updatedAt"> = {
    createdBy: opts.createdBy,
    mode: opts.mode,
    visibility: opts.visibility,
    title,
    participants: [opts.createdBy],
    teamA: { uids: [opts.createdBy], picks: opts.mode === "1v1" ? [""] : ["", ""] },
    teamB: { uids: [], picks: opts.mode === "1v1" ? [""] : ["", ""] },
    status: "lobby",
  };
  const ref = await addDoc(collection(db, "rooms"), { ...room, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}

export async function getRoom(roomId: string) {
  const snap = await getDoc(doc(db, "rooms", roomId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) };
}

export async function listRoomsForUser(uid: string) {
  const q1 = query(collection(db, "rooms"), where("participants", "array-contains", uid));
  const snap = await getDocs(q1);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function listIncomingInvites(uid: string) {
  // Query collectionGroup would be nicer; we keep a top-level collection for simple querying:
  const q1 = query(collection(db, "roomInvites"), where("toUid", "==", uid), where("status", "==", "pending"));
  const snap = await getDocs(q1);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function sendRoomInvite(opts: {
  roomId: string;
  fromUid: string;
  toUsername: string;
  side: "A" | "B";
}) {
  const uname = opts.toUsername.trim().replace(/^@/, "").toLowerCase();
  const toUid = await uidByUsername(uname);
  if (!toUid) throw new Error("User not found.");
  if (toUid === opts.fromUid) throw new Error("You can’t invite yourself.");

  const inv: Omit<RoomInvite, "createdAt" | "updatedAt"> & { roomId: string } = {
    roomId: opts.roomId,
    fromUid: opts.fromUid,
    toUid,
    side: opts.side,
    status: "pending",
  };

  const invRef = await addDoc(collection(db, "roomInvites"), { ...inv, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return invRef.id;
}

export async function respondInvite(inviteId: string, status: "accepted" | "declined" | "canceled") {
  const invRef = doc(db, "roomInvites", inviteId);
  const snap = await getDoc(invRef);
  if (!snap.exists()) throw new Error("Invite missing.");
  const inv = snap.data() as any;
  await updateDoc(invRef, { status, updatedAt: serverTimestamp() });

  if (status !== "accepted") return;

  const roomRef = doc(db, "rooms", inv.roomId);
  const roomSnap = await getDoc(roomRef);
  if (!roomSnap.exists()) throw new Error("Room missing.");
  const room = roomSnap.data() as any as Room;

  // Add participant
  const participants = new Set<string>(room.participants ?? []);
  participants.add(inv.toUid);

  // Attach to team slot
  const side = inv.side as "A" | "B";
  const teamKey = side === "A" ? "teamA" : "teamB";
  const team = (room as any)[teamKey] as any;
  const uids: string[] = team?.uids ?? [];
  if (!uids.includes(inv.toUid)) {
    // cap by mode
    const cap = room.mode === "1v1" ? 1 : 2;
    if (uids.length >= cap) throw new Error(`Team ${side} is full.`);
    uids.push(inv.toUid);
  }

  await updateDoc(roomRef, {
    participants: Array.from(participants),
    [teamKey]: { ...team, uids },
    updatedAt: serverTimestamp(),
  });

  // If this room already has a friends-only thread, add the new participant to the allowlist.
  if (room.visibility === "friends" && room.threadId) {
    await updateDoc(doc(db, "threads", room.threadId), { allowedUids: arrayUnion(inv.toUid) });
  }
}

export async function setPick(opts: {
  roomId: string;
  side: "A" | "B";
  slot: number; // 0..1
  heroId: string;
}) {
  const roomRef = doc(db, "rooms", opts.roomId);
  const snap = await getDoc(roomRef);
  if (!snap.exists()) throw new Error("Room missing.");
  const room = snap.data() as any as Room;
  const teamKey = opts.side === "A" ? "teamA" : "teamB";
  const team = (room as any)[teamKey] as any;
  const picks: string[] = Array.isArray(team.picks) ? [...team.picks] : [];
  picks[opts.slot] = opts.heroId;

  const newTeam = { ...team, picks };
  const ready = isRoomReady({ ...room, [teamKey]: newTeam } as any);

  await updateDoc(roomRef, {
    [teamKey]: newTeam,
    status: ready ? "ready" : "lobby",
    updatedAt: serverTimestamp(),
  });
}

export function isRoomReady(room: Room) {
  const need = room.mode === "1v1" ? 1 : 2;
  const filled = (t: any) => (t?.uids?.length ?? 0) === need && (t?.picks ?? []).slice(0, need).every((x: string) => !!x);
  return filled(room.teamA) && filled(room.teamB);
}

export async function attachThread(roomId: string, threadId: string) {
  await updateDoc(doc(db, "rooms", roomId), { threadId, updatedAt: serverTimestamp() });
}

"use client";

import { db } from "@/lib/firebase";
import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";

export type FriendRequest = {
  fromUid: string;
  toUid: string;
  status: "pending" | "accepted" | "declined" | "canceled";
  createdAt?: any;
  updatedAt?: any;
};

export async function uidByUsername(usernameLower: string): Promise<string | null> {
  const snap = await getDoc(doc(db, "usernames", usernameLower));
  return snap.exists() ? (snap.data() as any).uid : null;
}

export async function sendFriendRequest(fromUid: string, toUid: string) {
  if (fromUid === toUid) throw new Error("You can’t friend yourself.");
  const ref = await addDoc(collection(db, "friendRequests"), {
    fromUid, toUid, status: "pending", createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  } satisfies FriendRequest);
  return ref.id;
}

export async function listIncoming(uid: string) {
  const q = query(collection(db, "friendRequests"), where("toUid","==",uid), where("status","==","pending"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as FriendRequest) }));
}

export async function listOutgoing(uid: string) {
  const q = query(collection(db, "friendRequests"), where("fromUid","==",uid), where("status","==","pending"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as FriendRequest) }));
}

export async function acceptRequest(requestId: string) {
  const reqRef = doc(db, "friendRequests", requestId);
  const snap = await getDoc(reqRef);
  if (!snap.exists()) throw new Error("Request not found.");
  const r = snap.data() as FriendRequest;
  if (r.status !== "pending") throw new Error("Request not pending.");

  await updateDoc(reqRef, { status:"accepted", updatedAt: serverTimestamp() });

  await setDoc(doc(db, "friends", r.fromUid, "edges", r.toUid), { friendUid: r.toUid, createdAt: serverTimestamp() });
  await setDoc(doc(db, "friends", r.toUid, "edges", r.fromUid), { friendUid: r.fromUid, createdAt: serverTimestamp() });
}

export async function declineRequest(requestId: string) {
  await updateDoc(doc(db,"friendRequests",requestId), { status:"declined", updatedAt: serverTimestamp() });
}

export async function cancelRequest(requestId: string) {
  await updateDoc(doc(db,"friendRequests",requestId), { status:"canceled", updatedAt: serverTimestamp() });
}

export async function listFriends(uid: string): Promise<string[]> {
  const snap = await getDocs(collection(db, "friends", uid, "edges"));
  return snap.docs.map(d => (d.data() as any).friendUid as string).filter(Boolean);
}

export async function getUserPublicProfile(uid: string) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? ({ uid, ...(snap.data() as any) }) : null;
}

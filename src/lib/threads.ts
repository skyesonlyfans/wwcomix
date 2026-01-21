"use client";

import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

export type ThreadVisibility = "public" | "friends";

export type Thread = {
  title: string;
  visibility: ThreadVisibility;
  createdBy: string;
  allowedUids?: string[]; // for 'friends' visibility we use this as an allowlist
  roomId?: string;
  battleSummary?: string;
  createdAt?: any;
  lastPostAt?: any;
};

export type Post = {
  authorUid: string;
  body: string;
  createdAt?: any;
};

export async function createThread(t: Omit<Thread, "createdAt" | "lastPostAt">) {
  const ref = await addDoc(collection(db, "threads"), {
    ...t,
    createdAt: serverTimestamp(),
    lastPostAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getThread(threadId: string) {
  const snap = await getDoc(doc(db, "threads", threadId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) } as any;
}

export async function listWallThreads(uid?: string) {
  // Public threads
  const pubQ = query(collection(db, "threads"), where("visibility", "==", "public"), orderBy("lastPostAt", "desc"), limit(30));
  const pubSnap = await getDocs(pubQ);
  const pub = pubSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

  if (!uid) return pub;

  // Friends-only threads (allowedUids contains you)
  const frQ = query(collection(db, "threads"), where("visibility", "==", "friends"), where("allowedUids", "array-contains", uid), orderBy("lastPostAt", "desc"), limit(30));
  const frSnap = await getDocs(frQ);
  const fr = frSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

  const map = new Map<string, any>();
  for (const t of [...pub, ...fr]) map.set(t.id, t);
  return Array.from(map.values()).sort((a, b) => (b.lastPostAt?.seconds ?? 0) - (a.lastPostAt?.seconds ?? 0));
}

export async function listPosts(threadId: string) {
  const q1 = query(collection(db, "threads", threadId, "posts"), orderBy("createdAt", "asc"), limit(200));
  const snap = await getDocs(q1);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function addPost(threadId: string, p: Omit<Post, "createdAt">) {
  await addDoc(collection(db, "threads", threadId, "posts"), { ...p, createdAt: serverTimestamp() });
  await updateDoc(doc(db, "threads", threadId), { lastPostAt: serverTimestamp() });
}

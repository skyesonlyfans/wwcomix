"use client";

import { db } from "@/lib/firebase";
import { addDoc, collection, getDocs, orderBy, query, serverTimestamp, where } from "firebase/firestore";

export type Post = {
  authorUid: string;
  threadKey: string;
  body: string;
  createdAt?: any;
};

export async function listPosts(threadKey: string) {
  const q1 = query(collection(db, "posts"), where("threadKey","==",threadKey), orderBy("createdAt","asc"));
  const snap = await getDocs(q1);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
}

export async function addPost(p: Post) {
  await addDoc(collection(db, "posts"), { ...p, createdAt: serverTimestamp() });
}

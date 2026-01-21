"use client";

import { auth, db } from "@/lib/firebase";
import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, where } from "firebase/firestore";

export type ComicVisibility = "private" | "friends" | "public";

export type ComicLink = {
  id: string;
  ownerUid: string;
  title: string;
  visibility: ComicVisibility;
  sourceUrl: string;
  createdAt?: any;
};

function isValidComicUrl(url: string) {
  try {
    const u = new URL(url);
    const p = u.pathname.toLowerCase();
    return u.protocol === "https:" && (p.endsWith(".cbz") || p.endsWith(".cbr"));
  } catch {
    return false;
  }
}

/**
 * Adds a comic *link* (no upload). Users can host CBZ/CBR wherever they like.
 */
export async function addComicLink(args: {
  uid: string;
  title: string;
  sourceUrl: string;
  visibility: ComicVisibility;
}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in first.");
  if (user.uid !== args.uid) throw new Error("Auth mismatch.");

  const url = args.sourceUrl.trim();
  if (!isValidComicUrl(url)) {
    throw new Error("Please paste an https:// link that ends with .cbz or .cbr");
  }
  const title = args.title.trim();
  if (!title) throw new Error("Title is required.");

  const ref = await addDoc(collection(db, "comics"), {
    ownerUid: args.uid,
    title,
    visibility: args.visibility,
    sourceUrl: url,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listMyComics(uid: string): Promise<ComicLink[]> {
  const q = query(collection(db, "comics"), where("ownerUid", "==", uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
}

export async function deleteComic(uid: string, comicId: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in first.");
  if (user.uid !== uid) throw new Error("Auth mismatch.");
  await deleteDoc(doc(db, "comics", comicId));
}

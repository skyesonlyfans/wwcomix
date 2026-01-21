"use client";

import { db } from "@/lib/firebase";
import { doc, getDoc, runTransaction, serverTimestamp, updateDoc } from "firebase/firestore";

export type UserProfile = {
  uid: string;
  username: string;
  usernameLower: string;
  displayName: string;
  photoURL?: string | null;
  bio?: string | null;
  createdAt?: any;
  updatedAt?: any;
};

export async function getProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function reserveUsernameAndCreateProfile(args: {
  uid: string;
  username: string;
  usernameLower: string;
  displayName: string;
  photoURL?: string | null;
  bio?: string | null;
}) {
  const usernameRef = doc(db, "usernames", args.usernameLower);
  const userRef = doc(db, "users", args.uid);

  await runTransaction(db, async (tx) => {
    const uSnap = await tx.get(usernameRef);
    if (uSnap.exists()) throw new Error("Username already taken.");
    tx.set(usernameRef, { uid: args.uid, createdAt: serverTimestamp() });
    tx.set(userRef, {
      uid: args.uid,
      username: args.username,
      usernameLower: args.usernameLower,
      displayName: args.displayName,
      photoURL: args.photoURL ?? null,
      bio: args.bio ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function updateProfile(uid: string, patch: Partial<UserProfile>) {
  await updateDoc(doc(db, "users", uid), { ...patch, updatedAt: serverTimestamp() });
}

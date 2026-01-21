"use client";
import Link from "next/link";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import { useAuth } from "@/components/AuthGate";

export default function Nav() {
  const { user } = useAuth();
  return (
    <header className="navbar">
      <div className="container">
        <div className="navbar-inner">
          <div className="nav-links">
            <Link href="/" className="logo" aria-label="Home">
              <span className="brand">who-wins comix</span>
              <span className="byline">By Skye &lt;3</span>
            </Link>
            <span className="badge">1v1 + 2v2</span>
            <Link href="/heroes">Heroes</Link>
            <Link href="/battle">Battle</Link>
            <Link href="/rooms">Rooms</Link>
            <Link href="/wall">Wall</Link>
            <Link href="/friends">Friends</Link>
          </div>
          <div className="nav-actions">
            {user ? (
              <>
                <span className="badge" title={user.email ?? undefined}>{user.displayName ?? "Signed in"}</span>
                <button className="ghost" onClick={() => signOut(auth)}>Sign out</button>
              </>
            ) : (
              <button className="primary" onClick={() => signInWithPopup(auth, googleProvider)}>Sign in with Google</button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

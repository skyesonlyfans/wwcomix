import Link from "next/link";

export default function HomePage() {
  return (
    <main className="container">
      <div className="card">
        <h1 style={{marginTop:0}}>who-wins comix by Skye &lt;3</h1>
        <p>
          Sign in, pick a unique username, add friends, upload CBZ/CBR you legally own, read in kthoom, and settle arguments with
          reproducible, hype battle logs.
        </p>
        <div className="row">
          <div className="card">
            <h3 style={{marginTop:0}}>Start</h3>
            <ol>
              <li>Sign in with Google</li>
              <li>Complete onboarding (unique username)</li>
              <li>Search heroes and run 1v1 or 2v2 battles</li>
              <li>Upload comics to My Comics, share reader links in discussion</li>
            </ol>
            <p className="small">Battles are seeded so you can re-run the exact same fight for debate.</p>
          </div>
          <div className="card">
            <h3 style={{marginTop:0}}>Links</h3>
            <ul>
              <li><Link href="/heroes">Hero search & compare</Link></li>
              <li><Link href="/battle">Battle arena</Link></li>
              <li><Link href="/friends">Friends</Link></li>
              <li><Link href="/my-comics">My Comics</Link></li>
              <li><Link href="/discussion">Discussion</Link></li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}

# who-wins comix by Skye <3

Cross-universe superhero debates + **legal** comic reading with kthoom.

## Features
- Google sign-in (Firebase Auth)
- Onboarding that reserves a **unique username**
- Profiles + optional profile picture (uses Google photo by default; you can change it later)
- Add friends by username (requests + accept)
- Hero search (SuperHero API via server proxy)
- Battles with hype, reproducible play-by-play logs (**1v1 + 2v2**)
- Upload CBZ/CBR you legally own to Backblaze B2 (S3-compatible) via presigned URLs
- Read uploads (or local files) in kthoom via `/reader`
- Discussion threads with “citations” helpers (battle seed, hero facts, reader link)

## Tech
- Next.js (App Router) + TypeScript
- Firebase Auth + Firestore
- Backblaze B2 (S3-compatible) for file uploads
- SuperHero API server proxy routes:
  - `/api/superhero/search?name=...`
  - `/api/superhero/hero/:id`

---

## 1) Local setup

### Prereqs
- Node 18+

### Install
```bash
npm install
cp .env.example .env.local
```

### Environment variables
Edit `.env.local`:
- `SUPERHERO_API_TOKEN` = your token (server-only)
- `NEXT_PUBLIC_APP_URL` = `http://localhost:3000` (local) or your Vercel URL (optional)

### Run
```bash
npm run dev
```

---

## 2) Firebase setup (free tier friendly)

Your Firebase web config is embedded in `src/lib/firebase.ts` (this is OK—web config is public).

### Enable services
In Firebase console:
1. **Authentication** → enable **Google**
2. **Firestore Database** → create database
3. (Optional) **Storage** → you do NOT need Firebase Storage for this repo

### Deploy rules (recommended)
Install Firebase CLI:
```bash
npm i -g firebase-tools
firebase login
firebase use who-wins-comix
```

Deploy Firestore rules:
```bash
firebase deploy --only firestore:rules
```

#### Free tier notes
- This app enforces a **50MB upload cap** in the UI (change in `src/lib/comics.ts`).
- Backblaze B2 offers a free tier and an S3-compatible API. citeturn0search5turn0search12

---

## 3) Backblaze B2 setup

### Create a B2 bucket + app key
You already have:
- Bucket: `who-wins-comix`
- Endpoint: `https://s3.us-east-005.backblazeb2.com`

Put these in `.env.local` (and in Vercel env vars):
- `B2_ENDPOINT`
- `B2_BUCKET`
- `B2_KEY_ID`
- `B2_APPLICATION_KEY`

This repo uses the S3-compatible API with path-style addressing. citeturn0search2turn0search5

## 4) Firebase Admin token verification (required for uploads)
Uploads use server routes that require a Firebase ID token.

Create a service account key in Firebase Console → Project Settings → Service accounts.
Set env var:
- `FIREBASE_ADMIN_SERVICE_ACCOUNT` = the service account JSON as a **single-line** string.

## 5) Vercel deployment

1. Push to GitHub
2. Import repo into Vercel
3. Set env var in Vercel Project Settings:
   - `SUPERHERO_API_TOKEN` = `2cd0bf06d80dd6544c36cc43585ae38e`
   - `B2_ENDPOINT`, `B2_BUCKET`, `B2_KEY_ID`, `B2_APPLICATION_KEY`
   - `FIREBASE_ADMIN_SERVICE_ACCOUNT`

Deploy.

---

## 6) Using the reader (kthoom)

- Upload comics in **My Comics**
- Open: `/reader?comicId=<id>`
- For local files: open `/reader` with no `comicId` and use kthoom’s **Open** button.

kthoom is loaded from `https://codedread.github.io/kthoom/index.html` in an iframe.

---

## Data model (high-level)
- `users/{uid}`
- `usernames/{usernameLower}`
- `friendRequests/{id}`
- `friends/{uid}/edges/{friendUid}`
- `comics/{comicId}`
- `posts/{postId}` with `threadKey`

---

## Notes on “exciting” battles (not just numbers)
The battle engine:
- uses seeded RNG (replayable arguments)
- generates cinematic narration (momentum swings, crits, knockouts)
- favors dramatic beats (low-HP targeting sometimes, initiative order, momentum drift)

See `src/lib/battle.ts`.

---

## Next upgrades (planned)
- 1v1 gauntlet and 4v4 team battles
- Better friend-only access to comics with signed URLs + tighter rules
- Rich citations: embed hero cards + battle replay links

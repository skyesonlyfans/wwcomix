export function normalizeUsername(input: string) {
  const raw = input.trim().replace(/^@/, "");
  const lower = raw.toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(lower)) {
    return { ok: false as const, error: "Use 3–20 chars: a-z, 0-9, underscore." };
  }
  return { ok: true as const, username: raw, usernameLower: lower };
}

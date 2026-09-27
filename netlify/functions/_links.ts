// Single-use onboarding links (Supabase table onboarding_links, De Club
// General project). A link carries a custom agreement variant and dies on
// its first submission: claim() flips used_at atomically, so two submits
// racing on the same link cannot both win.

const TIMEOUT_MS = 10_000;

function env() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("supabase not configured");
  return { url, key };
}

async function rest(path: string, init: RequestInit = {}): Promise<unknown[]> {
  const { url, key } = env();
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`supabase ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as unknown[];
}

const enc = encodeURIComponent;

export async function isOpen(slug: string): Promise<boolean> {
  const rows = await rest(`onboarding_links?slug=eq.${enc(slug)}&used_at=is.null&select=slug`);
  return rows.length === 1;
}

// true when this submission now owns the link; false when it was already used
// (or never existed).
export async function claim(slug: string, submissionId: string): Promise<boolean> {
  const rows = await rest(`onboarding_links?slug=eq.${enc(slug)}&used_at=is.null`, {
    method: "PATCH",
    body: JSON.stringify({ used_at: new Date().toISOString(), submission_id: submissionId }),
  });
  return rows.length === 1;
}

// Undo a claim when the submission never reached Trigger.dev, so the teacher
// can try again on the same link.
export async function release(slug: string, submissionId: string): Promise<void> {
  await rest(`onboarding_links?slug=eq.${enc(slug)}&submission_id=eq.${enc(submissionId)}`, {
    method: "PATCH",
    body: JSON.stringify({ used_at: null, submission_id: null }),
  });
}

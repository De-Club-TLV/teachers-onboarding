import { isOpen } from "./_links";

// GET /.netlify/functions/link-status?slug=hagai -> { open: boolean }
// Lets /<slug> show "this link has been used" before the teacher fills the form.

interface NetlifyEvent {
  httpMethod?: string;
  queryStringParameters?: Record<string, string | undefined> | null;
}

export async function handler(event: NetlifyEvent) {
  const slug = (event.queryStringParameters?.slug ?? "").toLowerCase();
  if (!/^[a-z0-9-]{1,40}$/.test(slug)) {
    return { statusCode: 400, headers: { "content-type": "application/json" }, body: '{"error":"bad slug"}' };
  }
  try {
    const open = await isOpen(slug);
    return {
      statusCode: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
      body: JSON.stringify({ open }),
    };
  } catch {
    // Fail open on the check: submit still enforces the single use.
    return { statusCode: 503, headers: { "content-type": "application/json" }, body: '{"error":"unavailable"}' };
  }
}

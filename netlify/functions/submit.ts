import { createHmac, timingSafeEqual } from "node:crypto";

// Netlify Function: receive a teacher onboarding submission (JSON body with
// base64 data URLs for files), HMAC-verify, and forward to the Trigger.dev
// `teacher-intake` task. Keep logic thin — the heavy lifting (validation,
// storage uploads, PDF render, Drive upload, Monday create) lives in the task.

const TRIGGER_API = "https://api.trigger.dev/api/v1/tasks/teacher-intake/trigger";

interface NetlifyEvent {
  httpMethod?: string;
  headers: Record<string, string | undefined>;
  body: string | null;
  isBase64Encoded?: boolean;
}

interface NetlifyResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body?: string;
}

function json(statusCode: number, body: unknown): NetlifyResponse {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

function canonicalJson(obj: unknown): string {
  // Stable, minified JSON used for HMAC. The browser signer must produce the
  // exact same bytes. Sort object keys recursively.
  return JSON.stringify(sortKeys(obj));
}

function sortKeys(val: unknown): unknown {
  if (Array.isArray(val)) return val.map(sortKeys);
  if (val && typeof val === "object") {
    const src = val as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(src).sort()) out[k] = sortKeys(src[k]);
    return out;
  }
  return val;
}

function hmacHex(secret: string, message: string): string {
  return createHmac("sha256", secret).update(message).digest("hex");
}

function constantTimeEquals(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "method not allowed" });
  }

  const secret = process.env.TEACHERS_HMAC_SECRET;
  const triggerKey = process.env.TRIGGER_PROD_SECRET_KEY;
  if (!secret || !triggerKey) {
    return json(500, { error: "server not configured" });
  }

  const rawBody = event.body ?? "";
  if (!rawBody) return json(400, { error: "empty body" });

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json(400, { error: "invalid JSON" });
  }

  // Verify HMAC. Browser signs canonicalJson(payload).
  const providedSig =
    event.headers["x-webhook-signature"] ??
    event.headers["X-Webhook-Signature"] ??
    "";
  if (!providedSig) return json(401, { error: "missing signature" });

  const expectedSig = hmacHex(secret, canonicalJson(payload));
  if (!constantTimeEquals(providedSig, expectedSig)) {
    return json(401, { error: "invalid signature" });
  }

  // Forward to Trigger.dev. Use submission_id as idempotency key so retries
  // from flaky browsers don't create duplicate teacher records.
  const submissionId = typeof payload.submission_id === "string" ? payload.submission_id : null;

  const res = await fetch(TRIGGER_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${triggerKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      payload,
      options: submissionId ? { idempotencyKey: submissionId, idempotencyKeyTTL: "24h" } : undefined,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return json(502, { error: "trigger.dev rejected", status: res.status, detail: text.slice(0, 500) });
  }

  const data = (await res.json()) as { id?: string };
  return json(200, { ok: true, runId: data.id ?? null, submissionId });
}

// Netlify Function: the form calls this when a submission did NOT go through
// (files too large, submit/Trigger.dev rejected it, network error). Posts one
// line to the De Club Alerts Telegram group so a failed onboarding is never
// silent again. Unsigned on purpose: it only ever sends a short alert.

interface NetlifyEvent {
  httpMethod?: string;
  body: string | null;
}

interface NetlifyResponse {
  statusCode: number;
  body?: string;
}

const clip = (v: unknown, n = 120): string => String(v ?? "").replace(/[<>]/g, "").slice(0, n);

export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  if (event.httpMethod !== "POST") return { statusCode: 405 };
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ALERT_CHAT_ID;
  if (!token || !chatId) return { statusCode: 500, body: "not configured" };

  let b: Record<string, unknown>;
  try {
    b = JSON.parse(event.body ?? "{}");
  } catch {
    return { statusCode: 400 };
  }

  const name = `${clip(b.first_name, 60)} ${clip(b.last_name, 60)}`.trim() || "(unknown)";
  const text =
    `⚠️ Teacher onboarding form NOT received\n` +
    `Name: ${name}\nPhone: ${clip(b.phone, 30) || "-"}\nEmail: ${clip(b.email, 80) || "-"}\n` +
    `Reason: ${clip(b.reason, 40)}${b.size_mb ? ` (${clip(b.size_mb, 10)} MB)` : ""}` +
    `${b.variant ? `\nLink: /${clip(b.variant, 30)}` : ""}` +
    `${b.detail ? `\nDetail: ${clip(b.detail, 300)}` : ""}`;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { statusCode: 502 };
  }
  return { statusCode: 204 };
}

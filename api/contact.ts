// Vercel serverless function: POST /api/contact → emails a contact request to the agency through Resend.
//
// Why a server function: the Resend API key is a secret and must never reach the browser bundle.
// The recipient is fixed server-side (VITE_CONTACT_EMAIL), so this endpoint cannot be used to mail
// arbitrary people. Everything received is validated, length-capped and HTML-escaped.
//
// Environment (Vercel → Settings → Environment Variables, server side):
//   RESEND_API_KEY      Resend API key (secret, NO VITE_ prefix)
//   VITE_CONTACT_EMAIL  agency inbox that receives the requests
//   RESEND_FROM         optional sender, e.g. "Trevisan Inmuebles <consultas@trevisan.com.ar>" (domain verified in Resend).
//                       Defaults to Resend's test sender, which can only deliver to the Resend account owner.

const MAX = { name: 120, email: 254, phone: 40, message: 4000, interest: 120, propertyTitle: 200, propertyUrl: 500 } as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_FROM = 'Trevisan Inmuebles <onboarding@resend.dev>';

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s: string) => s.replace(/[&<>"']/g, c => ESCAPES[c]);
const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
/** Header-safe single line (no CR/LF injection in the subject). */
const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ');

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.VITE_CONTACT_EMAIL?.trim();
  if (!apiKey || !to) return json(503, { error: 'Email no configurado.' });

  let raw: unknown;
  try { raw = await request.json(); } catch { return json(400, { error: 'Solicitud inválida.' }); }
  const b = (raw ?? {}) as Record<string, unknown>;

  const name = clean(b.name, MAX.name);
  const email = clean(b.email, MAX.email);
  const phone = clean(b.phone, MAX.phone);
  const message = clean(b.message, MAX.message);
  const interest = clean(b.interest, MAX.interest);
  const propertyTitle = clean(b.propertyTitle, MAX.propertyTitle);
  const propertyUrl = clean(b.propertyUrl, MAX.propertyUrl);

  if (!name) return json(400, { error: 'Falta el nombre.' });
  if (!EMAIL_RE.test(email)) return json(400, { error: 'Email inválido.' });
  if (propertyUrl && !/^https?:\/\//i.test(propertyUrl)) return json(400, { error: 'Enlace inválido.' });

  const rows: [string, string][] = [
    ['Nombre', name],
    ['Email', email],
    ['Teléfono', phone || '—'],
    ['Interés', interest || '—'],
    ['Propiedad', propertyTitle ? (propertyUrl ? `${propertyTitle} — ${propertyUrl}` : propertyTitle) : '—'],
  ];

  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#121316;max-width:560px">
<h2 style="margin:0 0 12px">Nueva consulta desde el sitio web</h2>
<table style="border-collapse:collapse;width:100%">${rows.map(([k, v]) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#52525b;vertical-align:top;white-space:nowrap">${k}</td><td style="padding:6px 0">${esc(v)}</td></tr>`).join('')}</table>
<h3 style="margin:18px 0 6px">Mensaje</h3>
<p style="white-space:pre-wrap;margin:0">${message ? esc(message) : '—'}</p>
<p style="margin:20px 0 0;font-size:12px;color:#52525b">Podés responder directamente a este correo: la respuesta le llega a ${esc(email)}.</p>
</div>`;
  const text = `${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nMensaje:\n${message || '—'}`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.RESEND_FROM?.trim() || DEFAULT_FROM,
      to: [to],
      reply_to: email,
      subject: oneLine(`Nueva consulta: ${propertyTitle || interest || 'sitio web'} — ${name}`).slice(0, 200),
      html,
      text,
    }),
  });

  if (!res.ok) {
    console.error('[contact] Resend rejected the email', res.status, await res.text());
    return json(502, { error: 'No se pudo enviar el email.' });
  }
  return json(200, { ok: true });
}

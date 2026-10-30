// Single entry point for the two contact forms: stores the request in Supabase (backup, readable in
// /admin → Consultas) AND emails it to the agency through /api/contact (Resend, see api/contact.ts).

import { submitContact } from '@/lib/supabase';

export interface ContactRequest {
  name: string;
  email: string;
  phone?: string;
  message: string;
  /** "¿Qué te interesa?" choice of the home form. */
  interest?: string;
  /** Set when sent from a listing page. */
  propertyId?: string;
  propertyTitle?: string;
}

const EMAIL_TIMEOUT_MS = 10000;

/**
 * Both channels run in parallel and independently: the visitor sees success if AT LEAST ONE worked
 * (the request is never lost: it is either in the database or in the inbox). It rejects only when both fail.
 */
export async function sendContact(c: ContactRequest): Promise<void> {
  const stored = submitContact({
    name: c.name,
    email: c.email,
    phone: c.phone,
    // `interest` has no column of its own: it travels at the top of the stored message.
    message: [c.interest && `[${c.interest}]`, c.message].filter(Boolean).join('\n'),
    propertyId: c.propertyId,
  });

  const emailed = fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: c.name,
      email: c.email,
      phone: c.phone,
      message: c.message,
      interest: c.interest,
      propertyTitle: c.propertyTitle,
      propertyUrl: c.propertyId ? window.location.href : undefined,
    }),
    signal: AbortSignal.timeout(EMAIL_TIMEOUT_MS),
  }).then(res => { if (!res.ok) throw new Error(`/api/contact responded ${res.status}`); });

  const [db, mail] = await Promise.allSettled([stored, emailed]);
  if (db.status === 'rejected') console.warn('[contact] not saved in Supabase:', db.reason);
  if (mail.status === 'rejected') console.warn('[contact] email not sent:', mail.reason);
  if (db.status === 'rejected' && mail.status === 'rejected') throw db.reason;
}

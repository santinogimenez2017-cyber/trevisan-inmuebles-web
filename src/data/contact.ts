// Official contact channels of Trevisan Inmuebles (Roque González 1137, Posadas, Misiones).

export const WHATSAPP_NUMBER = '5493764755777';
export const WHATSAPP_DISPLAY = '+54 9 376 475-5777';

export const PHONE_TEL = 'tel:+543764431739';
export const PHONE_DISPLAY = '+54 376 443-1739';

/** wa.me link, optionally with a prefilled message. */
export function whatsappUrl(text?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

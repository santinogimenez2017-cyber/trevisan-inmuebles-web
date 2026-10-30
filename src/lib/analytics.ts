/**
 * Lightweight lead-tracking helper (Módulo D).
 * Pushes structured events to `window.dataLayer` (Google Tag Manager / Meta Pixel via GTM).
 * Without GTM loaded the queue is still created, so events are never lost, and in dev they are
 * also logged to the console.
 */

type DataLayerEvent = { event: string } & Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: DataLayerEvent[];
    /** Defined by the GA4 snippet in index.html only when VITE_GA4_ID is valid. */
    gtag?: (command: 'event', name: string, params?: Record<string, unknown>) => void;
  }
}

export interface SearchFilters {
  operation?: string;
  type?: string;
  neighborhood?: string;
  minPrice?: string | number;
  maxPrice?: string | number;
  currency?: string;
  bedrooms?: string | number;
}

function track(event: string, params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  const payload: DataLayerEvent = { event, ...params };
  (window.dataLayer = window.dataLayer ?? []).push(payload);
  // GA4 (direct gtag.js) takes flat parameters: nested values such as `filters` are sent as JSON.
  window.gtag?.('event', event, Object.fromEntries(
    Object.entries(params).map(([k, v]) => [k, v !== null && typeof v === 'object' ? JSON.stringify(v) : v]),
  ));
  if (import.meta.env.DEV) console.log('[analytics]', payload);
}

export function trackWhatsAppClick(propertySlug?: string, propertyTitle?: string): void {
  track('whatsapp_click', {
    property_slug: propertySlug ?? null,
    property_title: propertyTitle ?? null,
    page_path: window.location.pathname,
  });
}

export function trackPropertySearch(filters: SearchFilters): void {
  const active = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== ''),
  );
  track('property_search', { filters: active, filters_count: Object.keys(active).length });
}

export function trackFormSubmit(): void {
  track('form_submit', { form_id: 'contact', page_path: window.location.pathname });
}

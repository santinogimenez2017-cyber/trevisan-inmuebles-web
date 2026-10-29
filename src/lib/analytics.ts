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

import type { Property } from '@/data/properties';

interface Props {
  property: Pick<Property, 'address' | 'neighborhood' | 'city' | 'latitude' | 'longitude'>;
}

/**
 * Renders a responsive Google Maps Embed iframe.
 * Uses lat/lng coordinates when available; otherwise falls back to the
 * concatenated address string. No paid API key required.
 */
export function PropertyMap({ property }: Props) {
  const query =
    property.latitude != null && property.longitude != null
      ? `${property.latitude},${property.longitude}`
      : [
          property.address,
          property.neighborhood,
          property.city || 'Posadas',
          'Misiones, Argentina',
        ]
          .filter(Boolean)
          .join(', ');

  const src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;

  return (
    <div className="mb-6">
      <h2 className="font-semibold text-ink mb-3">Ubicación</h2>
      <div className="relative w-full rounded-2xl overflow-hidden border border-gray-200" style={{ paddingBottom: '56.25%' /* 16:9 */ }}>
        <iframe
          title="Mapa de la propiedad"
          src={src}
          className="absolute inset-0 w-full h-full"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
    </div>
  );
}

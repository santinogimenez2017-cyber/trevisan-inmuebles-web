import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Bed, Bath, Square, MapPin, Phone, MessageCircle,
  ChevronLeft, ChevronRight, Tag, Check, Share2, Maximize2,
} from 'lucide-react';
import { useProperties, formatPrice as formatPropertyPrice, locationLabel } from '@/data/properties';
import { PHONE_TEL, whatsappUrl } from '@/data/contact';
import { trackFormSubmit, trackWhatsAppClick } from '@/lib/analytics';
import { scrollToTop } from '@/lib/scroll';
import { PropertyCard } from '@/components/property/PropertyCard';
import { Lightbox } from '@/components/property/Lightbox';

const EXPO = [0.22, 1, 0.36, 1] as [number, number, number, number];

const TYPE_LABELS: Record<string, string> = {
  casa: 'Casa', departamento: 'Departamento', terreno: 'Terreno',
  local: 'Local', ph: 'PH', oficina: 'Oficina',
};

export default function PropertyDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate  = useNavigate();
  const { properties, loading } = useProperties();
  const property  = properties.find(p => p.slug === slug);
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [copied, setCopied]  = useState(false);

  useEffect(() => { scrollToTop(); }, [slug]);

  // Reset active image / lightbox when the property changes (state adjusted during render,
  // the pattern React recommends instead of setState inside an effect).
  const [shownSlug, setShownSlug] = useState(slug);
  if (shownSlug !== slug) {
    setShownSlug(slug);
    setActiveImage(0);
    setLightboxIndex(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center text-ink-soft text-sm" role="status">
        Cargando propiedad…
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen pt-20 flex flex-col items-center justify-center text-center px-4">
        <h1 className="font-display text-3xl font-bold text-ink mb-3">Propiedad no encontrada</h1>
        <p className="text-ink-soft mb-6">La propiedad que buscás no existe o fue removida.</p>
        <Link to="/propiedades" className="bg-ink text-white px-6 py-2.5 rounded-xl hover:bg-[#2b2c31] transition-colors font-medium text-sm">
          Ver propiedades
        </Link>
      </div>
    );
  }

  const related = properties
    .filter(p => p.id !== property.id && (p.type === property.type || (!!property.neighborhood && p.neighborhood === property.neighborhood)))
    .slice(0, 3);

  const share = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-paper pt-16 lg:pt-20">
      {/* Breadcrumb */}
      <motion.div
        className="bg-linen px-4 py-3 border-b border-gray-100"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EXPO }}
      >
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm text-ink-soft">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 hover:text-ink transition-colors">
            <ArrowLeft size={14} />
            Volver
          </button>
          <span>/</span>
          <Link to="/propiedades" className="hover:text-ink transition-colors">Propiedades</Link>
          <span>/</span>
          <span className="text-ink font-medium line-clamp-1">{property.title}</span>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Left: Gallery + Details */}
          <div className="lg:col-span-2">
            {/* ── Gallery with layoutId shared-element transition ───────── */}
            {/*
                layoutId="property-hero-image-{slug}" matches the same id
                used in PropertyCard. Framer Motion will morph the image
                from its card position into this full-size hero position,
                creating a seamless visual continuity on navigation.
            */}
            <motion.div
              className="rounded-2xl overflow-hidden mb-6 relative"
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: EXPO }}
            >
              <div
                className="aspect-[16/9] relative overflow-hidden bg-gray-100 cursor-zoom-in"
                onClick={() => setLightboxIndex(activeImage)}
              >
                <AnimatePresence mode="wait">
                  <motion.img
                    key={activeImage}
                    layoutId={activeImage === 0 ? `property-img-${property.slug}` : undefined}
                    src={property.images[activeImage]}
                    alt={`${property.title} — imagen ${activeImage + 1}`}
                    className="img-crisp w-full h-full object-cover"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35, ease: EXPO }}
                  />
                </AnimatePresence>

                {/* Navigation arrows */}
                {property.images.length > 1 && (
                  <>
                    <motion.button
                      onClick={e => { e.stopPropagation(); setActiveImage(i => (i - 1 + property.images.length) % property.images.length); }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 text-ink border border-stone-300/60 shadow-sm shadow-stone-900/5 rounded-full flex items-center justify-center backdrop-blur-md"
                      aria-label="Imagen anterior"
                      whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.95)' }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <ChevronLeft size={18} />
                    </motion.button>
                    <motion.button
                      onClick={e => { e.stopPropagation(); setActiveImage(i => (i + 1) % property.images.length); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 text-ink border border-stone-300/60 shadow-sm shadow-stone-900/5 rounded-full flex items-center justify-center backdrop-blur-md"
                      aria-label="Imagen siguiente"
                      whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.95)' }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <ChevronRight size={18} />
                    </motion.button>
                  </>
                )}
                <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white/80 text-ink border border-stone-300/60 text-xs px-3 py-1 rounded-full backdrop-blur-md">
                  <Maximize2 size={11} aria-hidden="true" />
                  {activeImage + 1} / {property.images.length}
                </div>
              </div>

              {/* Thumbnails */}
              {property.images.length > 1 && (
                <div className="flex gap-2 mt-3">
                  {property.images.map((img, i) => (
                    <motion.button
                      key={i}
                      onClick={() => setActiveImage(i)}
                      className={`rounded-lg overflow-hidden aspect-video flex-1 max-w-[100px] border-2 transition-all ${i === activeImage ? 'border-[#e07b2a]' : 'border-transparent opacity-60'}`}
                      whileHover={{ opacity: 1, scale: 1.04 }}
                      transition={{ duration: 0.2 }}
                    >
                      <img src={img} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Info */}
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EXPO, delay: 0.15 }}
            >
              {/* Badges + title */}
              <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                <div>
                  <div className="flex gap-2 mb-3 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${property.operation === 'venta' ? 'bg-ink text-white' : 'bg-accent text-white'}`}>
                      {property.operation}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 uppercase">
                      {TYPE_LABELS[property.type] ?? property.type}
                    </span>
                  </div>
                  <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink">{property.title}</h1>
                  <div className="flex items-center gap-1.5 text-ink-soft text-sm mt-2">
                    <MapPin size={13} className="text-accent-deep" />
                    {[property.address, locationLabel(property), property.province].filter(Boolean).join(', ')}
                  </div>
                </div>
                <motion.button
                  onClick={share}
                  className="flex items-center gap-1.5 text-sm text-ink-soft border border-gray-200 rounded-xl px-3 py-2"
                  whileHover={{ scale: 1.04, color: '#0f1f3d', borderColor: '#cbd5e1' }}
                  whileTap={{ scale: 0.96 }}
                >
                  {copied ? <Check size={14} className="text-green-500" /> : <Share2 size={14} />}
                  {copied ? 'Copiado' : 'Compartir'}
                </motion.button>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {property.bedrooms  !== undefined && <StatCard icon={<Bed   size={16} className="text-accent-deep" />} label="Dormitorios" value={String(property.bedrooms)} />}
                {property.bathrooms !== undefined && <StatCard icon={<Bath  size={16} className="text-accent-deep" />} label="Baños"        value={String(property.bathrooms)} />}
                {property.area      !== undefined && <StatCard icon={<Square size={16} className="text-accent-deep" />} label="Superficie"  value={`${property.area} m²`} />}
                {property.parking   !== undefined && property.parking > 0 && <StatCard icon={<Tag size={16} className="text-accent-deep" />} label="Cocheras" value={String(property.parking)} />}
              </div>

              {/* Description */}
              <div className="mb-6">
                <h2 className="font-semibold text-ink mb-3">Descripción</h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-line">{property.description}</p>
              </div>

              {/* Features */}
              {property.features.length > 0 && (
                <div>
                  <h2 className="font-semibold text-ink mb-3">Características</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {property.features.map(f => (
                      <div key={f} className="flex items-center gap-2 text-sm text-gray-600">
                        <Check size={14} className="text-accent-deep shrink-0" />
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Right: Contact sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: EXPO, delay: 0.25 }}
          >
            <div className="sticky top-24 space-y-4">
              {/* Price card */}
              <div className="bg-white/90 border border-stone-300/60 shadow-md rounded-2xl p-6 text-ink">
                <p className="text-ink-soft text-xs uppercase tracking-wider mb-1">Precio</p>
                <p className="font-display text-3xl text-ink mb-1">{formatPropertyPrice({ ...property, operation: 'venta' })}</p>
                {property.price > 0 && property.operation === 'alquiler' && <p className="text-ink-soft text-xs">por mes</p>}

                <div className="mt-5 space-y-3">
                  <motion.a
                    href={whatsappUrl(`Hola, me interesa la propiedad: ${property.title}`)}
                    onClick={() => trackWhatsAppClick(property.slug, property.title)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-shimmer flex items-center justify-center gap-2 bg-[#157347] text-white font-semibold px-5 py-3 rounded-xl w-full text-sm"
                    whileHover={{ scale: 1.02, backgroundColor: '#0f6038' }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                  >
                    <MessageCircle size={16} />
                    Consultar por WhatsApp
                  </motion.a>
                  <motion.a
                    href={PHONE_TEL}
                    className="btn-shimmer flex items-center justify-center gap-2 bg-ink text-white font-medium px-5 py-3 rounded-xl w-full text-sm"
                    whileHover={{ scale: 1.02, backgroundColor: '#2b2c31' }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                  >
                    <Phone size={16} />
                    Llamar al asesor
                  </motion.a>
                </div>
              </div>

              {/* Inline contact form */}
              <ContactSidebar title={property.title} />
            </div>
          </motion.div>
        </div>

        {/* Related properties */}
        {related.length > 0 && (
          <motion.div
            className="mt-16 pt-12 border-t border-gray-100"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EXPO, delay: 0.4 }}
          >
            <h2 className="font-display text-2xl font-bold text-ink mb-8">Propiedades relacionadas</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map(p => <PropertyCard key={p.id} property={p} />)}
            </div>
          </motion.div>
        )}
      </div>

      <Lightbox
        images={property.images}
        index={lightboxIndex}
        title={property.title}
        onIndexChange={setLightboxIndex}
        onClose={() => setLightboxIndex(null)}
      />
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-linen rounded-xl p-4 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <p className="text-lg font-bold text-ink">{value}</p>
      <p className="text-xs text-ink-soft">{label}</p>
    </div>
  );
}

function ContactSidebar({ title }: { title: string }) {
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [message, setMessage] = useState(`Hola, me interesa la propiedad: ${title}. ¿Podrían contactarme?`);
  const [sent, setSent]       = useState(false);

  if (sent) {
    return (
      <motion.div
        className="bg-white/90 border border-stone-300/60 shadow-md rounded-2xl p-6 text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: EXPO }}
      >
        <Check size={28} className="text-accent-deep mx-auto mb-3" />
        <p className="font-semibold text-ink mb-1">¡Consulta enviada!</p>
        <p className="text-sm text-ink-soft">Te contactamos pronto.</p>
      </motion.div>
    );
  }

  return (
    <div className="bg-white/90 border border-stone-300/60 shadow-md rounded-2xl p-6">
      <h3 className="font-semibold text-ink mb-4 text-sm">Solicitar información</h3>
      <form onSubmit={e => { e.preventDefault(); trackFormSubmit(); setSent(true); }} className="space-y-3">
        <input required type="text" placeholder="Tu nombre" value={name} onChange={e => setName(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#e07b2a]/30 focus:border-[#e07b2a] transition-all" />
        <input required type="email" placeholder="Tu email" value={email} onChange={e => setEmail(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#e07b2a]/30 focus:border-[#e07b2a] transition-all" />
        <textarea rows={3} value={message} onChange={e => setMessage(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#e07b2a]/30 focus:border-[#e07b2a] transition-all resize-none" />
        <motion.button
          type="submit"
          className="btn-shimmer w-full bg-accent text-white font-semibold py-2.5 rounded-xl text-sm"
          whileHover={{ scale: 1.015, backgroundColor: '#a64b0b' }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 350, damping: 22 }}
        >
          Enviar consulta
        </motion.button>
      </form>
    </div>
  );
}


import React, { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Phone, Mail, MapPin, Send, CheckCircle } from 'lucide-react';
import { SocialIcon } from '@/components/ui/SocialIcon';
import { PHONE_TEL, PHONE_DISPLAY, WHATSAPP_DISPLAY, whatsappUrl } from '@/data/contact';
import { trackFormSubmit, trackWhatsAppClick } from '@/lib/analytics';

const EXPO = [0.22, 1, 0.36, 1] as [number, number, number, number];

const MAPS_URL = 'https://www.google.com/maps/search/?api=1&query=Roque+Gonz%C3%A1lez+1137+Posadas+Misiones';

// Same call signature as a lucide icon, so it slots into CONTACT_ITEMS; renders the vector glyph.
function WhatsAppIcon({ size = 16, className }: { size?: number; className?: string }) {
  return <SocialIcon name="whatsapp" size={size} className={className} />;
}

const CONTACT_ITEMS = [
  { icon: Phone, label: 'Teléfono', value: PHONE_DISPLAY, href: PHONE_TEL },
  { icon: WhatsAppIcon, label: 'WhatsApp', value: WHATSAPP_DISPLAY, href: whatsappUrl() },
  { icon: Mail, label: 'Email', value: 'info@trevisan.com.ar', href: 'mailto:info@trevisan.com.ar' },
  { icon: MapPin, label: 'Dirección', value: 'Roque González 1137, N3300 Posadas, Misiones', href: MAPS_URL },
] as const;

export function ContactSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: '-80px' });

  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '', interest: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    trackFormSubmit();
    setSent(true);
  };

  return (
    <section
      ref={sectionRef}
      id="contacto"
      className="py-24 px-4 bg-linen relative overflow-hidden"
    >
      {/* Decorative bg geometry */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[#e07b2a]/5 translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-black/[0.03] -translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Left: Info */}
          <motion.div
            className="text-ink"
            initial={{ opacity: 0, y: 44 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.9, ease: EXPO }}
          >
            <span className="eyebrow text-accent-deep mb-4 block">
              Estamos para ayudarte
            </span>
            <h2 className="font-display text-4xl sm:text-5xl leading-[1.06] mb-6">
              Hablemos de<br />tu próxima<br />propiedad
            </h2>
            <p className="text-ink-soft text-lg leading-relaxed mb-10">
              Nuestros asesores en Posadas están disponibles para responder tus preguntas, coordinar visitas y guiarte en todo el proceso de compra, venta o alquiler en Misiones.
            </p>

            <div className="space-y-5">
              {CONTACT_ITEMS.map(({ icon: Icon, label, value, href }, i) => (
                <motion.div
                  key={label}
                  className="group flex items-center gap-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.6, ease: EXPO, delay: 0.1 + i * 0.08 }}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#e07b2a]/15 flex items-center justify-center shrink-0">
                    <Icon
                      size={16}
                      className={`text-accent-deep transition-colors ${href === MAPS_URL ? 'group-hover:text-accent-deep' : ''}`}
                    />
                  </div>
                  <div>
                    <p className="text-ink-soft text-xs uppercase tracking-wider">{label}</p>
                    {href ? (
                      <a
                        href={href}
                        target={href.startsWith('http') ? '_blank' : undefined}
                        rel="noopener noreferrer"
                        className={`text-ink transition-colors font-medium ${href === MAPS_URL ? 'hover:text-accent-deep' : 'hover:text-accent-deep'}`}
                      >
                        {value}
                      </a>
                    ) : (
                      <p className="text-ink font-medium">{value}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* WhatsApp CTA */}
            <motion.a
              href={whatsappUrl('Hola, quiero consultar sobre una propiedad.')}
              onClick={() => trackWhatsAppClick('contacto', 'Contacto general')}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-shimmer mt-10 inline-flex items-center gap-3 bg-[#157347] text-white font-semibold px-6 py-3.5 rounded-full"
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, ease: EXPO, delay: 0.5 }}
              whileHover={{ scale: 1.05, backgroundColor: '#0f6038' }}
              whileTap={{ scale: 0.97 }}
            >
              <SocialIcon name="whatsapp" size={20} />
              Consultar por WhatsApp
            </motion.a>
          </motion.div>

          {/* Right: Form */}
          <motion.div
            className="bg-white/90 border border-stone-300/60 shadow-md rounded-2xl p-8 sm:p-10"
            initial={{ opacity: 0, y: 44 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.9, ease: EXPO, delay: 0.15 }}
          >
            {sent ? (
              <motion.div
                className="h-full flex flex-col items-center justify-center text-center py-12"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: EXPO }}
              >
                <CheckCircle size={48} className="text-accent-deep mb-4" />
                <h3 className="font-display text-2xl font-bold text-ink mb-3">¡Mensaje enviado!</h3>
                <p className="text-ink-soft leading-relaxed">
                  Recibimos tu consulta. Un asesor se pondrá en contacto con vos en las próximas horas.
                </p>
                <button
                  onClick={() => setSent(false)}
                  className="mt-6 text-sm text-accent-deep hover:underline"
                >
                  Enviar otro mensaje
                </button>
              </motion.div>
            ) : (
              <>
                <h3 className="font-display text-2xl font-bold text-ink mb-2">Dejanos tu consulta</h3>
                <p className="text-ink-soft text-sm mb-6">Te respondemos en menos de 24 horas hábiles.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormInput label="Nombre completo" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} required />
                    <FormInput label="Teléfono" type="tel" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} />
                  </div>
                  <FormInput label="Email" type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} required />
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">¿Qué te interesa?</label>
                    <select
                      value={form.interest}
                      onChange={e => setForm(f => ({ ...f, interest: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#e07b2a]/30 focus:border-[#e07b2a] transition-all bg-white"
                    >
                      <option value="">Seleccionar...</option>
                      <option>Comprar una propiedad</option>
                      <option>Alquilar una propiedad</option>
                      <option>Vender mi propiedad</option>
                      <option>Tasar mi propiedad</option>
                      <option>Otra consulta</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Mensaje</label>
                    <textarea
                      value={form.message}
                      onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                      rows={4}
                      placeholder="Contanos qué estás buscando..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#e07b2a]/30 focus:border-[#e07b2a] transition-all resize-none"
                    />
                  </div>
                  <motion.button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 bg-ink text-white font-semibold py-3.5 rounded-xl text-sm"
                    whileHover={{ scale: 1.015, backgroundColor: '#2b2c31' }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                  >
                    <Send size={15} />
                    Enviar consulta
                  </motion.button>
                </form>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function FormInput({
  label, value, onChange, type = 'text', required = false
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}{required && <span className="text-accent-deep ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#e07b2a]/30 focus:border-[#e07b2a] transition-all"
      />
    </div>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, MapPin, Mail } from 'lucide-react';
import { SocialIcon, type SocialIconName } from '@/components/ui/SocialIcon';
import { PHONE_TEL, PHONE_DISPLAY, whatsappUrl } from '@/data/contact';
import { trackWhatsAppClick } from '@/lib/analytics';
import { useSectionLink } from '@/lib/useSectionLink';

const MAPS_URL = 'https://www.google.com/maps/search/?api=1&query=Roque+Gonz%C3%A1lez+1137+Posadas+Misiones';
const WA_URL = whatsappUrl('Hola, quiero consultar sobre una propiedad.');

export function Footer() {
  const toNosotros = useSectionLink('#nosotros');
  const toContacto = useSectionLink('#contacto');

  return (
    <footer className="bg-linen text-ink border-t border-black/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">

          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="mb-5">
              <div className="text-2xl font-display font-bold tracking-wide text-ink">TREVISAN</div>
              <div className="text-accent-deep text-xs tracking-[0.25em] uppercase font-medium mt-0.5">Inmuebles</div>
            </div>
            <p className="text-ink-soft text-sm leading-relaxed mb-6">
              Conectamos familias con su próximo hogar en Posadas, Misiones y la región del NEA.
            </p>
            <div className="flex gap-3">
              {([
                { icon: 'instagram', name: 'Instagram', href: 'https://www.instagram.com/trevisaninmuebles/?hl=es-la' },
                { icon: 'facebook', name: 'Facebook', href: 'https://www.facebook.com/TrevisanInmuebles/?locale=es_LA' },
                { icon: 'whatsapp', name: 'WhatsApp', href: WA_URL },
              ] as { icon: SocialIconName; name: string; href: string }[]).map(({ icon, name, href }) => (
                <a
                  key={icon}
                  href={href}
                  onClick={href === WA_URL ? () => trackWhatsAppClick('footer', 'Footer') : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={name}
                  className="w-10 h-10 rounded-full bg-black/5 hover:bg-black/10 hover:scale-110 flex items-center justify-center transition-all duration-200"
                >
                  <SocialIcon name={icon} size={24} />
                </a>
              ))}
            </div>
          </div>

          {/* Propiedades */}
          <div>
            <h4 className="text-sm font-semibold text-ink uppercase tracking-wider mb-4">Propiedades</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Casas en venta',      to: '/propiedades?tipo=casa&operacion=venta' },
                { label: 'Departamentos',        to: '/propiedades?tipo=departamento' },
                { label: 'Terrenos',             to: '/propiedades?tipo=terreno' },
                { label: 'Locales comerciales',  to: '/propiedades?tipo=local' },
                { label: 'Alquileres',           to: '/propiedades?operacion=alquiler' },
              ].map(link => (
                <li key={link.to}>
                  <Link to={link.to} className="text-ink-soft hover:text-ink text-sm transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Empresa */}
          <div>
            <h4 className="text-sm font-semibold text-ink uppercase tracking-wider mb-4">Empresa</h4>
            <ul className="space-y-2.5">
              <li>
                <a href="/#nosotros" onClick={toNosotros} className="text-ink-soft hover:text-ink text-sm transition-colors cursor-pointer">
                  Nosotros
                </a>
              </li>
              <li>
                <a href="/#contacto" onClick={toContacto} className="text-ink-soft hover:text-ink text-sm transition-colors cursor-pointer">
                  Contacto
                </a>
              </li>
              <li>
                <a href="/#contacto" onClick={toContacto} className="text-ink-soft hover:text-ink text-sm transition-colors cursor-pointer">
                  Tasaciones
                </a>
              </li>
              <li>
                <a href="/#contacto" onClick={toContacto} className="text-ink-soft hover:text-ink text-sm transition-colors cursor-pointer">
                  Publicar propiedad
                </a>
              </li>
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h4 className="text-sm font-semibold text-ink uppercase tracking-wider mb-4">Contacto</h4>
            <ul className="space-y-3">
              <li>
                <a
                  href={MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Ver Roque González 1137, Posadas, Misiones en Google Maps"
                  className="group flex items-start gap-2 text-ink-soft hover:text-accent-deep text-sm transition-colors"
                >
                  <MapPin size={14} className="mt-0.5 shrink-0 text-accent-deep group-hover:text-accent-deep transition-colors" />
                  <span>Roque González 1137, N3300 Posadas, Misiones</span>
                </a>
              </li>
              <li>
                <a href={PHONE_TEL} className="flex items-center gap-2 text-ink-soft hover:text-ink text-sm transition-colors">
                  <Phone size={14} className="text-accent-deep shrink-0" />
                  <span>{PHONE_DISPLAY}</span>
                </a>
              </li>
              <li>
                <a href="mailto:info@trevisan.com.ar" className="flex items-center gap-2 text-ink-soft hover:text-ink text-sm transition-colors">
                  <Mail size={14} className="text-accent-deep shrink-0" />
                  <span>info@trevisan.com.ar</span>
                </a>
              </li>
              <li>
                <a
                  href={WA_URL}
                  onClick={() => trackWhatsAppClick('footer', 'Footer')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-ink-soft hover:text-ink text-sm transition-colors"
                >
                  <SocialIcon name="whatsapp" size={16} />
                  <span>WhatsApp</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-black/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-ink-soft text-xs">
            © {new Date().getFullYear()} Trevisan Inmuebles. Todos los derechos reservados.
          </p>
          <p className="text-ink-soft text-xs">
            Matrícula habilitante — CCPIM · Colegio de Corredores Públicos Inmobiliarios de Misiones
          </p>
        </div>
      </div>
    </footer>
  );
}

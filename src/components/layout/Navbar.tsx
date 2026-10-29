import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Menu, X } from 'lucide-react';
import { SocialIcon } from '@/components/ui/SocialIcon';
import { PHONE_TEL, whatsappUrl } from '@/data/contact';
import { useSectionLink as useSectionNav } from '@/lib/useSectionLink';

// Each nav link stores a pathname and optionally a query param key+value.
// This lets us detect which link is "active" by comparing both.
const NAV_LINKS = [
  { label: 'Venta',        to: '/propiedades?operacion=venta',        paramKey: 'operacion', paramVal: 'venta' },
  { label: 'Alquiler',     to: '/propiedades?operacion=alquiler',     paramKey: 'operacion', paramVal: 'alquiler' },
  { label: 'Casas',        to: '/propiedades?tipo=casa',              paramKey: 'tipo',      paramVal: 'casa' },
  { label: 'Departamentos',to: '/propiedades?tipo=departamento',      paramKey: 'tipo',      paramVal: 'departamento' },
  { label: 'Terrenos',     to: '/propiedades?tipo=terreno',           paramKey: 'tipo',      paramVal: 'terreno' },
  { label: 'Locales',      to: '/propiedades?tipo=local',             paramKey: 'tipo',      paramVal: 'local' },
] as const;

const EXPO = [0.22, 1, 0.36, 1] as [number, number, number, number];

/** Returns true when a nav link should be visually active */
function useIsActive(paramKey: string, paramVal: string) {
  const location = useLocation();
  if (location.pathname !== '/propiedades') return false;
  const params = new URLSearchParams(location.search);
  return params.get(paramKey) === paramVal;
}

export function Navbar() {
  const [open, setOpen]       = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const location = useLocation();
  const isHome   = location.pathname === '/';

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  React.useEffect(() => { setOpen(false); }, [location]);

  const solidBg = scrolled || !isHome;

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50"
      animate={{
        backgroundColor: solidBg ? 'rgba(243,241,236,0.96)' : 'rgba(243,241,236,0.9)',
        backdropFilter:  solidBg ? 'blur(16px)'           : 'blur(12px)',
        boxShadow:       solidBg ? '0 1px 0 rgba(0,0,0,0.06), 0 8px 24px rgba(28,25,23,0.04)' : '0 1px 0 rgba(0,0,0,0.04)',
      }}
      transition={{ duration: 0.4, ease: EXPO }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <motion.div
              className="flex flex-col leading-none"
              whileHover={{ scale: 1.03 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <span className="text-ink font-display text-xl lg:text-2xl font-bold tracking-wide">
                TREVISAN
              </span>
              <span className="text-accent-deep text-[10px] lg:text-xs tracking-[0.25em] uppercase font-medium">
                Inmuebles
              </span>
            </motion.div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {NAV_LINKS.map(link => (
              <NavLink key={link.to} {...link} />
            ))}
          </nav>

          {/* Desktop Actions */}
          <DesktopActions />

          {/* Mobile menu button */}
          <motion.button
            className="lg:hidden text-ink p-2"
            onClick={() => setOpen(!open)}
            aria-label="Menú"
            whileTap={{ scale: 0.9 }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {open ? (
                <motion.span
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <X size={24} />
                </motion.span>
              ) : (
                <motion.span
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Menu size={24} />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-menu"
            className="lg:hidden bg-paper/98 backdrop-blur-xl border-t border-black/5 overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EXPO }}
          >
            <nav className="px-4 py-4 flex flex-col gap-1">
              {NAV_LINKS.map((link, i) => (
                <motion.div
                  key={link.to}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, ease: EXPO, delay: i * 0.05 }}
                >
                  <NavLinkMobile {...link} />
                </motion.div>
              ))}
              <motion.div
                className="mt-3 pt-3 border-t border-black/5 flex flex-col gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: NAV_LINKS.length * 0.05 + 0.1 }}
              >
                <MobileSection />
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

// ── Desktop Actions — extracted to use hooks properly ────────────────────
function DesktopActions() {
  const toNosotros = useSectionNav('#nosotros');
  const toContacto = useSectionNav('#contacto');

  return (
    <div className="hidden lg:flex items-center gap-3 shrink-0">
      <a
        href="/#nosotros"
        onClick={toNosotros}
        className="text-ink-soft hover:text-ink text-sm transition-colors px-2 py-1"
      >
        Nosotros
      </a>
      <motion.a
        href={whatsappUrl()}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-ink-soft hover:text-ink text-sm transition-colors"
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
      >
        <SocialIcon name="whatsapp" size={18} />
        <span>WhatsApp</span>
      </motion.a>
      <motion.a
        href="/#contacto"
        onClick={toContacto}
        className="btn-shimmer flex items-center gap-1.5 bg-accent text-white text-sm font-medium px-4 py-2 rounded-full"
        whileHover={{ scale: 1.06, backgroundColor: '#a64b0b' }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 380, damping: 22 }}
      >
        <Phone size={14} />
        <span>Contactar</span>
      </motion.a>
    </div>
  );
}

// ── Mobile extra section — extracted to use hooks properly ────────────────
function MobileSection() {
  const toNosotros = useSectionNav('#nosotros');
  const toContacto = useSectionNav('#contacto');

  return (
    <>
      <a href="/#nosotros" onClick={toNosotros} className="flex items-center gap-2 text-ink-soft px-3 py-2 text-sm hover:text-ink transition-colors">
        Nosotros
      </a>
      <a href="/#contacto" onClick={toContacto} className="flex items-center gap-2 text-ink-soft px-3 py-2 text-sm hover:text-ink transition-colors">
        Contacto
      </a>
      <a
        href={whatsappUrl()}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-ink-soft px-3 py-2"
      >
        <SocialIcon name="whatsapp" size={18} />
        <span className="text-sm">WhatsApp</span>
      </a>
      <a
        href={PHONE_TEL}
        className="flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-full text-sm font-medium w-fit"
      >
        <Phone size={14} />
        <span>Llamar ahora</span>
      </a>
    </>
  );
}

// ── Desktop NavLink — with layoutId animated active indicator ────────────
function NavLink({
  to, label, paramKey, paramVal,
}: {
  to: string; label: string; paramKey: string; paramVal: string;
}) {
  const active = useIsActive(paramKey, paramVal);

  return (
    <Link
      to={to}
      className={`relative text-sm font-medium px-3 py-2 rounded-md transition-colors duration-200 ${
        active ? 'text-ink' : 'text-ink-soft hover:text-ink'
      }`}
    >
      {label}

      {/* Hover underline — scale-in on hover when not active */}
      {!active && (
        <motion.span
          className="absolute bottom-0.5 left-3 right-3 h-[1.5px] bg-[#e07b2a]/60 origin-left"
          initial={{ scaleX: 0 }}
          whileHover={{ scaleX: 1 }}
          transition={{ duration: 0.22, ease: EXPO }}
        />
      )}

      {/* Active indicator — shared layoutId so it slides between links */}
      {active && (
        <motion.span
          layoutId="nav-active-pill"
          className="absolute inset-0 bg-black/5 rounded-md -z-10"
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        />
      )}
      {active && (
        <motion.span
          layoutId="nav-active-line"
          className="absolute bottom-0.5 left-3 right-3 h-[2px] bg-[#e07b2a] rounded-full"
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        />
      )}
    </Link>
  );
}

// ── Mobile NavLink — same active logic, pill highlight ──────────────────
function NavLinkMobile({
  to, label, paramKey, paramVal,
}: {
  to: string; label: string; paramKey: string; paramVal: string;
}) {
  const active = useIsActive(paramKey, paramVal);

  return (
    <Link
      to={to}
      className={`relative block text-sm font-medium px-3 py-3 rounded-md transition-colors ${
        active
          ? 'text-ink bg-black/5'
          : 'text-ink-soft hover:text-ink hover:bg-black/5'
      }`}
    >
      {active && (
        <motion.span
          layoutId="nav-mobile-active"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#e07b2a] rounded-full"
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        />
      )}
      <span className={active ? 'ml-2' : ''}>{label}</span>
    </Link>
  );
}

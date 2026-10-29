import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PageTransition } from '@/components/layout/PageTransition';
import { SmoothScroll } from '@/components/layout/SmoothScroll';
import { scrollToTop, scrollToSectionWhenReady } from '@/lib/scroll';
import HomePage from '@/pages/HomePage';
import NotFoundPage from '@/pages/NotFoundPage';

// Listing + detail pages are split out of the initial bundle (the home page doesn't need them).
const loadListings = () => import('@/pages/ListingsPage');
const loadDetail   = () => import('@/pages/PropertyDetailPage');
const ListingsPage       = lazy(loadListings);
const PropertyDetailPage = lazy(loadDetail);

// Warm both chunks shortly after first paint so navigating to them (and the card → detail
// layoutId transition) doesn't wait on the network. No effect on native scrolling.
function usePrefetchPages() {
  useEffect(() => {
    const id = setTimeout(() => { void loadListings(); void loadDetail(); }, 1500);
    return () => clearTimeout(id);
  }, []);
}

// Route changes reset the scroll to the top, except when the URL carries a #hash: then we wait for
// that section to mount and scroll to it. `key` changes on every navigation, so clicking the same
// anchor twice (e.g. "Contacto" again after scrolling away) still scrolls.
function ScrollToTop() {
  const { pathname, hash, key } = useLocation();
  useEffect(() => { if (!hash) scrollToTop(); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!hash) return;
    return scrollToSectionWhenReady(hash);
  }, [hash, key]);
  return null;
}

function Layout() {
  usePrefetchPages();
  const location = useLocation();
  const { pathname } = location;
  const isHome = pathname === '/';
  const is404 = !isHome && !pathname.startsWith('/propiedades') && !pathname.startsWith('/propiedad/');

  return (
    <>
      <SmoothScroll />
      <ScrollToTop />
      {!is404 && <Navbar />}

      {/*
        AnimatePresence mode="wait" — waits for the exit animation of the
        outgoing page to finish before mounting the incoming page.
        key={pathname} ensures a new animation fires on every route change.
      */}
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={pathname}>
          <Route path="/" element={
            <PageTransition><HomePage /></PageTransition>
          } />
          <Route path="/propiedades" element={
            <PageTransition><Suspense fallback={null}><ListingsPage /></Suspense></PageTransition>
          } />
          <Route path="/propiedad/:slug" element={
            <PageTransition><Suspense fallback={null}><PropertyDetailPage /></Suspense></PageTransition>
          } />
          <Route path="*" element={
            <PageTransition><NotFoundPage /></PageTransition>
          } />
        </Routes>
      </AnimatePresence>

      {!is404 && <Footer />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}

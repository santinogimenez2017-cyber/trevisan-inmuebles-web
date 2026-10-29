import type { MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Click handler for links that point to a home-page section (`#contacto`, `#nosotros`, …).
 * Works from any route: it navigates to `/<hash>` and the scroll itself is performed by
 * `useHashScroll` (App.tsx) once the section is mounted — on the home page and on subpages alike.
 */
export function useSectionLink(hash: string) {
  const navigate = useNavigate();
  return (e: MouseEvent) => {
    e.preventDefault();
    navigate({ pathname: '/', hash });
  };
}

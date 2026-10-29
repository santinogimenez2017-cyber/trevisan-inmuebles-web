import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center text-center px-4">
      <div className="mb-8">
        <span className="font-display text-[8rem] sm:text-[12rem] font-bold text-ink/5 leading-none select-none">
          404
        </span>
      </div>
      <h1 className="font-display text-3xl sm:text-4xl text-ink mb-4 -mt-8">
        Página no encontrada
      </h1>
      <p className="text-ink-soft text-lg mb-10 max-w-sm">
        La página que buscás no existe o fue movida.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          to="/"
          className="flex items-center gap-2 bg-accent hover:bg-accent-deep text-white font-semibold px-7 py-3 rounded-full transition-all hover:scale-105 text-sm"
        >
          <Home size={16} />
          Ir al inicio
        </Link>
        <Link
          to="/propiedades"
          className="flex items-center gap-2 bg-black/5 hover:bg-black/10 text-ink font-medium px-7 py-3 rounded-full transition-all text-sm"
        >
          <ArrowLeft size={16} />
          Ver propiedades
        </Link>
      </div>
    </div>
  );
}

import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';

/**
 * Sección de galería con trigger para animación explode
 */
export const GallerySection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const setExploded = useStore((state) => state.setExploded);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Activar explode cuando la sección está visible
          setExploded(entry.isIntersecting);
        });
      },
      { threshold: 0.5 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [setExploded]);

  return (
    <section
      id="gallery"
      ref={sectionRef}
      className="relative min-h-screen py-20 flex items-center justify-center"
      aria-label="Galería de detalles"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="space-y-8">
          {/* Título */}
          <h2 className="text-4xl md:text-5xl font-bold text-gradient animate-fade-in-up">
            Explora cada detalle
          </h2>

          {/* Descripción */}
          <p
            className="text-lg text-gray-400 max-w-2xl mx-auto animate-fade-in-up"
            style={{ animationDelay: '0.1s' }}
          >
            Observa la construcción premium y el diseño meticuloso de cada componente.
          </p>

          {/* Indicador de vista explodida */}
          <div
            className="inline-flex items-center gap-3 px-6 py-3 glass-effect rounded-full animate-fade-in-up"
            style={{ animationDelay: '0.2s' }}
          >
            <div className="w-3 h-3 bg-accent rounded-full animate-pulse" />
            <p className="text-sm text-gray-300 font-medium">Vista Explodida Activa</p>
          </div>

          {/* Grid de detalles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12">
            <div className="glass-effect p-6 rounded-2xl animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <div className="text-3xl mb-4">🎯</div>
              <h3 className="text-lg font-bold text-white mb-2">Precisión</h3>
              <p className="text-sm text-gray-400">
                Cada componente diseñado con precisión milimétrica
              </p>
            </div>

            <div className="glass-effect p-6 rounded-2xl animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <div className="text-3xl mb-4">✨</div>
              <h3 className="text-lg font-bold text-white mb-2">Premium</h3>
              <p className="text-sm text-gray-400">Materiales de la más alta calidad</p>
            </div>

            <div className="glass-effect p-6 rounded-2xl animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
              <div className="text-3xl mb-4">🔧</div>
              <h3 className="text-lg font-bold text-white mb-2">Ingeniería</h3>
              <p className="text-sm text-gray-400">Tecnología de vanguardia integrada</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

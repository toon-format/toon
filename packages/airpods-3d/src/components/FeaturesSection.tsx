import { FEATURES } from '@/types';
import { useEffect, useRef } from 'react';

/**
 * Sección de características con animaciones de scroll
 */
export const FeaturesSection = () => {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in-up');
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = sectionRef.current?.querySelectorAll('.feature-card');
    elements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="features"
      ref={sectionRef}
      className="relative min-h-screen py-20 bg-gradient-to-b from-black via-gray-900 to-black"
      aria-label="Características principales"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Título */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gradient mb-4">
            Tecnología que te mueve
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Diseñados para ofrecerte la mejor experiencia de audio con la tecnología más avanzada.
          </p>
        </div>

        {/* Grid de características */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {FEATURES.map((feature, index) => (
            <div
              key={feature.id}
              className="feature-card opacity-0 glass-effect p-8 rounded-2xl hover:bg-white/10 smooth-transition group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Ícono */}
              <div className="text-5xl mb-4 group-hover:scale-110 smooth-transition">
                {feature.icon}
              </div>

              {/* Título */}
              <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>

              {/* Descripción */}
              <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Especificaciones técnicas */}
        <div className="mt-20 glass-effect p-8 rounded-2xl">
          <h3 className="text-2xl font-bold text-white mb-8 text-center">
            Especificaciones Técnicas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <p className="text-4xl font-bold text-accent mb-2">6h</p>
              <p className="text-gray-400 text-sm">Batería en auriculares</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-accent mb-2">30h</p>
              <p className="text-gray-400 text-sm">Batería total con estuche</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-accent mb-2">IPX4</p>
              <p className="text-gray-400 text-sm">Resistencia al agua</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

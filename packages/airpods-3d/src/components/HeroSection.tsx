import { Scene3D } from './Scene3D';
import { ColorPicker } from './ColorPicker';
import { Controls } from './Controls';

/**
 * Sección Hero con canvas 3D y controles
 */
export const HeroSection = () => {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      aria-label="Hero principal con modelo 3D"
    >
      {/* Canvas 3D de fondo */}
      <div className="absolute inset-0 z-0">
        <Scene3D />
      </div>

      {/* Overlay con gradiente */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80 pointer-events-none" />

      {/* Contenido */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Columna izquierda: Título y descripción */}
          <div className="lg:col-span-1 space-y-6 animate-fade-in-up">
            <h1 className="text-5xl md:text-6xl font-bold text-gradient leading-tight">
              AirPods 3D
            </h1>
            <p className="text-lg text-gray-300 leading-relaxed">
              Experimenta el futuro del audio. Rota, personaliza y explora cada detalle en una
              experiencia inmersiva.
            </p>

            <div className="pt-4">
              <p className="text-4xl font-bold text-white mb-2">$199</p>
              <button
                className="w-full sm:w-auto px-8 py-4 bg-accent hover:bg-accent/80 text-white rounded-full smooth-transition font-semibold text-lg"
                aria-label="Comprar ahora"
              >
                Comprar Ahora
              </button>
            </div>

            {/* Features breves */}
            <ul className="space-y-2 pt-4">
              {['Audio Espacial', 'Batería 30h', 'Carga Rápida', 'Resistente al Agua'].map(
                (feature) => (
                  <li key={feature} className="flex items-center gap-3 text-gray-400 text-sm">
                    <svg
                      className="w-5 h-5 text-accent"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Columna central: espacio para el modelo 3D */}
          <div className="lg:col-span-1 hidden lg:block" />

          {/* Columna derecha: Controles */}
          <div className="lg:col-span-1 space-y-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <ColorPicker />
            <Controls />
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Scroll</p>
            <svg
              className="w-6 h-6 text-gray-400"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
};

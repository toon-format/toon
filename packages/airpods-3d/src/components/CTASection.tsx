/**
 * Sección final de Call-to-Action
 */
export const CTASection = () => {
  return (
    <section
      id="cta"
      className="relative min-h-screen py-20 flex items-center justify-center bg-gradient-to-t from-black via-gray-900 to-black"
      aria-label="Llamado a la acción"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="space-y-8">
          {/* Título principal */}
          <h2 className="text-5xl md:text-6xl font-bold text-gradient animate-fade-in-up">
            El sonido que te mereces
          </h2>

          {/* Subtítulo */}
          <p
            className="text-xl text-gray-300 max-w-2xl mx-auto animate-fade-in-up"
            style={{ animationDelay: '0.1s' }}
          >
            Experimenta audio de calidad profesional con la comodidad y estilo que solo AirPods
            pueden ofrecer.
          </p>

          {/* Precio */}
          <div
            className="py-8 animate-fade-in-up"
            style={{ animationDelay: '0.2s' }}
          >
            <p className="text-gray-400 text-sm uppercase tracking-wider mb-2">Desde</p>
            <p className="text-6xl font-bold text-white">$199</p>
            <p className="text-gray-400 text-sm mt-2">O $33.17/mes por 6 meses*</p>
          </div>

          {/* Botones de acción */}
          <div
            className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up"
            style={{ animationDelay: '0.3s' }}
          >
            <button
              className="px-10 py-4 bg-accent hover:bg-accent/80 text-white rounded-full smooth-transition font-semibold text-lg"
              aria-label="Comprar ahora"
            >
              Comprar Ahora
            </button>
            <button
              className="px-10 py-4 bg-white/10 hover:bg-white/20 text-white rounded-full smooth-transition font-semibold text-lg"
              aria-label="Más información"
            >
              Más Información
            </button>
          </div>

          {/* Features destacadas */}
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-12 animate-fade-in-up"
            style={{ animationDelay: '0.4s' }}
          >
            <div className="glass-effect p-4 rounded-xl">
              <p className="text-accent font-bold mb-1">📦</p>
              <p className="text-sm text-gray-300">Envío gratis</p>
            </div>
            <div className="glass-effect p-4 rounded-xl">
              <p className="text-accent font-bold mb-1">↻</p>
              <p className="text-sm text-gray-300">30 días de prueba</p>
            </div>
            <div className="glass-effect p-4 rounded-xl">
              <p className="text-accent font-bold mb-1">🛡️</p>
              <p className="text-sm text-gray-300">Garantía 1 año</p>
            </div>
            <div className="glass-effect p-4 rounded-xl">
              <p className="text-accent font-bold mb-1">💳</p>
              <p className="text-sm text-gray-300">Pago seguro</p>
            </div>
          </div>

          {/* Footer info */}
          <div className="pt-12 text-xs text-gray-500">
            <p>* Aplican términos y condiciones. Financiamiento sujeto a aprobación de crédito.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

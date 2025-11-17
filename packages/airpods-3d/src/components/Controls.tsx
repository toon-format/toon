import { useStore } from '@/store/useStore';

/**
 * Panel de controles de interacción con el modelo 3D
 */
export const Controls = () => {
  const caseOpen = useStore((state) => state.caseOpen);
  const setCaseOpen = useStore((state) => state.setCaseOpen);
  const exploded = useStore((state) => state.exploded);
  const setExploded = useStore((state) => state.setExploded);
  const triggerCameraReset = useStore((state) => state.triggerCameraReset);

  return (
    <div
      className="flex flex-col gap-4 p-6 glass-effect rounded-2xl"
      role="group"
      aria-label="Controles del modelo 3D"
    >
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">
        Controles
      </h3>

      {/* Botón Abrir/Cerrar estuche */}
      <button
        onClick={() => setCaseOpen(!caseOpen)}
        className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl smooth-transition font-medium"
        aria-label={caseOpen ? 'Cerrar estuche' : 'Abrir estuche'}
        aria-pressed={caseOpen}
      >
        {caseOpen ? '📦 Cerrar Estuche' : '📦 Abrir Estuche'}
      </button>

      {/* Botón Ver detalles (Explode) */}
      <button
        onClick={() => setExploded(!exploded)}
        className="px-6 py-3 bg-accent hover:bg-accent/80 text-white rounded-xl smooth-transition font-medium"
        aria-label={exploded ? 'Vista normal' : 'Ver detalles'}
        aria-pressed={exploded}
      >
        {exploded ? '🔍 Vista Normal' : '🔍 Ver Detalles'}
      </button>

      {/* Botón Reset vista */}
      <button
        onClick={triggerCameraReset}
        className="px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl smooth-transition font-medium text-sm"
        aria-label="Resetear vista de cámara"
      >
        ↻ Reset Vista
      </button>

      {/* Instrucciones de teclado */}
      <div className="mt-4 p-4 bg-white/5 rounded-lg">
        <p className="text-xs text-gray-400 mb-2 font-semibold">Atajos de teclado:</p>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>
            <kbd className="px-2 py-1 bg-white/10 rounded text-gray-300">←→</kbd> Rotar
          </li>
          <li>
            <kbd className="px-2 py-1 bg-white/10 rounded text-gray-300">R</kbd> Reset vista
          </li>
          <li>
            <kbd className="px-2 py-1 bg-white/10 rounded text-gray-300">Espacio</kbd> Explode
          </li>
        </ul>
      </div>
    </div>
  );
};

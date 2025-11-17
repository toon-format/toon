import { useStore } from '@/store/useStore';
import { COLOR_CONFIGS, type ColorOption } from '@/types';
import { isValidColor } from '@/utils/helpers';

/**
 * Selector de color interactivo
 */
export const ColorPicker = () => {
  const selectedColor = useStore((state) => state.selectedColor);
  const setSelectedColor = useStore((state) => state.setSelectedColor);

  const handleColorChange = (color: string) => {
    // Validación defensiva del input
    if (isValidColor(color)) {
      setSelectedColor(color as ColorOption);
    }
  };

  return (
    <div
      className="flex flex-col items-center gap-4 p-6 glass-effect rounded-2xl"
      role="group"
      aria-label="Selector de color"
    >
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
        Elige tu color
      </h3>

      <div className="flex gap-4">
        {Object.values(COLOR_CONFIGS).map((config) => (
          <button
            key={config.value}
            onClick={() => handleColorChange(config.value)}
            className={`
              relative w-12 h-12 rounded-full smooth-transition
              ${selectedColor === config.value ? 'ring-4 ring-accent ring-offset-2 ring-offset-black scale-110' : 'hover:scale-105'}
            `}
            style={{ backgroundColor: config.hex }}
            aria-label={`Seleccionar color ${config.name}`}
            aria-pressed={selectedColor === config.value}
          >
            {/* Checkmark cuando está seleccionado */}
            {selectedColor === config.value && (
              <span className="absolute inset-0 flex items-center justify-center text-white">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-400 text-center">
        Color actual: <span className="font-semibold text-white">{COLOR_CONFIGS[selectedColor].name}</span>
      </p>
    </div>
  );
};

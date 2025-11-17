import { useEffect } from 'react';

interface KeyboardConfig {
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onKeyR?: () => void;
  onSpace?: () => void;
}

/**
 * Hook para manejar controles de teclado
 */
export const useKeyboard = (config: KeyboardConfig) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevenir scroll con flechas
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      switch (e.key) {
        case 'ArrowLeft':
          config.onArrowLeft?.();
          break;
        case 'ArrowRight':
          config.onArrowRight?.();
          break;
        case 'ArrowUp':
          config.onArrowUp?.();
          break;
        case 'ArrowDown':
          config.onArrowDown?.();
          break;
        case 'r':
        case 'R':
          config.onKeyR?.();
          break;
        case ' ':
          config.onSpace?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [config]);
};

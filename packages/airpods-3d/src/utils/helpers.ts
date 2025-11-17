/**
 * Detecta si el dispositivo es móvil basado en varios criterios
 */
export const detectMobile = (): boolean => {
  if (typeof window === 'undefined') return false;

  const userAgent = navigator.userAgent || navigator.vendor;
  const isMobileUA =
    /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth < 768;

  return isMobileUA || (hasTouch && isSmallScreen);
};

/**
 * Detecta si el dispositivo tiene bajo rendimiento
 */
export const detectLowPerformance = (): boolean => {
  if (typeof window === 'undefined') return false;

  // Verificar hardware concurrency (núcleos del CPU)
  const cores = navigator.hardwareConcurrency || 1;
  if (cores < 4) return true;

  // Verificar memoria (si está disponible)
  const memory = (navigator as any).deviceMemory;
  if (memory && memory < 4) return true;

  return false;
};

/**
 * Sanitiza el input del usuario para prevenir XSS
 */
export const sanitizeInput = (input: string): string => {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
};

/**
 * Valida si un color es válido
 */
export const isValidColor = (color: string): boolean => {
  return ['white', 'black', 'blue'].includes(color);
};

/**
 * Calcula el progreso de scroll de 0 a 1
 */
export const getScrollProgress = (): number => {
  if (typeof window === 'undefined') return 0;

  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;

  if (docHeight <= 0) return 0;

  return Math.min(Math.max(scrollTop / docHeight, 0), 1);
};

/**
 * Clamp: limita un valor entre min y max
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Lerp: interpolación lineal
 */
export const lerp = (start: number, end: number, alpha: number): number => {
  return start + (end - start) * alpha;
};

/**
 * Debounce: retrasa la ejecución de una función
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle: limita la frecuencia de ejecución de una función
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

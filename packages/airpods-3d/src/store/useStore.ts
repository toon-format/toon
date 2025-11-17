import { create } from 'zustand';

export type ColorOption = 'white' | 'black' | 'blue';

interface AppState {
  // Estado de color
  selectedColor: ColorOption;
  setSelectedColor: (color: ColorOption) => void;

  // Estado del estuche (abierto/cerrado)
  caseOpen: boolean;
  setCaseOpen: (open: boolean) => void;

  // Estado de la animación explode
  exploded: boolean;
  setExploded: (exploded: boolean) => void;

  // Estado de hover
  hoveredPart: string | null;
  setHoveredPart: (part: string | null) => void;

  // Estado de scroll
  scrollProgress: number;
  setScrollProgress: (progress: number) => void;

  // Estado de la cámara
  cameraReset: boolean;
  triggerCameraReset: () => void;

  // Detectar dispositivo móvil
  isMobile: boolean;
  setIsMobile: (mobile: boolean) => void;

  // Estado de carga
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  // Color inicial
  selectedColor: 'white',
  setSelectedColor: (color) => set({ selectedColor: color }),

  // Estuche cerrado por defecto
  caseOpen: false,
  setCaseOpen: (open) => set({ caseOpen: open }),

  // No explodido por defecto
  exploded: false,
  setExploded: (exploded) => set({ exploded }),

  // No hover por defecto
  hoveredPart: null,
  setHoveredPart: (part) => set({ hoveredPart: part }),

  // Scroll progress
  scrollProgress: 0,
  setScrollProgress: (progress) => set({ scrollProgress: progress }),

  // Camera reset
  cameraReset: false,
  triggerCameraReset: () => set({ cameraReset: true }),

  // Mobile detection
  isMobile: false,
  setIsMobile: (mobile) => set({ isMobile: mobile }),

  // Loading state
  isLoading: true,
  setIsLoading: (loading) => set({ isLoading: loading }),
}));

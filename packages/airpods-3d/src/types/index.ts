import type { ColorOption } from '@/store/useStore';

export type { ColorOption };

export interface Feature {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface ColorConfig {
  name: string;
  value: ColorOption;
  hex: string;
  metalness: number;
  roughness: number;
}

export const COLOR_CONFIGS: Record<ColorOption, ColorConfig> = {
  white: {
    name: 'Blanco',
    value: 'white',
    hex: '#f5f5f7',
    metalness: 0.1,
    roughness: 0.3,
  },
  black: {
    name: 'Negro',
    value: 'black',
    hex: '#1d1d1f',
    metalness: 0.2,
    roughness: 0.2,
  },
  blue: {
    name: 'Azul',
    value: 'blue',
    hex: '#4a9eff',
    metalness: 0.3,
    roughness: 0.25,
  },
};

export const FEATURES: Feature[] = [
  {
    id: 'audio',
    title: 'Audio Espacial',
    description: 'Sonido envolvente que te sigue con seguimiento dinámico de cabeza',
    icon: '🎵',
  },
  {
    id: 'battery',
    title: '30h de Batería',
    description: 'Hasta 6 horas en los auriculares, 24 adicionales con el estuche',
    icon: '🔋',
  },
  {
    id: 'adaptive',
    title: 'Audio Adaptativo',
    description: 'Ajusta automáticamente el sonido según tu entorno',
    icon: '🎧',
  },
  {
    id: 'water',
    title: 'Resistente al Agua',
    description: 'Certificación IPX4 para resistencia al sudor y agua',
    icon: '💧',
  },
];

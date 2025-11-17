# Estructura del Proyecto AirPods 3D

```
airpods-3d/
│
├── 📁 public/                      # Assets estáticos
│   ├── 📁 models/
│   │   └── README.md              # Guía para agregar modelo GLTF
│   └── vite.svg                   # Favicon
│
├── 📁 src/                         # Código fuente
│   │
│   ├── 📁 components/             # Componentes React (11)
│   │   ├── AirPodsModel.tsx      # 🎨 Modelo 3D + placeholder
│   │   ├── Scene3D.tsx           # 🎬 Canvas WebGL + iluminación
│   │   ├── Navbar.tsx            # 🧭 Navegación superior
│   │   ├── ColorPicker.tsx       # 🎨 Selector de colores
│   │   ├── Controls.tsx          # 🎮 Panel de controles
│   │   ├── HeroSection.tsx       # 🦸 Sección hero principal
│   │   ├── FeaturesSection.tsx   # ⭐ Grid de características
│   │   ├── GallerySection.tsx    # 🖼️ Galería + explode trigger
│   │   ├── CTASection.tsx        # 📢 Call-to-action
│   │   └── Loading.tsx           # ⏳ Pantalla de carga
│   │
│   ├── 📁 hooks/                  # Hooks personalizados (3)
│   │   ├── useKeyboard.ts        # ⌨️ Controles de teclado
│   │   ├── useScrollAnimation.ts # 📜 Animaciones scroll
│   │   └── useMobileDetection.ts # 📱 Detección móvil
│   │
│   ├── 📁 store/                  # Estado global
│   │   └── useStore.ts           # 🗄️ Zustand store
│   │
│   ├── 📁 types/                  # TypeScript types
│   │   └── index.ts              # 📝 Tipos y configs
│   │
│   ├── 📁 utils/                  # Utilidades
│   │   └── helpers.ts            # 🛠️ Funciones auxiliares
│   │
│   ├── 📁 tests/                  # Tests (3 archivos)
│   │   ├── setup.ts              # ⚙️ Configuración tests
│   │   ├── App.test.tsx          # ✅ Tests de App
│   │   └── store.test.ts         # ✅ Tests de store
│   │
│   ├── App.tsx                   # 🏠 Componente principal
│   ├── main.tsx                  # 🚀 Entry point
│   └── index.css                 # 🎨 Estilos globales
│
├── 📄 index.html                  # HTML principal + SEO
│
├── ⚙️ Configuración
│   ├── vite.config.ts            # Vite + optimizaciones
│   ├── vitest.config.ts          # Tests
│   ├── tsconfig.json             # TypeScript
│   ├── tsconfig.node.json        # TypeScript Node
│   ├── tailwind.config.js        # Tailwind CSS
│   ├── postcss.config.js         # PostCSS
│   ├── .eslintrc.cjs             # ESLint
│   ├── .prettierrc               # Prettier
│   └── .gitignore                # Git ignore
│
├── 📦 Dependencias
│   ├── package.json              # Dependencias + scripts
│   └── package-lock.json         # Lock file
│
└── 📚 Documentación
    ├── README.md                 # Documentación principal (10KB)
    ├── GETTING_STARTED.md        # Guía de inicio rápido
    ├── PROJECT_SUMMARY.md        # Resumen del proyecto
    ├── STRUCTURE.md              # Este archivo
    └── LICENSE                   # MIT License

```

## 📊 Estadísticas

### Archivos por Tipo
- **React Components**: 11 archivos `.tsx`
- **TypeScript**: 7 archivos `.ts`
- **Tests**: 3 archivos de test
- **Config**: 9 archivos de configuración
- **Docs**: 5 archivos de documentación

### Líneas de Código (aproximado)
- `src/`: ~2,000 líneas
- `tests/`: ~200 líneas
- `config/`: ~100 líneas
- **Total**: ~2,300 líneas de código

## 🗂️ Descripción de Directorios

### `/public`
Assets estáticos que se copian tal cual al build. Incluye modelos 3D y favicon.

### `/src/components`
Componentes React reutilizables. Cada componente tiene una responsabilidad única.

### `/src/hooks`
Hooks personalizados para lógica reutilizable (keyboard, scroll, mobile).

### `/src/store`
Estado global con Zustand. Un único archivo para todo el estado de la app.

### `/src/types`
Tipos TypeScript y configuraciones constantes (colores, features).

### `/src/utils`
Funciones auxiliares puras (helpers, validación, sanitización).

### `/src/tests`
Tests unitarios y de integración con Vitest y React Testing Library.

## 🔄 Flujo de Datos

```
main.tsx
   ↓
App.tsx (hooks globales)
   ↓
├── Navbar
├── HeroSection
│   ├── Scene3D (Canvas WebGL)
│   │   ├── Lighting
│   │   ├── CameraControls
│   │   └── AirPodsModel (3D)
│   ├── ColorPicker
│   └── Controls
├── FeaturesSection
├── GallerySection (trigger explode)
└── CTASection

useStore (Zustand) ← Estado compartido entre todos
```

## 🎯 Componentes Clave

### `AirPodsModel.tsx` (Más complejo)
- 200+ líneas
- Renderiza modelo 3D (placeholder o GLTF)
- Maneja animaciones (open case, explode, float, hover)
- 3 sub-componentes: CasePlaceholder, EarbudPlaceholder

### `Scene3D.tsx`
- Configura Canvas de Three.js
- Sistema de iluminación (5 luces)
- Controles de cámara con límites
- Optimizaciones de performance

### `App.tsx`
- Orquesta todos los componentes
- Inicializa hooks globales
- Maneja keyboard events
- Efecto de fade-in inicial

## 🧩 Arquitectura

**Patrón**: Component-Based Architecture con estado centralizado

**Ventajas**:
- ✅ Componentes pequeños y reutilizables
- ✅ Estado predecible con Zustand
- ✅ Fácil de testear
- ✅ Escalable

**Stack**:
```
React 18.3
  ├── Three.js 0.169
  │   └── @react-three/fiber 8.17
  │       └── @react-three/drei 9.114
  ├── Zustand 4.5 (state)
  ├── Tailwind CSS 3.4 (styles)
  └── TypeScript 5.6 (types)
```

## 📦 Build Output

```
dist/
├── index.html                    # HTML minificado
├── assets/
│   ├── index-[hash].css         # ~16 KB (3.8 KB gzip)
│   ├── index-[hash].js          # ~23 KB (6.7 KB gzip)
│   ├── react-vendor-[hash].js   # ~140 KB (44 KB gzip)
│   └── three-vendor-[hash].js   # ~966 KB (259 KB gzip)
└── vite.svg
```

## 🔗 Imports Principales

```typescript
// Three.js
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, Float, ... } from '@react-three/drei'
import * as THREE from 'three'

// Estado
import { useStore } from '@/store/useStore'

// React
import { useState, useEffect, useRef } from 'react'

// Styles
import './index.css' // Tailwind + custom CSS
```

## 🎨 Design System

### Colores
```typescript
black: '#000000'     // Background
white: '#ffffff'     // Text primary
gray: '#a0a0a0'      // Text secondary
accent: '#4a9eff'    // Primary action
```

### Spacing
- Base: 4px (Tailwind default)
- Container max-width: 1280px (7xl)
- Section padding: 5rem (py-20)

### Typography
- Font: Inter (Google Fonts)
- Sizes: text-sm → text-6xl
- Weights: 300, 400, 500, 600, 700

## 🚀 Scripts NPM

```bash
dev              # Vite dev server (HMR)
build            # TypeScript check + Vite build
preview          # Preview production build
test             # Vitest
test:ui          # Vitest UI
test:coverage    # Coverage report
lint             # ESLint check
lint:fix         # ESLint auto-fix
format           # Prettier format
format:check     # Prettier check
type-check       # TypeScript check (no emit)
```

## 📝 Convenciones de Código

### Naming
- **Componentes**: PascalCase (`AirPodsModel.tsx`)
- **Hooks**: camelCase con `use` prefix (`useKeyboard.ts`)
- **Utils**: camelCase (`helpers.ts`)
- **Types**: PascalCase (`ColorOption`)
- **Constants**: UPPER_SNAKE_CASE (`COLOR_CONFIGS`)

### File Structure
```typescript
// 1. Imports
import { ... } from '...'

// 2. Types/Interfaces
interface Props { ... }

// 3. Component/Function
export const Component = () => { ... }

// 4. Exports adicionales (si hay)
export const helper = () => { ... }
```

### Comments
```typescript
/**
 * JSDoc para funciones exportadas
 */
export const func = () => { ... }

// Comentarios inline para lógica compleja
const value = calculate() // Por qué es necesario
```

## 🔐 Seguridad

### Sanitización
- Inputs de usuario sanitizados en `helpers.ts`
- Validación de props con TypeScript
- XSS prevention con textContent

### Validación
```typescript
isValidColor(color: string): boolean
sanitizeInput(input: string): string
```

## 🎓 Conceptos Demostrados

1. **React Three Fiber**: Integración de Three.js con React
2. **State Management**: Zustand para estado global
3. **Custom Hooks**: Lógica reutilizable
4. **TypeScript**: Tipado estricto y genéricos
5. **Performance**: Code splitting, lazy loading
6. **Testing**: Tests con mocks de WebGL
7. **Accessibility**: ARIA labels, keyboard controls
8. **Responsive**: Mobile-first design
9. **Build Optimization**: Vite + Terser
10. **Documentation**: READMEs completos

---

**Esta estructura está diseñada para ser:**
- ✅ **Escalable**: Fácil agregar nuevos componentes
- ✅ **Mantenible**: Código organizado y documentado
- ✅ **Testeable**: Componentes aislados
- ✅ **Performante**: Optimizaciones aplicadas

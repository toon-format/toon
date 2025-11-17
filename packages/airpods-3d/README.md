# AirPods 3D - Landing Interactiva

Una landing page 3D completamente interactiva de AirPods construida con React, Three.js y TypeScript. Experimenta una visualización inmersiva con controles en tiempo real, animaciones fluidas y un diseño responsivo.

![AirPods 3D Preview](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react)
![Three.js](https://img.shields.io/badge/Three.js-0.169-000000?style=for-the-badge&logo=three.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)

## ✨ Características

### 🎮 Interactividad
- **Rotación por arrastre**: Controles de órbita con límites suaves
- **Selector de color**: Cambia entre blanco, negro y azul en tiempo real
- **Animación de apertura**: Simula la apertura del estuche con animación de bisagra
- **Vista explodida**: Separa los componentes para ver detalles
- **Efectos hover**: Resalta el auricular derecho al pasar el cursor
- **Controles de teclado**: Flechas para rotar, R para reset, Espacio para explode

### 🎨 Visualización
- **Modelo 3D placeholder**: Geometrías simples que pueden reemplazarse con un modelo GLTF
- **Iluminación realista**: Sistema de 3 puntos de luz + ambiente HDRI
- **Sombras suaves**: Contact shadows para mayor realismo
- **Materiales PBR**: Metalness y roughness configurables por color
- **Animación de flotación**: Movimiento sutil para dar vida al modelo

### 📱 Rendimiento y Responsividad
- **Optimizado para móviles**: DPR adaptativo y eventos optimizados
- **Detección automática**: Identifica dispositivos de baja gama
- **Lazy loading**: Carga asíncrona de componentes 3D con Suspense
- **Code splitting**: Chunks separados para React y Three.js
- **Preloading**: Precarga del modelo GLTF si existe

### ♿ Accesibilidad
- **HTML semántico**: Uso correcto de elementos ARIA
- **Controles de teclado**: Navegación completa sin mouse
- **Etiquetas ARIA**: Labels descriptivos en todos los controles
- **Alt text**: Descripciones para lectores de pantalla
- **Contraste alto**: Diseño con fondo negro y texto claro

### 📜 Scroll Storytelling
1. **Hero**: Canvas 3D con controles y selector de color
2. **Features**: Grid de características con animaciones
3. **Gallery**: Activación automática de vista explodida
4. **CTA**: Llamado a la acción con precio y beneficios

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 18.0 o superior
- npm, yarn o pnpm

### Instalación

```bash
# Clonar o navegar al proyecto
cd packages/airpods-3d

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

El proyecto estará disponible en `http://localhost:3000`

### Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Inicia servidor de desarrollo con HMR

# Build
npm run build            # Compila para producción (TypeScript + Vite)
npm run preview          # Preview del build de producción

# Testing
npm test                 # Ejecuta tests con Vitest
npm run test:ui          # Abre interfaz de Vitest
npm run test:coverage    # Genera reporte de cobertura

# Linting y Formateo
npm run lint             # Ejecuta ESLint
npm run lint:fix         # Corrige errores de ESLint automáticamente
npm run format           # Formatea código con Prettier
npm run format:check     # Verifica formato sin modificar archivos
npm run type-check       # Verifica tipos de TypeScript sin compilar
```

## 📁 Estructura del Proyecto

```
airpods-3d/
├── public/
│   ├── models/
│   │   └── airpods.glb          # [OPCIONAL] Modelo 3D GLTF
│   └── images/                   # Assets estáticos
├── src/
│   ├── components/
│   │   ├── AirPodsModel.tsx     # Modelo 3D (placeholder + GLTF)
│   │   ├── Scene3D.tsx          # Canvas y configuración de Three.js
│   │   ├── Navbar.tsx           # Navegación
│   │   ├── ColorPicker.tsx      # Selector de colores
│   │   ├── Controls.tsx         # Panel de controles
│   │   ├── Loading.tsx          # Pantalla de carga
│   │   ├── HeroSection.tsx      # Sección hero
│   │   ├── FeaturesSection.tsx  # Características
│   │   ├── GallerySection.tsx   # Galería/Explode
│   │   └── CTASection.tsx       # Call-to-action
│   ├── hooks/
│   │   ├── useKeyboard.ts       # Controles de teclado
│   │   ├── useScrollAnimation.ts# Animaciones de scroll
│   │   └── useMobileDetection.ts# Detección de móviles
│   ├── store/
│   │   └── useStore.ts          # Estado global con Zustand
│   ├── types/
│   │   └── index.ts             # Tipos TypeScript
│   ├── utils/
│   │   └── helpers.ts           # Funciones auxiliares
│   ├── tests/
│   │   ├── setup.ts             # Configuración de tests
│   │   ├── App.test.tsx         # Tests de App
│   │   └── store.test.ts        # Tests de store
│   ├── App.tsx                  # Componente principal
│   ├── main.tsx                 # Punto de entrada
│   └── index.css                # Estilos globales
├── index.html                    # HTML principal con meta tags SEO
├── vite.config.ts               # Configuración de Vite
├── vitest.config.ts             # Configuración de Vitest
├── tsconfig.json                # Configuración de TypeScript
├── tailwind.config.js           # Configuración de Tailwind
├── postcss.config.js            # Configuración de PostCSS
├── .eslintrc.cjs                # Configuración de ESLint
├── .prettierrc                  # Configuración de Prettier
├── package.json                 # Dependencias y scripts
└── README.md                    # Este archivo
```

## 🎨 Personalización

### Cambiar Colores

Los colores se definen en `src/types/index.ts`:

```typescript
export const COLOR_CONFIGS: Record<ColorOption, ColorConfig> = {
  white: {
    name: 'Blanco',
    value: 'white',
    hex: '#f5f5f7',
    metalness: 0.1,
    roughness: 0.3,
  },
  // Agregar más colores...
};
```

### Agregar Modelo GLTF Real

1. Coloca tu archivo `.glb` en `public/models/airpods.glb`
2. En `src/components/AirPodsModel.tsx`, cambia:

```typescript
<AirPodsModel useGLTFModel={true} />
```

3. Ajusta la escala y posición según tu modelo:

```typescript
<primitive object={scene} scale={1.5} position={[0, 0, 0]} />
```

**Nota**: Puedes obtener modelos 3D gratuitos en:
- [Sketchfab](https://sketchfab.com) (filtrar por licencia Creative Commons)
- [Google Poly](https://poly.pizza)
- [Turbosquid Free](https://www.turbosquid.com/Search/3D-Models/free)

### Cambiar Iluminación

En `src/components/Scene3D.tsx`, modifica el componente `Lighting`:

```typescript
<Environment preset="studio" /> // Opciones: sunset, dawn, night, warehouse, forest, etc.
```

### Agregar Más Features

Edita el array `FEATURES` en `src/types/index.ts`:

```typescript
export const FEATURES: Feature[] = [
  {
    id: 'nueva-feature',
    title: 'Nueva Característica',
    description: 'Descripción de la feature',
    icon: '🎯',
  },
  // ...
];
```

## 🔐 Seguridad

El proyecto incluye:
- ✅ Sanitización de inputs en `utils/helpers.ts`
- ✅ Validación defensiva de props
- ✅ TypeScript estricto para type safety
- ✅ Sin dependencias con vulnerabilidades conocidas

## 🧪 Testing

Los tests cubren:
- Renderizado de componentes principales
- Funcionalidad del store
- Validación de interacciones

```bash
# Ejecutar todos los tests
npm test

# Ver cobertura
npm run test:coverage

# Modo watch
npm test -- --watch
```

## 📱 Soporte de Navegadores

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+
- Chrome Android 90+
- Safari iOS 14+

**Nota**: WebGL 2.0 es requerido. Dispositivos muy antiguos pueden no ser compatibles.

## ⚡ Optimización de Rendimiento

### Implementado
- ✅ Adaptive DPR (Device Pixel Ratio)
- ✅ Adaptive Events (reduce eventos en bajo rendimiento)
- ✅ Code splitting por vendor
- ✅ Lazy loading de componentes 3D
- ✅ Memoización de materiales
- ✅ Throttling de eventos de scroll
- ✅ Preload de assets

### Recomendaciones Adicionales
- Usar texturas comprimidas (KTX2, Basis)
- Implementar LOD (Level of Detail) para modelos complejos
- Usar `drei`'s `<Detailed>` para modelos con múltiples niveles de detalle
- Reducir número de luces en móviles

## 🎯 Próximos Pasos

Ideas para expandir el proyecto:
- [ ] Agregar más animaciones con GSAP ScrollTrigger
- [ ] Implementar carrito de compras funcional
- [ ] Agregar más variantes de modelos (AirPods Pro, Max)
- [ ] Sistema de configurador 3D avanzado
- [ ] Integración con API de e-commerce
- [ ] Modo VR/AR con WebXR
- [ ] Exportar configuraciones como imagen

## 🐛 Troubleshooting

### El canvas no se muestra
- Verifica que tu navegador soporte WebGL 2.0: [https://get.webgl.org/webgl2/](https://get.webgl.org/webgl2/)
- Revisa la consola del navegador para errores

### Rendimiento bajo
- Reduce el DPR en `Scene3D.tsx`: `dpr={[1, 1]}`
- Desactiva sombras temporalmente
- Verifica que `powerPreference` esté en `"high-performance"`

### El modelo GLTF no carga
- Verifica que el archivo esté en `public/models/airpods.glb`
- Comprueba que el modelo sea válido usando [GLTF Validator](https://github.khronos.org/glTF-Validator/)
- Revisa la consola para errores de carga

### Tests fallan
- Ejecuta `npm install` para asegurar todas las dependencias
- Limpia caché: `npm test -- --clearCache`
- Verifica que Node.js sea >= 18.0

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📧 Contacto

Para preguntas o sugerencias, abre un issue en el repositorio.

---

**Desarrollado con ❤️ usando React + Three.js + TypeScript**

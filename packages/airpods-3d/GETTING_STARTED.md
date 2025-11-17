# Guía de Inicio - AirPods 3D

Esta guía te ayudará a poner en marcha el proyecto en minutos.

## 📋 Tabla de Contenidos

1. [Instalación](#instalación)
2. [Primer Uso](#primer-uso)
3. [Desarrollo](#desarrollo)
4. [Build y Deploy](#build-y-deploy)
5. [Personalización Rápida](#personalización-rápida)

## 🚀 Instalación

### Paso 1: Verificar Prerrequisitos

```bash
# Verificar Node.js (debe ser 18.0 o superior)
node --version

# Verificar npm
npm --version
```

Si no tienes Node.js, descárgalo de [nodejs.org](https://nodejs.org/)

### Paso 2: Instalar Dependencias

```bash
# Navegar al directorio del proyecto
cd packages/airpods-3d

# Instalar todas las dependencias
npm install
```

Esto instalará:
- React y React DOM
- Three.js y React Three Fiber
- Tailwind CSS
- TypeScript
- Vitest para testing
- Y todas las herramientas de desarrollo

## 🎮 Primer Uso

### Iniciar el Servidor de Desarrollo

```bash
npm run dev
```

Tu navegador se abrirá automáticamente en `http://localhost:3000`

### ¿Qué Verás?

1. **Hero Section**: Modelo 3D de AirPods (placeholder) en el centro
2. **Controles**: Panel derecho con botones de interacción
3. **Selector de Color**: Cambia entre blanco, negro y azul
4. **Scroll**: Haz scroll para ver las diferentes secciones

### Interacciones Disponibles

#### Mouse/Touch
- **Arrastrar**: Rotar el modelo
- **Scroll**: Ver diferentes secciones
- **Click en colores**: Cambiar color del modelo
- **Botones**: Abrir estuche, ver detalles, reset

#### Teclado
- `←` `→`: Rotar modelo
- `R`: Reset vista de cámara
- `Espacio`: Toggle vista explodida

## 💻 Desarrollo

### Estructura de Archivos Importantes

```
src/
├── App.tsx                    # 👈 EMPIEZA AQUÍ
├── components/
│   ├── AirPodsModel.tsx      # Modelo 3D - Modifica aquí para cambiar el 3D
│   ├── Scene3D.tsx           # Configuración de Three.js
│   └── ColorPicker.tsx       # Selector de colores
├── store/useStore.ts          # Estado global - Agrega nuevos estados aquí
└── types/index.ts             # Tipos y configuraciones - Agrega colores/features
```

### Hot Module Replacement (HMR)

El proyecto usa Vite con HMR. Los cambios se reflejan instantáneamente:

1. Abre el proyecto en tu editor
2. Modifica cualquier archivo en `src/`
3. Guarda el archivo
4. El navegador se actualiza automáticamente

### Modo de Desarrollo vs Producción

```bash
# Desarrollo (sin optimizaciones, con source maps)
npm run dev

# Producción (optimizado, minificado)
npm run build
npm run preview
```

## 🏗️ Build y Deploy

### Build para Producción

```bash
# Compilar TypeScript y construir assets
npm run build
```

Esto generará:
- Carpeta `dist/` con archivos optimizados
- CSS minificado
- JS minificado y dividido en chunks
- Assets optimizados

### Preview del Build

```bash
# Ver cómo se verá en producción
npm run preview
```

### Deploy

#### Vercel (Recomendado)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel
```

#### Netlify

```bash
# Instalar Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

#### GitHub Pages

```bash
# Agregar a vite.config.ts
export default defineConfig({
  base: '/nombre-repo/',
  // ...
})

# Build y deploy
npm run build
gh-pages -d dist
```

## 🎨 Personalización Rápida

### 1. Cambiar Título y Descripción

Edita `src/components/HeroSection.tsx`:

```typescript
<h1 className="text-5xl md:text-6xl font-bold text-gradient leading-tight">
  Tu Título Aquí  {/* 👈 Cambiar */}
</h1>
<p className="text-lg text-gray-300 leading-relaxed">
  Tu descripción aquí  {/* 👈 Cambiar */}
</p>
```

### 2. Agregar un Nuevo Color

Edita `src/types/index.ts`:

```typescript
export const COLOR_CONFIGS: Record<ColorOption, ColorConfig> = {
  // ... colores existentes
  red: {  // 👈 Nuevo color
    name: 'Rojo',
    value: 'red',
    hex: '#ff0000',
    metalness: 0.2,
    roughness: 0.25,
  },
};
```

Actualiza el tipo:
```typescript
export type ColorOption = 'white' | 'black' | 'blue' | 'red';  // 👈 Agregar 'red'
```

### 3. Cambiar Precio

Edita `src/components/HeroSection.tsx` y `src/components/CTASection.tsx`:

```typescript
<p className="text-4xl font-bold text-white mb-2">$299</p>  {/* 👈 Cambiar */}
```

### 4. Modificar Features

Edita `src/types/index.ts`:

```typescript
export const FEATURES: Feature[] = [
  {
    id: 'nueva-feature',
    title: 'Tu Feature',
    description: 'Descripción de la feature',
    icon: '🚀',  // Emoji o ícono
  },
  // ...
];
```

### 5. Cambiar Colores del Tema

Edita `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      'accent': '#ff6b6b',  // 👈 Color de acento
      // ...
    },
  },
},
```

### 6. Ajustar Iluminación 3D

Edita `src/components/Scene3D.tsx`:

```typescript
<Environment preset="sunset" />  {/* 👈 Cambiar preset */}
// Opciones: studio, sunset, dawn, night, warehouse, forest, etc.
```

## 🔧 Comandos Útiles

```bash
# Verificar tipos de TypeScript
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Formateo
npm run format
npm run format:check

# Tests
npm test
npm run test:ui
npm run test:coverage
```

## 🐛 Problemas Comunes

### Puerto 3000 ya en uso

```bash
# Cambiar puerto en vite.config.ts
server: {
  port: 3001,  // 👈 Cambiar
}
```

### Errores de TypeScript

```bash
# Limpiar caché y reinstalar
rm -rf node_modules package-lock.json
npm install
```

### Canvas no se muestra

1. Verifica WebGL: [https://get.webgl.org/webgl2/](https://get.webgl.org/webgl2/)
2. Actualiza drivers de gráficos
3. Prueba en otro navegador

### Rendimiento bajo

```bash
# En src/components/Scene3D.tsx, reducir DPR
dpr={[1, 1]}  // En lugar de [1, 2]
```

## 📚 Próximos Pasos

1. ✅ Proyecto funcionando
2. 📖 Lee el [README.md](README.md) completo
3. 🎨 Personaliza colores y contenido
4. 🎯 Agrega tu modelo GLTF (ver `public/models/README.md`)
5. 🧪 Ejecuta los tests: `npm test`
6. 🚀 Deploy a producción

## 💡 Tips

- **Usa el devtools**: `Ctrl+Shift+I` para ver errores
- **Revisa la consola**: Errores y warnings aparecen ahí
- **Hot reload**: Los cambios se reflejan al instante
- **Mobile first**: Prueba en responsive mode (`Ctrl+Shift+M` en Chrome)

## 🆘 Ayuda

Si tienes problemas:
1. Revisa los [Problemas Comunes](#problemas-comunes)
2. Lee el [README.md](README.md) completo
3. Verifica la consola del navegador
4. Busca el error en GitHub Issues

---

¡Feliz desarrollo! 🚀

import { useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { FeaturesSection } from './components/FeaturesSection';
import { GallerySection } from './components/GallerySection';
import { CTASection } from './components/CTASection';
import { Loading } from './components/Loading';
import { useStore } from './store/useStore';
import { useMobileDetection } from './hooks/useMobileDetection';
import { useScrollAnimation } from './hooks/useScrollAnimation';
import { useKeyboard } from './hooks/useKeyboard';

/**
 * Componente principal de la aplicación
 */
function App() {
  const isLoading = useStore((state) => state.isLoading);
  const setExploded = useStore((state) => state.setExploded);
  const exploded = useStore((state) => state.exploded);
  const triggerCameraReset = useStore((state) => state.triggerCameraReset);

  // Hooks personalizados
  useMobileDetection();
  useScrollAnimation();

  // Controles de teclado
  useKeyboard({
    onKeyR: triggerCameraReset,
    onSpace: () => setExploded(!exploded),
  });

  // Efecto de entrada (fade in)
  useEffect(() => {
    document.body.style.opacity = '0';
    setTimeout(() => {
      document.body.style.transition = 'opacity 0.5s ease-in';
      document.body.style.opacity = '1';
    }, 100);
  }, []);

  return (
    <>
      {/* Pantalla de carga */}
      {isLoading && <Loading />}

      {/* Navegación */}
      <Navbar />

      {/* Contenido principal */}
      <main>
        <HeroSection />
        <FeaturesSection />
        <GallerySection />
        <CTASection />
      </main>

      {/* Footer */}
      <footer className="bg-black border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4">
            <p className="text-gray-400 text-sm">
              © 2024 AirPods 3D. Proyecto demostrativo con React + Three.js
            </p>
            <p className="text-gray-500 text-xs">
              Desarrollado con React, Three.js, TypeScript y Tailwind CSS
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

export default App;

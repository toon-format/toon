import { Suspense, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  OrbitControls,
  Environment,
  PerspectiveCamera,
  AdaptiveDpr,
  AdaptiveEvents,
  ContactShadows,
  Float,
} from '@react-three/drei';
import { AirPodsModel } from './AirPodsModel';
import { useStore } from '@/store/useStore';
import * as THREE from 'three';

/**
 * Componente de iluminación realista
 */
const Lighting = () => {
  return (
    <>
      {/* Luz ambiental suave */}
      <ambientLight intensity={0.4} />

      {/* Luz principal (key light) */}
      <directionalLight
        position={[5, 5, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      {/* Luz de relleno (fill light) */}
      <directionalLight position={[-3, 2, -2]} intensity={0.5} />

      {/* Luz trasera (rim light) para contorno */}
      <directionalLight position={[0, 3, -5]} intensity={0.8} color="#4a9eff" />

      {/* Luz puntual para detalles */}
      <pointLight position={[0, 2, 0]} intensity={0.3} color="#ffffff" />

      {/* Environment HDRI para reflejos realistas */}
      <Environment preset="studio" />
    </>
  );
};

/**
 * Componente de fallback durante la carga
 */
const LoadingFallback = () => {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial wireframe color="#4a9eff" />
    </mesh>
  );
};

/**
 * Controles de cámara con límites
 */
const CameraControls = () => {
  const controlsRef = useRef<any>(null);
  const cameraReset = useStore((state) => state.cameraReset);
  const isMobile = useStore((state) => state.isMobile);

  useEffect(() => {
    if (cameraReset && controlsRef.current) {
      controlsRef.current.reset();
    }
  }, [cameraReset]);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableZoom={true}
      minDistance={3}
      maxDistance={8}
      minPolarAngle={Math.PI / 4}
      maxPolarAngle={Math.PI / 1.5}
      enableDamping
      dampingFactor={0.05}
      rotateSpeed={isMobile ? 0.5 : 0.8}
      zoomSpeed={0.8}
      touches={{
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      }}
    />
  );
};

interface Scene3DProps {
  className?: string;
}

/**
 * Escena 3D principal con WebGL Canvas
 */
export const Scene3D = ({ className = '' }: Scene3DProps) => {
  const setIsLoading = useStore((state) => state.setIsLoading);
  const isMobile = useStore((state) => state.isMobile);

  useEffect(() => {
    // Simular carga inicial
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [setIsLoading]);

  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        shadows
        dpr={[1, isMobile ? 1.5 : 2]} // Limitar DPR en móviles
        gl={{
          powerPreference: 'high-performance',
          antialias: true,
          alpha: true,
          stencil: false,
          depth: true,
        }}
        performance={{
          min: 0.5,
        }}
      >
        {/* Cámara con posición inicial */}
        <PerspectiveCamera makeDefault position={[0, 1, 5]} fov={50} />

        {/* Controles de órbita */}
        <CameraControls />

        {/* Adaptadores de rendimiento */}
        <AdaptiveDpr pixelated />
        <AdaptiveEvents />

        {/* Iluminación */}
        <Lighting />

        {/* Modelo 3D con Suspense para carga asíncrona */}
        <Suspense fallback={<LoadingFallback />}>
          {/* Float agrega efecto de flotación suave */}
          <Float
            speed={1.5}
            rotationIntensity={0.2}
            floatIntensity={0.5}
            floatingRange={[-0.1, 0.1]}
          >
            <AirPodsModel />
          </Float>

          {/* Sombras de contacto suaves */}
          <ContactShadows
            position={[0, -1, 0]}
            opacity={0.4}
            scale={5}
            blur={2}
            far={2}
            resolution={512}
            color="#000000"
          />
        </Suspense>

        {/* Fog para profundidad */}
        <fog attach="fog" args={['#000000', 5, 15]} />
      </Canvas>
    </div>
  );
};

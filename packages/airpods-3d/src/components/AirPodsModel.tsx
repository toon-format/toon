import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '@/store/useStore';
import { COLOR_CONFIGS } from '@/types';
import type { ColorOption } from '@/types';

/**
 * Componente del modelo 3D de AirPods
 * Si existe un archivo GLB en /models/airpods.glb, se carga automáticamente
 * Si no existe, muestra un placeholder con geometrías simples
 */

interface AirPodsModelProps {
  useGLTFModel?: boolean;
}

// Placeholder: Estuche simplificado
const CasePlaceholder = ({ color }: { color: ColorOption }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const caseOpen = useStore((state) => state.caseOpen);
  const exploded = useStore((state) => state.exploded);
  const hoveredPart = useStore((state) => state.hoveredPart);
  const setHoveredPart = useStore((state) => state.setHoveredPart);

  const colorConfig = COLOR_CONFIGS[color];
  const isHovered = hoveredPart === 'case';

  useFrame(() => {
    if (meshRef.current) {
      // Animación de apertura del estuche (rotación de la tapa)
      const targetRotation = caseOpen ? -Math.PI / 3 : 0;
      meshRef.current.rotation.x = THREE.MathUtils.lerp(
        meshRef.current.rotation.x,
        targetRotation,
        0.1
      );

      // Animación explode: mover el estuche hacia abajo
      const targetY = exploded ? -1.5 : 0;
      meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, 0.1);

      // Efecto hover: scale
      const targetScale = isHovered ? 1.05 : 1;
      meshRef.current.scale.setScalar(
        THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale, 0.1)
      );
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[0, -0.3, 0]}
      onPointerOver={() => setHoveredPart('case')}
      onPointerOut={() => setHoveredPart(null)}
    >
      {/* Base del estuche */}
      <boxGeometry args={[1, 0.5, 1.2]} />
      <meshStandardMaterial
        color={colorConfig.hex}
        metalness={colorConfig.metalness}
        roughness={colorConfig.roughness}
        emissive={isHovered ? colorConfig.hex : '#000000'}
        emissiveIntensity={isHovered ? 0.2 : 0}
      />
    </mesh>
  );
};

// Placeholder: Auricular individual
const EarbudPlaceholder = ({
  position,
  rotation,
  color,
  side,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  color: ColorOption;
  side: 'left' | 'right';
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const stemRef = useRef<THREE.Mesh>(null);
  const exploded = useStore((state) => state.exploded);
  const hoveredPart = useStore((state) => state.hoveredPart);
  const setHoveredPart = useStore((state) => state.setHoveredPart);

  const colorConfig = COLOR_CONFIGS[color];
  const isHovered = hoveredPart === side;

  useFrame((state) => {
    if (meshRef.current && stemRef.current) {
      // Animación explode: separar auriculares del estuche
      const explodeOffset = side === 'left' ? [-1.5, 1, 0.5] : [1.5, 1, -0.5];
      const targetPos = exploded
        ? [position[0] + explodeOffset[0], position[1] + explodeOffset[1], position[2] + explodeOffset[2]]
        : position;

      meshRef.current.position.x = THREE.MathUtils.lerp(
        meshRef.current.position.x,
        targetPos[0],
        0.08
      );
      meshRef.current.position.y = THREE.MathUtils.lerp(
        meshRef.current.position.y,
        targetPos[1],
        0.08
      );
      meshRef.current.position.z = THREE.MathUtils.lerp(
        meshRef.current.position.z,
        targetPos[2],
        0.08
      );

      // Animación de flotación sutil
      const floatOffset = Math.sin(state.clock.elapsedTime * 1.5 + (side === 'left' ? 0 : Math.PI)) * 0.05;
      meshRef.current.position.y += floatOffset;

      // Efecto hover: resaltar
      const targetScale = isHovered ? 1.1 : 1;
      meshRef.current.scale.setScalar(
        THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale, 0.1)
      );

      // Sincronizar stem con mesh
      stemRef.current.position.copy(meshRef.current.position);
      stemRef.current.rotation.copy(meshRef.current.rotation);
    }
  });

  return (
    <group
      onPointerOver={() => setHoveredPart(side)}
      onPointerOut={() => setHoveredPart(null)}
    >
      {/* Cabeza del auricular (esférico) */}
      <mesh ref={meshRef} position={position} rotation={rotation}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial
          color={colorConfig.hex}
          metalness={colorConfig.metalness}
          roughness={colorConfig.roughness}
          emissive={isHovered ? colorConfig.hex : '#000000'}
          emissiveIntensity={isHovered ? 0.3 : 0}
        />
      </mesh>
      {/* Tallo del auricular */}
      <mesh ref={stemRef} position={[position[0], position[1] - 0.4, position[2]]}>
        <cylinderGeometry args={[0.08, 0.08, 0.6, 16]} />
        <meshStandardMaterial
          color={colorConfig.hex}
          metalness={colorConfig.metalness}
          roughness={colorConfig.roughness}
          emissive={isHovered ? colorConfig.hex : '#000000'}
          emissiveIntensity={isHovered ? 0.3 : 0}
        />
      </mesh>
    </group>
  );
};

// Modelo completo con placeholder
export const AirPodsModel = ({ useGLTFModel = false }: AirPodsModelProps) => {
  const selectedColor = useStore((state) => state.selectedColor);
  const groupRef = useRef<THREE.Group>(null);

  // Rotación suave del grupo completo
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.002;
    }
  });

  // Si se especifica usar GLTF, intentar cargarlo
  // Nota: Este código fallará si no existe el archivo, y se debe manejar con Suspense y ErrorBoundary
  if (useGLTFModel) {
    try {
      const { scene } = useGLTF('/models/airpods.glb');
      return <primitive object={scene} scale={1.5} />;
    } catch (error) {
      console.warn('No se pudo cargar el modelo GLTF, usando placeholder');
    }
  }

  // Placeholder por defecto
  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Estuche */}
      <CasePlaceholder color={selectedColor} />

      {/* Auriculares */}
      <EarbudPlaceholder
        position={[-0.25, 0.2, 0.2]}
        rotation={[0, 0, Math.PI / 6]}
        color={selectedColor}
        side="left"
      />
      <EarbudPlaceholder
        position={[0.25, 0.2, -0.2]}
        rotation={[0, 0, -Math.PI / 6]}
        color={selectedColor}
        side="right"
      />
    </group>
  );
};

// Preload para optimización (si existe el GLTF)
export const preloadAirPodsModel = () => {
  try {
    useGLTF.preload('/models/airpods.glb');
  } catch (error) {
    console.info('Modelo GLTF no disponible, usando placeholder');
  }
};

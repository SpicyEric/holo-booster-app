import { Suspense, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Center, Environment } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import * as THREE from 'three';

interface StlViewerProps {
  url: string;
  color?: string;
  autoRotate?: boolean;
  metalness?: number;
  roughness?: number;
}

function StlMesh({ url, color, metalness, roughness, autoRotate }: Required<Omit<StlViewerProps, 'url' | 'color'>> & { url: string; color: string }) {
  const geometry = useLoader(STLLoader, url);
  const ref = useRef<THREE.Mesh>(null);

  const computedGeometry = useMemo(() => {
    geometry.computeVertexNormals();
    geometry.center();
    return geometry;
  }, [geometry]);

  useFrame((_, delta) => {
    if (autoRotate && ref.current) {
      ref.current.rotation.y += delta * 0.4;
    }
  });

  return (
    <Center>
      <mesh ref={ref} geometry={computedGeometry} castShadow receiveShadow>
        <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
      </mesh>
    </Center>
  );
}

export default function StlViewer({
  url,
  color = '#7c3aed',
  autoRotate = true,
  metalness = 0.25,
  roughness = 0.35,
}: StlViewerProps) {
  const [interacting, setInteracting] = useState(false);

  return (
    <Canvas
      shadows
      camera={{ position: [0, 0, 120], fov: 40 }}
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
      onPointerDown={() => setInteracting(true)}
      onPointerUp={() => setInteracting(false)}
    >
      <color attach="background" args={['#f5f3ff']} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[10, 20, 15]} intensity={1.2} castShadow />
      <directionalLight position={[-15, -5, -10]} intensity={0.4} />
      <Suspense fallback={null}>
        <StlMesh
          url={url}
          color={color}
          metalness={metalness}
          roughness={roughness}
          autoRotate={autoRotate && !interacting}
        />
        <Environment preset="city" />
      </Suspense>
      <OrbitControls enablePan={false} enableZoom autoRotate={false} />
    </Canvas>
  );
}

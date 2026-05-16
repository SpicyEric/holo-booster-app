import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import * as THREE from 'three';

interface StlViewerProps {
  url: string;
  color?: string;
  autoRotate?: boolean;
  metalness?: number;
  roughness?: number;
  /** Optional override for camera distance (in scene units). If omitted, auto-fits. */
  initialDistance?: number;
  /** Extra rotation applied to the mesh (radians). Default rotates Z-up STL to Y-up. */
  meshRotation?: [number, number, number];
}

interface StlMeshProps {
  url: string;
  color: string;
  metalness: number;
  roughness: number;
  autoRotate: boolean;
  meshRotation: [number, number, number];
  onFit: (radius: number) => void;
}

function StlMesh({ url, color, metalness, roughness, autoRotate, meshRotation, onFit }: StlMeshProps) {
  const geometry = useLoader(STLLoader, url);
  const ref = useRef<THREE.Mesh>(null);

  const prepared = useMemo(() => {
    geometry.computeVertexNormals();
    geometry.center();
    geometry.computeBoundingSphere();
    return geometry;
  }, [geometry]);

  useEffect(() => {
    if (prepared.boundingSphere) onFit(prepared.boundingSphere.radius);
  }, [prepared, onFit]);

  useFrame((_, delta) => {
    if (autoRotate && ref.current) ref.current.rotation.z += delta * 0.4;
  });

  return (
    <group rotation={meshRotation}>
      <mesh ref={ref} geometry={prepared} castShadow receiveShadow>
        <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
      </mesh>
    </group>
  );
}

interface DistanceReporterProps {
  onChange: (distance: number) => void;
}

function DistanceReporter({ onChange }: DistanceReporterProps) {
  const { camera } = useThree();
  useFrame(() => {
    onChange(camera.position.length());
  });
  return null;
}

interface CameraFitterProps {
  radius: number | null;
  initialDistance?: number;
}

function CameraFitter({ radius, initialDistance }: CameraFitterProps) {
  const { camera } = useThree();
  useEffect(() => {
    if (!radius) return;
    // Default starts at the user's preferred live HUD zoom value: 65%.
    const distance = initialDistance ?? (radius * 200) / 65;
    camera.position.set(0, 0, distance);
    camera.near = Math.max(0.1, distance / 100);
    camera.far = distance * 10;
    camera.updateProjectionMatrix();
  }, [radius, camera, initialDistance]);
  return null;
}

export default function StlViewer({
  url,
  color = '#7c3aed',
  autoRotate = true,
  metalness = 0.25,
  roughness = 0.35,
  initialDistance,
  meshRotation = [-Math.PI / 2, 0, 0],
}: StlViewerProps) {
  const [interacting, setInteracting] = useState(false);
  const [radius, setRadius] = useState<number | null>(null);
  const [distance, setDistance] = useState<number>(0);

  const zoomPercent = radius && distance ? Math.round((radius / distance) * 100 * 2) : 0;

  return (
    <div className="relative w-full h-full">
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
            meshRotation={meshRotation}
            onFit={setRadius}
          />
          <Environment preset="city" />
        </Suspense>
        <CameraFitter radius={radius} initialDistance={initialDistance} />
        <DistanceReporter onChange={setDistance} />
        <OrbitControls enablePan={false} enableZoom autoRotate={false} makeDefault />
      </Canvas>

      {/* HUD: live zoom indicator */}
      <div className="absolute top-3 right-3 px-2.5 py-1.5 rounded-lg bg-black/70 text-white text-[11px] font-mono leading-tight pointer-events-none select-none shadow">
        <div>Zoom: <span className="font-semibold">{zoomPercent}%</span></div>
        <div className="opacity-75">Distanz: {distance.toFixed(1)}</div>
      </div>
    </div>
  );
}

import React, { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Float } from "@react-three/drei";
import * as THREE from "three";

interface OrbitalProps {
  orbitalType: "sigma_g" | "sigma_u";
  distance: number;
}

const MoleculeScene: React.FC<OrbitalProps> = ({ orbitalType, distance }) => {
  const groupRef = useRef<THREE.Group>(null);
  const cloudRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.25;
    }
  });

  const halfD = distance * 1.2; // scale for visualization

  return (
    <group ref={groupRef}>
      {/* Hydrogen Nucleus A */}
      <mesh position={[0, -halfD, 0]}>
        <sphereGeometry args={[0.22, 32, 32]} />
        <meshStandardMaterial color="#E6EDF7" emissive="#9FB3CC" emissiveIntensity={0.2} />
      </mesh>
      <Text position={[0.45, -halfD, 0]} fontSize={0.28} color="#9FB3CC" font="JetBrains Mono">
        H_A
      </Text>

      {/* Hydrogen Nucleus B */}
      <mesh position={[0, halfD, 0]}>
        <sphereGeometry args={[0.22, 32, 32]} />
        <meshStandardMaterial color="#E6EDF7" emissive="#9FB3CC" emissiveIntensity={0.2} />
      </mesh>
      <Text position={[0.45, halfD, 0]} fontSize={0.28} color="#9FB3CC" font="JetBrains Mono">
        H_B
      </Text>

      {/* Internuclear bond dashed line */}
      <line>
        <bufferGeometry
          attach="geometry"
          onUpdate={(geo) => {
            const points = [new THREE.Vector3(0, -halfD, 0), new THREE.Vector3(0, halfD, 0)];
            geo.setFromPoints(points);
          }}
        />
        <lineDashedMaterial color="#2A3C5E" dashSize={0.15} gapSize={0.1} />
      </line>

      {/* Orbital Electron Cloud Visualization */}
      <group ref={cloudRef}>
        {orbitalType === "sigma_g" ? (
          // Bonding sigma_g: smooth constructive electron density bridging the two nuclei
          <>
            <mesh position={[0, 0, 0]}>
              <cylinderGeometry args={[0.85, 0.85, halfD * 2 + 0.4, 32, 1, true]} />
              <meshStandardMaterial
                color="#22D3EE"
                emissive="#0891B2"
                emissiveIntensity={0.6}
                transparent
                opacity={0.35}
                side={THREE.DoubleSide}
                wireframe={false}
              />
            </mesh>
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[halfD * 1.1 + 0.3, 32, 32]} />
              <meshStandardMaterial
                color="#22D3EE"
                transparent
                opacity={0.22}
                roughness={0.1}
                wireframe={false}
              />
            </mesh>
          </>
        ) : (
          // Antibonding sigma_u: destructive interference, nodal plane at z=0, lobes of opposite phase
          <>
            {/* Positive lobe at H_B */}
            <mesh position={[0, halfD + 0.35, 0]}>
              <sphereGeometry args={[0.68, 32, 32]} />
              <meshStandardMaterial
                color="#E879F9"
                emissive="#C026D3"
                emissiveIntensity={0.5}
                transparent
                opacity={0.4}
              />
            </mesh>
            {/* Negative lobe at H_A */}
            <mesh position={[0, -halfD - 0.35, 0]}>
              <sphereGeometry args={[0.68, 32, 32]} />
              <meshStandardMaterial
                color="#38BDF8"
                emissive="#0284C7"
                emissiveIntensity={0.5}
                transparent
                opacity={0.4}
              />
            </mesh>
            {/* Nodal Plane representation at origin */}
            <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <planeGeometry args={[2.8, 2.8]} />
              <meshBasicMaterial color="#FB7185" transparent opacity={0.25} side={THREE.DoubleSide} />
            </mesh>
            <Text position={[1.2, 0.15, 0]} fontSize={0.2} color="#FB7185">
              Nodal Plane (Ψ=0)
            </Text>
          </>
        )}
      </group>
    </group>
  );
};

export const MolecularOrbitalView: React.FC<{ distance: number }> = ({ distance }) => {
  const [orbital, setOrbital] = useState<"sigma_g" | "sigma_u">("sigma_g");

  return (
    <div className="glass-panel p-4 relative flex flex-col h-96">
      <div className="flex items-center justify-between mb-2 z-10">
        <div>
          <h4 className="text-xs font-bold text-space-text uppercase font-mono">
            3D Molecular Orbital Isosurface
          </h4>
          <span className="text-[11px] text-space-muted">
            Interactive Three.js Render (R = {distance.toFixed(3)} Å)
          </span>
        </div>

        {/* Orbital selector toggle */}
        <div className="flex items-center gap-1 bg-space-bg/80 p-1 rounded-lg border border-space-border">
          <button
            onClick={() => setOrbital("sigma_g")}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
              orbital === "sigma_g"
                ? "bg-quantum-cyan text-space-bg font-bold shadow-cyan-glow"
                : "text-space-muted hover:text-space-text"
            }`}
          >
            σ_g (Bonding)
          </button>
          <button
            onClick={() => setOrbital("sigma_u")}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
              orbital === "sigma_u"
                ? "bg-quantum-magenta text-space-bg font-bold shadow-magenta-glow"
                : "text-space-muted hover:text-space-text"
            }`}
          >
            σ_u* (Antibonding)
          </button>
        </div>
      </div>

      <div className="flex-1 w-full rounded-lg overflow-hidden bg-[#0A101D] border border-space-border relative">
        <Canvas camera={{ position: [3, 2, 3], fov: 45 }}>
          <ambientLight intensity={0.7} />
          <pointLight position={[10, 10, 10]} intensity={1.5} />
          <pointLight position={[-10, -10, -10]} intensity={0.5} />
          <MoleculeScene orbitalType={orbital} distance={distance} />
          <OrbitControls enableZoom={true} enablePan={false} autoRotate={false} />
        </Canvas>

        <div className="absolute bottom-2 left-3 text-[10px] text-space-muted/70 font-mono pointer-events-none">
          Click & drag to rotate • Scroll to zoom
        </div>
      </div>
    </div>
  );
};

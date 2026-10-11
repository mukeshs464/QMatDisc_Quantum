import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, RoundedBox } from "@react-three/drei";
import * as THREE from "three";

interface BatteryCellProps {
  soc: number; // State of Charge (0 to 1)
  voltage: number; // Volts (e.g. 2.8V to 4.5V)
  isCharging?: boolean;
}

const LiIonsSwarm: React.FC<{ soc: number; isCharging: boolean }> = ({ soc, isCharging }) => {
  const count = 35;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Pre-seed pseudo-random offsets for each ion
  const ionOffsets = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      y: (Math.sin(i * 1.7) * 0.95),
      z: (Math.cos(i * 2.3) * 0.95),
      phase: i * 0.35,
      speed: 0.6 + (i % 5) * 0.15,
    }));
  }, [count]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // Cathode is at x = +1.8, Anode is at x = -1.8
    // SoC = 100% (fully charged) -> ions mostly in Anode (x < 0)
    // SoC = 0% (discharged) -> ions mostly in Cathode (x > 0)
    const time = state.clock.getElapsedTime();

    ionOffsets.forEach((ion, i) => {
      // Base x position derived from SoC:
      // High SoC -> x shifts toward -1.5 (anode)
      // Low SoC -> x shifts toward +1.5 (cathode)
      const baseTargetX = 1.4 - soc * 2.8;

      // Small thermal / transport oscillation
      const flow = isCharging ? -1 : 1;
      const oscillation = Math.sin(time * ion.speed + ion.phase) * 0.25 * flow;
      const xPos = Math.max(-1.8, Math.min(1.8, baseTargetX + oscillation));

      dummy.position.set(xPos, ion.y, ion.z);
      dummy.scale.setScalar(0.11);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial
        color="#22D3EE"
        emissive="#0891B2"
        emissiveIntensity={1.2}
        roughness={0.2}
      />
    </instancedMesh>
  );
};

const BatteryModel: React.FC<BatteryCellProps> = ({ soc, voltage, isCharging = false }) => {
  const cellGroupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (cellGroupRef.current) {
      cellGroupRef.current.rotation.y += delta * 0.15;
    }
  });

  // Dynamically map simulated voltage to cathode glow color:
  // Low voltage (~3.0V): deeper blue/cyan
  // High voltage (~4.5V): shifting towards energetic magenta / warm amber
  const cathodeColor = useMemo(() => {
    const norm = Math.max(0, Math.min(1, (voltage - 3.0) / 1.5));
    const c1 = new THREE.Color("#0891B2"); // cyan dark
    const c2 = new THREE.Color("#E879F9"); // magenta glow
    return c1.lerp(c2, norm);
  }, [voltage]);

  return (
    <group ref={cellGroupRef}>
      {/* --- CATHODE (Positive Electrode) on Right (+X) --- */}
      <group position={[1.8, 0, 0]}>
        {/* Layered crystal sheets */}
        {[-0.8, -0.4, 0, 0.4, 0.8].map((y, idx) => (
          <mesh key={idx} position={[0, y, 0]}>
            <boxGeometry args={[0.5, 0.08, 2.2]} />
            <meshStandardMaterial
              color={cathodeColor}
              emissive={cathodeColor}
              emissiveIntensity={0.5}
              roughness={0.4}
              metalness={0.3}
            />
          </mesh>
        ))}
        {/* Current collector (Aluminum foil) */}
        <mesh position={[0.35, 0, 0]}>
          <boxGeometry args={[0.04, 2.0, 2.2]} />
          <meshStandardMaterial color="#94A3B8" metalness={0.9} roughness={0.2} />
        </mesh>
        <Text position={[0.7, 0, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={0.22} color="#22D3EE">
          Cathode Host (Li_x MO₂)
        </Text>
      </group>

      {/* --- SEPARATOR & LIQUID ELECTROLYTE in Center (X = 0) --- */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.6, 2.0, 2.2]} />
        <meshStandardMaterial
          color="#0F172A"
          transparent
          opacity={0.35}
          roughness={0.8}
        />
      </mesh>
      {/* Separator membrane */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.06, 2.0, 2.2]} />
        <meshStandardMaterial color="#FBBF24" transparent opacity={0.4} wireframe />
      </mesh>
      <Text position={[0, 1.25, 0]} fontSize={0.18} color="#FBBF24">
        Microporous Separator
      </Text>

      {/* --- ANODE (Negative Electrode) on Left (-X) --- */}
      <group position={[-1.8, 0, 0]}>
        {/* Graphitic intercalation layers */}
        {[-0.8, -0.4, 0, 0.4, 0.8].map((y, idx) => (
          <mesh key={idx} position={[0, y, 0]}>
            <boxGeometry args={[0.5, 0.08, 2.2]} />
            <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.6} />
          </mesh>
        ))}
        {/* Current collector (Copper foil) */}
        <mesh position={[-0.35, 0, 0]}>
          <boxGeometry args={[0.04, 2.0, 2.2]} />
          <meshStandardMaterial color="#D97706" metalness={0.9} roughness={0.2} />
        </mesh>
        <Text position={[-0.7, 0, 0]} rotation={[0, -Math.PI / 2, 0]} fontSize={0.22} color="#94A3B8">
          Anode Host (Graphite / C₆)
        </Text>
      </group>

      {/* --- MIGRATING Li+ IONS --- */}
      <LiIonsSwarm soc={soc} isCharging={isCharging} />

      {/* Outer Glass Encapsulation Cell */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[4.4, 2.4, 2.5]} />
        <meshStandardMaterial
          color="#1E2B44"
          transparent
          opacity={0.12}
          roughness={0.1}
          metalness={0.1}
          wireframe
        />
      </mesh>
    </group>
  );
};

export const BatteryCellView: React.FC<BatteryCellProps> = (props) => {
  return (
    <div className="w-full h-full relative">
      <Canvas camera={{ position: [0, 2.8, 5.2], fov: 48 }}>
        <ambientLight intensity={0.8} />
        <pointLight position={[5, 6, 5]} intensity={2.0} color="#22D3EE" />
        <pointLight position={[-5, 6, -5]} intensity={1.5} color="#FBBF24" />
        <pointLight position={[0, -5, 0]} intensity={0.5} />
        <BatteryModel {...props} />
        <OrbitControls enableZoom={true} enablePan={false} />
      </Canvas>
    </div>
  );
};

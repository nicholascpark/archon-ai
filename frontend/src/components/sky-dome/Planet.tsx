"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import * as THREE from "three";
import type { PlanetPosition } from "@/types/astrology";
import { PLANET_VISUALS } from "@/types/astrology";
import { eclipticTo3D, getPlanetElevation } from "@/lib/astronomy/coordinateTransform";

interface PlanetProps {
  planet: PlanetPosition;
  isTransit?: boolean;
  showLabel?: boolean;
  domeRadius?: number;
}

export function Planet({
  planet,
  isTransit = false,
  showLabel = true,
  domeRadius = 6,
}: PlanetProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  // Get visual config
  const visual = PLANET_VISUALS[planet.name] || PLANET_VISUALS.Sun;

  // Calculate 3D position
  const position = useMemo(() => {
    const elevation = getPlanetElevation(planet.name, isTransit);
    return eclipticTo3D(planet.absoluteDegree, elevation, domeRadius);
  }, [planet.absoluteDegree, planet.name, isTransit, domeRadius]);

  // Size based on planet type and transit status
  const size = useMemo(() => {
    const baseSize = visual.size * 0.08;
    return isTransit ? baseSize * 0.7 : baseSize;
  }, [visual.size, isTransit]);

  // Animate retrograde planets
  useFrame((_, delta) => {
    if (planet.isRetrograde && meshRef.current) {
      meshRef.current.rotation.y -= delta * 0.5;
    }

    // Pulsing glow
    if (glowRef.current) {
      const material = glowRef.current.material as THREE.MeshBasicMaterial;
      const pulse = Math.sin(Date.now() * 0.002) * 0.2 + 0.8;
      material.opacity = visual.glowIntensity * 0.3 * pulse;
    }
  });

  return (
    <group position={position}>
      {/* Planet sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[size, 16, 16]} />
        <meshStandardMaterial
          color={visual.color}
          emissive={visual.emissive}
          emissiveIntensity={isTransit ? 0.3 : 0.5}
          metalness={0.3}
          roughness={0.6}
        />
      </mesh>

      {/* Glow effect */}
      <mesh ref={glowRef} scale={1.5}>
        <sphereGeometry args={[size, 16, 16]} />
        <meshBasicMaterial
          color={visual.color}
          transparent
          opacity={visual.glowIntensity * 0.3}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Retrograde indicator */}
      {planet.isRetrograde && (
        <Billboard follow lockX={false} lockY={false} lockZ={false}>
          <Text
            position={[0, size * 2.5, 0]}
            fontSize={0.08}
            color="#ff6b6b"
            anchorX="center"
            anchorY="middle"
          >
            Rx
          </Text>
        </Billboard>
      )}

      {/* Planet label */}
      {showLabel && (
        <Billboard follow lockX={false} lockY={false} lockZ={false}>
          <Text
            position={[0, -size * 2, 0]}
            fontSize={0.06}
            color={isTransit ? "#aaaaaa" : "#e8e0d5"}
            anchorX="center"
            anchorY="middle"
          >
            {visual.symbol} {planet.sign.slice(0, 3)} {Math.floor(planet.degree)}°
          </Text>
        </Billboard>
      )}

      {/* Transit marker ring */}
      {isTransit && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[size * 1.3, size * 1.5, 16]} />
          <meshBasicMaterial
            color="#888888"
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

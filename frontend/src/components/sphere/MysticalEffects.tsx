"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSphereStore } from "@/stores/useSphereStore";

// Floating particles around the sphere
function FloatingParticles({ count = 200, radius = 1.8 }: { count?: number; radius?: number }) {
  const particlesRef = useRef<THREE.Points>(null);

  const { positions, sizes, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Distribute in a shell around the sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius + (Math.random() - 0.5) * 0.4;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      sizes[i] = Math.random() * 0.02 + 0.005;

      // Warm gold to cool purple gradient
      const t = Math.random();
      colors[i * 3] = 0.6 + t * 0.3;     // R
      colors[i * 3 + 1] = 0.5 + t * 0.2; // G
      colors[i * 3 + 2] = 0.4 + t * 0.4; // B
    }

    return { positions, sizes, colors };
  }, [count, radius]);

  useFrame(({ clock }) => {
    if (!particlesRef.current) return;

    const time = clock.getElapsedTime();
    const positionArray = particlesRef.current.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const x = positions[i3];
      const y = positions[i3 + 1];
      const z = positions[i3 + 2];

      // Gentle orbital motion
      const angle = time * 0.1 + i * 0.1;
      const drift = Math.sin(time * 0.5 + i) * 0.02;

      positionArray[i3] = x * Math.cos(angle * 0.1) - z * Math.sin(angle * 0.1) + drift;
      positionArray[i3 + 1] = y + Math.sin(time + i) * 0.02;
      positionArray[i3 + 2] = x * Math.sin(angle * 0.1) + z * Math.cos(angle * 0.1);
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.015}
        vertexColors
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// Ethereal energy rings
function EnergyRings({ radius = 1.5 }: { radius?: number }) {
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();

    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = time * 0.2;
      ring1Ref.current.rotation.y = time * 0.1;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.x = -time * 0.15;
      ring2Ref.current.rotation.z = time * 0.1;
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.y = time * 0.25;
      ring3Ref.current.rotation.z = -time * 0.08;
    }
  });

  return (
    <group>
      <mesh ref={ring1Ref}>
        <torusGeometry args={[radius * 1.1, 0.003, 8, 64]} />
        <meshBasicMaterial color="#8b7355" transparent opacity={0.2} />
      </mesh>
      <mesh ref={ring2Ref}>
        <torusGeometry args={[radius * 1.2, 0.002, 8, 64]} />
        <meshBasicMaterial color="#6b5b7a" transparent opacity={0.15} />
      </mesh>
      <mesh ref={ring3Ref}>
        <torusGeometry args={[radius * 1.3, 0.002, 8, 64]} />
        <meshBasicMaterial color="#4a5d5d" transparent opacity={0.1} />
      </mesh>
    </group>
  );
}

// Glowing sigil/rune at the core
function CoreSigil({ radius = 0.3 }: { radius?: number }) {
  const sigilRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();

    if (sigilRef.current) {
      sigilRef.current.rotation.y = time * 0.3;
    }

    if (glowRef.current) {
      const pulse = Math.sin(time * 2) * 0.15 + 0.85;
      glowRef.current.scale.setScalar(pulse);
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.3 * pulse;
    }
  });

  return (
    <group ref={sigilRef}>
      {/* Core light */}
      <mesh>
        <sphereGeometry args={[radius * 0.5, 16, 16]} />
        <meshBasicMaterial color="#d4a847" transparent opacity={0.4} />
      </mesh>

      {/* Outer glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[radius, 16, 16]} />
        <meshBasicMaterial
          color="#8b7355"
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Inner geometric pattern - octahedron */}
      <mesh>
        <octahedronGeometry args={[radius * 0.4]} />
        <meshBasicMaterial
          color="#a08060"
          wireframe
          transparent
          opacity={0.4}
        />
      </mesh>
    </group>
  );
}

// Ethereal wisps/tendrils
function EtherealWisps({ count = 8, radius = 1.6 }: { count?: number; radius?: number }) {
  const wispsRef = useRef<THREE.Group>(null);

  const curves = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const startAngle = (i / count) * Math.PI * 2;
      const points: THREE.Vector3[] = [];

      for (let j = 0; j <= 20; j++) {
        const t = j / 20;
        const angle = startAngle + t * 0.5;
        const r = radius * (0.8 + t * 0.4);
        const y = Math.sin(t * Math.PI) * 0.5;

        points.push(new THREE.Vector3(
          Math.cos(angle) * r,
          y,
          Math.sin(angle) * r
        ));
      }

      return new THREE.CatmullRomCurve3(points);
    });
  }, [count, radius]);

  useFrame(({ clock }) => {
    if (!wispsRef.current) return;

    const time = clock.getElapsedTime();
    wispsRef.current.rotation.y = time * 0.05;

    wispsRef.current.children.forEach((child, i) => {
      if (child instanceof THREE.Line) {
        (child.material as THREE.LineBasicMaterial).opacity =
          0.1 + Math.sin(time * 2 + i) * 0.05;
      }
    });
  });

  return (
    <group ref={wispsRef}>
      {curves.map((curve, i) => {
        const points = curve.getPoints(50);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);

        return (
          <line key={i}>
            <bufferGeometry attach="geometry" {...geometry} />
            <lineBasicMaterial
              color={i % 2 === 0 ? "#8b7355" : "#6b5b7a"}
              transparent
              opacity={0.15}
            />
          </line>
        );
      })}
    </group>
  );
}

// Ambient star field within the sphere
function InnerStarfield({ count = 50, radius = 1.2 }: { count?: number; radius?: number }) {
  const starsRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.random() * radius * 0.8;

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi);
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }

    return pos;
  }, [count, radius]);

  useFrame(({ clock }) => {
    if (!starsRef.current) return;
    starsRef.current.rotation.y = clock.getElapsedTime() * 0.02;
  });

  return (
    <points ref={starsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.008}
        color="#d4c4a8"
        transparent
        opacity={0.4}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// Main mystical effects component
export function MysticalEffects({ sphereRadius = 1.5 }: { sphereRadius?: number }) {
  const quality = useSphereStore((s) => s.quality);

  // Reduce effects for lower quality settings
  const particleCount = quality === "high" ? 200 : quality === "medium" ? 100 : 50;
  const wispCount = quality === "high" ? 8 : quality === "medium" ? 4 : 2;

  return (
    <group>
      <FloatingParticles count={particleCount} radius={sphereRadius * 1.2} />
      <EnergyRings radius={sphereRadius} />
      <CoreSigil radius={sphereRadius * 0.25} />
      <EtherealWisps count={wispCount} radius={sphereRadius * 1.1} />
      <InnerStarfield count={50} radius={sphereRadius * 0.9} />
    </group>
  );
}

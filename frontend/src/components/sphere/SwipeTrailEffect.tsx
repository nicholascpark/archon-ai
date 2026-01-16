"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSphereStore } from "@/stores/useSphereStore";

// Romantic color palette
const TRAIL_COLORS = [
  "#d4a847", // Gold
  "#c9a0a0", // Dusty rose
  "#9d7cd8", // Mystic purple
  "#e6c65c", // Light gold
  "#b8a0c8", // Soft lavender
];

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
}

export function SwipeTrailEffect() {
  const isDragging = useSphereStore((s) => s.isDragging);
  const velocity = useSphereStore((s) => s.velocity);
  const swipeMode = useSphereStore((s) => s.swipeMode);

  const particlesRef = useRef<Particle[]>([]);
  const pointsRef = useRef<THREE.Points>(null);
  const [forceUpdate, setForceUpdate] = useState(0);

  const maxParticles = 100;

  // Spawn particles during drag
  useEffect(() => {
    if (!isDragging || swipeMode !== "archon") return;

    const spawnInterval = setInterval(() => {
      const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
      if (speed < 0.001) return;

      const spawnCount = Math.min(3, Math.floor(speed * 100));

      for (let i = 0; i < spawnCount; i++) {
        if (particlesRef.current.length >= maxParticles) {
          particlesRef.current.shift();
        }

        const color = new THREE.Color(
          TRAIL_COLORS[Math.floor(Math.random() * TRAIL_COLORS.length)]
        );

        const angle = Math.random() * Math.PI * 2;
        const radius = 0.5 + Math.random() * 0.5;

        particlesRef.current.push({
          position: new THREE.Vector3(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
            (Math.random() - 0.5) * 0.5
          ),
          velocity: new THREE.Vector3(
            velocity.y * 2 + (Math.random() - 0.5) * 0.5,
            velocity.x * 2 + (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.2
          ),
          life: 1,
          maxLife: 0.8 + Math.random() * 0.4,
          size: 0.03 + Math.random() * 0.05,
          color,
        });
      }
    }, 50);

    return () => clearInterval(spawnInterval);
  }, [isDragging, velocity, swipeMode]);

  // Update particles
  useFrame((_, delta) => {
    if (particlesRef.current.length === 0) return;

    particlesRef.current = particlesRef.current.filter((particle) => {
      particle.life -= delta / particle.maxLife;
      particle.position.add(particle.velocity.clone().multiplyScalar(delta));
      particle.velocity.multiplyScalar(0.98);
      particle.velocity.y += delta * 0.1;
      return particle.life > 0;
    });

    setForceUpdate((prev) => prev + 1);
  });

  // Create geometry for particles
  const { positions, colors, sizes } = useMemo(() => {
    const positions: number[] = [];
    const colors: number[] = [];
    const sizes: number[] = [];

    particlesRef.current.forEach((particle) => {
      positions.push(particle.position.x, particle.position.y, particle.position.z);
      const alpha = particle.life;
      colors.push(
        particle.color.r * alpha,
        particle.color.g * alpha,
        particle.color.b * alpha
      );
      sizes.push(particle.size * particle.life);
    });

    return { positions, colors, sizes };
  }, [forceUpdate]);

  if (swipeMode !== "archon") return null;

  return (
    <group>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array(positions), 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[new Float32Array(colors), 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.08}
          vertexColors
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      {isDragging && Math.sqrt(velocity.x ** 2 + velocity.y ** 2) > 0.001 && (
        <mesh>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshBasicMaterial
            color="#d4a847"
            transparent
            opacity={0.4}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  );
}

// Ambient floating sparkles - minimized for cleaner visibility
export function AmbientSparkles({ count = 8 }: { count?: number }) {
  const sparklesRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const pos: number[] = [];
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const radius = 3 + Math.random() * 2; // Further from center

      pos.push(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      );
    }
    return pos;
  }, [count]);

  useFrame(({ clock }) => {
    if (!sparklesRef.current) return;
    const time = clock.getElapsedTime();
    sparklesRef.current.rotation.y = time * 0.03;
    const material = sparklesRef.current.material as THREE.PointsMaterial;
    material.opacity = 0.15 + Math.sin(time * 2) * 0.05;
  });

  return (
    <points ref={sparklesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[new Float32Array(positions), 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color="#e6c65c"
        transparent
        opacity={0.2}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

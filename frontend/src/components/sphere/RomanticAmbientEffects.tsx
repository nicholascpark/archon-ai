"use client";

import { useRef, useMemo, useState, useEffect, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSphereStore } from "@/stores/useSphereStore";

// Romantic color palette
const ROMANTIC_COLORS = {
  gold: "#d4a847",
  rose: "#c9a0a0",
  lavender: "#9d7cd8",
  blush: "#e8c4c4",
  cream: "#e6c65c",
  moonlight: "#b8c4d4",
};

// Shooting star component
function ShootingStar({ onComplete, delay = 0 }: { onComplete?: () => void; delay?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [active, setActive] = useState(false);
  const startTime = useRef(0);

  const config = useMemo(() => ({
    startX: (Math.random() - 0.5) * 10,
    startY: 4 + Math.random() * 2,
    startZ: -3 - Math.random() * 2,
    angle: Math.PI * 0.6 + (Math.random() - 0.5) * 0.4,
    speed: 8 + Math.random() * 4,
    size: 0.02 + Math.random() * 0.02,
    color: Math.random() > 0.5 ? ROMANTIC_COLORS.cream : ROMANTIC_COLORS.moonlight,
  }), []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setActive(true);
      startTime.current = Date.now();
    }, delay * 1000);
    return () => clearTimeout(timer);
  }, [delay]);

  useFrame(() => {
    if (!meshRef.current || !active) return;

    const elapsed = (Date.now() - startTime.current) / 1000;
    const progress = elapsed * 0.5;

    const x = config.startX + Math.cos(config.angle) * progress * config.speed;
    const y = config.startY - Math.sin(config.angle) * progress * config.speed;
    const z = config.startZ + progress * 0.5;

    meshRef.current.position.set(x, y, z);

    if (y < -5 || progress > 3) {
      setActive(false);
      onComplete?.();
    }
  });

  if (!active) return null;

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[config.size, 8, 8]} />
      <meshBasicMaterial color={config.color} />
    </mesh>
  );
}

// Celestial dust particles
function CelestialDust({ count = 100 }: { count?: number }) {
  const dustRef = useRef<THREE.Points>(null);
  const isDragging = useSphereStore((s) => s.isDragging);
  const velocity = useSphereStore((s) => s.velocity);

  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const radius = 2 + Math.random() * 3;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.01
      ));
    }

    return { positions, velocities };
  }, [count]);

  useFrame(({ clock }) => {
    if (!dustRef.current) return;

    const posArray = dustRef.current.geometry.attributes.position.array as Float32Array;
    const time = clock.getElapsedTime();

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      posArray[idx] += velocities[i].x + Math.sin(time * 0.5 + i) * 0.001;
      posArray[idx + 1] += velocities[i].y + Math.cos(time * 0.3 + i) * 0.001;
      posArray[idx + 2] += velocities[i].z;

      if (isDragging) {
        posArray[idx] += velocity.y * 0.01;
        posArray[idx + 1] += velocity.x * 0.01;
      }

      const dist = Math.sqrt(posArray[idx] ** 2 + posArray[idx + 1] ** 2 + posArray[idx + 2] ** 2);
      if (dist > 5 || dist < 1.5) {
        velocities[i].multiplyScalar(-1);
      }
    }

    dustRef.current.geometry.attributes.position.needsUpdate = true;
    dustRef.current.rotation.y = time * 0.02;
  });

  return (
    <points ref={dustRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.015}
        color={ROMANTIC_COLORS.cream}
        transparent
        opacity={0.08}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// Main romantic ambient effects component
export function RomanticAmbientEffects() {
  const [shootingStars, setShootingStars] = useState<number[]>([]);
  const quality = useSphereStore((s) => s.quality);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        setShootingStars((prev) => [...prev, Date.now()]);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleStarComplete = useCallback((id: number) => {
    setShootingStars((prev) => prev.filter((s) => s !== id));
  }, []);

  // Drastically reduced dust for cleaner visibility
  const dustCount = quality === "high" ? 8 : quality === "medium" ? 5 : 3;

  return (
    <group>
      <CelestialDust count={dustCount} />

      {shootingStars.slice(-3).map((id, i) => (
        <ShootingStar
          key={id}
          delay={i * 0.5}
          onComplete={() => handleStarComplete(id)}
        />
      ))}
    </group>
  );
}

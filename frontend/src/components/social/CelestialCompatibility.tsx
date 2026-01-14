"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Html, Line } from "@react-three/drei";

// Zodiac sign data with symbols and elements
const ZODIAC_SIGNS = {
  aries: { symbol: "♈", element: "fire", color: "#ff6b6b" },
  taurus: { symbol: "♉", element: "earth", color: "#7eb77f" },
  gemini: { symbol: "♊", element: "air", color: "#87ceeb" },
  cancer: { symbol: "♋", element: "water", color: "#4a90a4" },
  leo: { symbol: "♌", element: "fire", color: "#ffa500" },
  virgo: { symbol: "♍", element: "earth", color: "#8b7355" },
  libra: { symbol: "♎", element: "air", color: "#dda0dd" },
  scorpio: { symbol: "♏", element: "water", color: "#8b0000" },
  sagittarius: { symbol: "♐", element: "fire", color: "#9932cc" },
  capricorn: { symbol: "♑", element: "earth", color: "#2f4f4f" },
  aquarius: { symbol: "♒", element: "air", color: "#00ced1" },
  pisces: { symbol: "♓", element: "water", color: "#48d1cc" },
};

type ZodiacSign = keyof typeof ZODIAC_SIGNS;

// Compatibility matrix (simplified)
const COMPATIBILITY: Record<string, Record<string, number>> = {
  fire: { fire: 85, earth: 45, air: 90, water: 55 },
  earth: { fire: 45, earth: 80, air: 50, water: 85 },
  air: { fire: 90, earth: 50, air: 75, water: 60 },
  water: { fire: 55, earth: 85, air: 60, water: 95 },
};

interface CompatibilityDisplayProps {
  sign1: ZodiacSign;
  sign2: ZodiacSign;
  expanded?: boolean;
}

// Heart connection line between two signs
function HeartConnection({
  start,
  end,
  compatibility,
  color,
}: {
  start: [number, number, number];
  end: [number, number, number];
  compatibility: number;
  color: string;
}) {
  const pulseRef = useRef(0);

  // Create curved path with heart-like bulge
  const curve = useMemo(() => {
    const midY = (start[1] + end[1]) / 2 + 0.3;
    return new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(...start),
      new THREE.Vector3((start[0] + end[0]) / 2, midY, (start[2] + end[2]) / 2),
      new THREE.Vector3(...end)
    );
  }, [start, end]);

  const points = useMemo(() => curve.getPoints(30), [curve]);

  return (
    <Line
      points={points}
      color={color}
      lineWidth={2 + (compatibility / 50)}
      transparent
      opacity={0.6}
    />
  );
}

// Animated zodiac symbol
function ZodiacSymbol({
  sign,
  position,
  size = 1,
  showLabel = true,
  isHighlighted = false,
}: {
  sign: ZodiacSign;
  position: [number, number, number];
  size?: number;
  showLabel?: boolean;
  isHighlighted?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const data = ZODIAC_SIGNS[sign];

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();

    // Gentle rotation
    groupRef.current.rotation.y = Math.sin(t * 0.5) * 0.1;

    // Pulse when highlighted
    if (isHighlighted) {
      const scale = 1 + Math.sin(t * 3) * 0.1;
      groupRef.current.scale.setScalar(size * scale);
    }
  });

  return (
    <group ref={groupRef} position={position} scale={size}>
      {/* Glow effect */}
      <mesh>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshBasicMaterial
          color={data.color}
          transparent
          opacity={isHighlighted ? 0.3 : 0.15}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Symbol display */}
      <Html center>
        <div
          className="flex flex-col items-center gap-1 pointer-events-none select-none"
          style={{
            transform: `scale(${size})`,
          }}
        >
          <span
            className="text-3xl transition-all duration-300"
            style={{
              color: data.color,
              textShadow: isHighlighted
                ? `0 0 20px ${data.color}, 0 0 40px ${data.color}`
                : `0 0 10px ${data.color}60`,
              filter: `drop-shadow(0 0 ${isHighlighted ? 15 : 8}px ${data.color})`,
            }}
          >
            {data.symbol}
          </span>
          {showLabel && (
            <span
              className="text-xs font-serif capitalize opacity-70"
              style={{ color: data.color }}
            >
              {sign}
            </span>
          )}
        </div>
      </Html>
    </group>
  );
}

// Compatibility score display
function CompatibilityScore({
  score,
  position,
}: {
  score: number;
  position: [number, number, number];
}) {
  const ringRef = useRef<THREE.Mesh>(null);

  // Determine romantic message based on score
  const getMessage = (score: number) => {
    if (score >= 90) return { text: "Soulmates", emoji: "💫" };
    if (score >= 75) return { text: "Deep Connection", emoji: "💕" };
    if (score >= 60) return { text: "Harmonious", emoji: "✨" };
    if (score >= 45) return { text: "Intriguing", emoji: "🌙" };
    return { text: "Challenging", emoji: "🔥" };
  };

  const message = getMessage(score);
  const color = score >= 75 ? "#d4a847" : score >= 50 ? "#9d7cd8" : "#c9a0a0";

  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    ringRef.current.rotation.z = clock.getElapsedTime() * 0.5;
  });

  return (
    <group position={position}>
      {/* Animated ring */}
      <mesh ref={ringRef}>
        <torusGeometry args={[0.6, 0.02, 8, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} />
      </mesh>

      {/* Score display */}
      <Html center>
        <div className="flex flex-col items-center gap-2 pointer-events-none">
          {/* Heart with score */}
          <div className="relative">
            <span className="text-4xl">{message.emoji}</span>
            <span
              className="absolute inset-0 flex items-center justify-center text-lg font-bold"
              style={{ color }}
            >
              {score}%
            </span>
          </div>

          {/* Message */}
          <span
            className="text-sm font-serif tracking-wide"
            style={{
              color,
              textShadow: `0 0 10px ${color}60`,
            }}
          >
            {message.text}
          </span>
        </div>
      </Html>
    </group>
  );
}

// Main compatibility display
export function CelestialCompatibility({
  sign1,
  sign2,
  expanded = false,
}: CompatibilityDisplayProps) {
  const groupRef = useRef<THREE.Group>(null);

  const compatibility = useMemo(() => {
    const element1 = ZODIAC_SIGNS[sign1].element;
    const element2 = ZODIAC_SIGNS[sign2].element;
    return COMPATIBILITY[element1][element2];
  }, [sign1, sign2]);

  const mixedColor = useMemo(() => {
    const c1 = new THREE.Color(ZODIAC_SIGNS[sign1].color);
    const c2 = new THREE.Color(ZODIAC_SIGNS[sign2].color);
    return c1.lerp(c2, 0.5).getHexString();
  }, [sign1, sign2]);

  useFrame(({ clock }) => {
    if (!groupRef.current || !expanded) return;
    groupRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.2) * 0.1;
  });

  return (
    <group ref={groupRef}>
      {/* Sign 1 */}
      <ZodiacSymbol
        sign={sign1}
        position={[-1.5, 0, 0]}
        size={expanded ? 1.2 : 0.8}
        isHighlighted={expanded}
      />

      {/* Sign 2 */}
      <ZodiacSymbol
        sign={sign2}
        position={[1.5, 0, 0]}
        size={expanded ? 1.2 : 0.8}
        isHighlighted={expanded}
      />

      {/* Connection line */}
      <HeartConnection
        start={[-1, 0, 0]}
        end={[1, 0, 0]}
        compatibility={compatibility}
        color={`#${mixedColor}`}
      />

      {/* Compatibility score */}
      {expanded && (
        <CompatibilityScore score={compatibility} position={[0, -1.2, 0]} />
      )}

      {/* Ambient particles */}
      {expanded && (
        <CompatibilityParticles color={`#${mixedColor}`} intensity={compatibility / 100} />
      )}
    </group>
  );
}

// Floating particles between compatible signs
function CompatibilityParticles({
  color,
  intensity,
}: {
  color: string;
  intensity: number;
}) {
  const particlesRef = useRef<THREE.Points>(null);
  const count = Math.floor(20 * intensity);

  const positions = useMemo(() => {
    const pos: number[] = [];
    for (let i = 0; i < count; i++) {
      pos.push(
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 1
      );
    }
    return new Float32Array(pos);
  }, [count]);

  useFrame(({ clock }) => {
    if (!particlesRef.current) return;

    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
    const time = clock.getElapsedTime();

    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] += Math.sin(time + i) * 0.002;
      positions[i] += Math.cos(time * 0.5 + i) * 0.001;
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
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color={color}
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

// Swipe card for romantic matching
export function CompatibilityCard({
  userSign,
  matchSign,
  onSwipeLeft,
  onSwipeRight,
}: {
  userSign: ZodiacSign;
  matchSign: ZodiacSign;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}) {
  const cardRef = useRef<THREE.Group>(null);

  const compatibility = useMemo(() => {
    const element1 = ZODIAC_SIGNS[userSign].element;
    const element2 = ZODIAC_SIGNS[matchSign].element;
    return COMPATIBILITY[element1][element2];
  }, [userSign, matchSign]);

  return (
    <group ref={cardRef}>
      {/* Card background */}
      <mesh>
        <planeGeometry args={[3, 4]} />
        <meshBasicMaterial color="#1a1816" transparent opacity={0.9} />
      </mesh>

      {/* Border glow */}
      <mesh>
        <planeGeometry args={[3.1, 4.1]} />
        <meshBasicMaterial
          color={ZODIAC_SIGNS[matchSign].color}
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Compatibility display */}
      <group position={[0, 0, 0.1]}>
        <CelestialCompatibility sign1={userSign} sign2={matchSign} expanded />
      </group>

      {/* Swipe hints */}
      <Html position={[-1.2, -1.8, 0.1]}>
        <div className="text-2xl opacity-50 select-none">👈</div>
      </Html>
      <Html position={[1.2, -1.8, 0.1]}>
        <div className="text-2xl opacity-50 select-none">👉</div>
      </Html>
    </group>
  );
}

export { ZODIAC_SIGNS, type ZodiacSign };

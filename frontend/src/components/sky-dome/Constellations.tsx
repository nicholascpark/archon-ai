"use client";

import React, { useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Text } from "@react-three/drei";
import * as THREE from "three";
import { useSphereStore } from "@/stores/useSphereStore";

// Constellation data - stars positioned on celestial sphere
interface Star {
  ra: number;  // Right ascension (0-360)
  dec: number; // Declination (-90 to 90)
  mag: number; // Magnitude (brightness, lower = brighter)
}

interface ConstellationData {
  name: string;
  symbol: string;
  element: string;
  description: string;
  stars: Star[];
  lines: [number, number][]; // Connections between star indices
  centerRa: number;
  centerDec: number;
}

// Zodiac constellation data (simplified positions)
const CONSTELLATIONS: ConstellationData[] = [
  {
    name: "Aries",
    symbol: "♈",
    element: "Fire",
    description: "The Ram - Cardinal fire sign of initiative and courage",
    centerRa: 30, centerDec: 20,
    stars: [
      { ra: 28, dec: 23, mag: 2.0 },
      { ra: 30, dec: 21, mag: 2.6 },
      { ra: 32, dec: 18, mag: 2.6 },
      { ra: 34, dec: 15, mag: 3.6 },
    ],
    lines: [[0, 1], [1, 2], [2, 3]],
  },
  {
    name: "Taurus",
    symbol: "♉",
    element: "Earth",
    description: "The Bull - Fixed earth sign of determination and sensuality",
    centerRa: 65, centerDec: 18,
    stars: [
      { ra: 68, dec: 16, mag: 0.9 }, // Aldebaran
      { ra: 64, dec: 22, mag: 3.4 },
      { ra: 60, dec: 20, mag: 3.0 },
      { ra: 66, dec: 18, mag: 3.6 },
      { ra: 70, dec: 14, mag: 3.8 },
    ],
    lines: [[0, 1], [0, 3], [0, 4], [1, 2]],
  },
  {
    name: "Gemini",
    symbol: "♊",
    element: "Air",
    description: "The Twins - Mutable air sign of communication and duality",
    centerRa: 100, centerDec: 22,
    stars: [
      { ra: 113, dec: 32, mag: 1.6 }, // Pollux
      { ra: 113, dec: 28, mag: 1.9 }, // Castor
      { ra: 106, dec: 20, mag: 2.9 },
      { ra: 100, dec: 17, mag: 3.1 },
      { ra: 95, dec: 16, mag: 3.4 },
    ],
    lines: [[0, 2], [1, 2], [2, 3], [3, 4]],
  },
  {
    name: "Cancer",
    symbol: "♋",
    element: "Water",
    description: "The Crab - Cardinal water sign of emotion and nurturing",
    centerRa: 130, centerDec: 15,
    stars: [
      { ra: 130, dec: 18, mag: 3.5 },
      { ra: 128, dec: 15, mag: 3.9 },
      { ra: 132, dec: 12, mag: 3.5 },
      { ra: 130, dec: 10, mag: 4.0 },
    ],
    lines: [[0, 1], [1, 2], [2, 3], [0, 2]],
  },
  {
    name: "Leo",
    symbol: "♌",
    element: "Fire",
    description: "The Lion - Fixed fire sign of creativity and leadership",
    centerRa: 150, centerDec: 15,
    stars: [
      { ra: 152, dec: 12, mag: 1.4 }, // Regulus
      { ra: 148, dec: 20, mag: 2.1 },
      { ra: 155, dec: 24, mag: 2.0 },
      { ra: 160, dec: 20, mag: 2.6 },
      { ra: 165, dec: 15, mag: 2.1 },
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [0, 4]],
  },
  {
    name: "Virgo",
    symbol: "♍",
    element: "Earth",
    description: "The Virgin - Mutable earth sign of analysis and service",
    centerRa: 195, centerDec: -2,
    stars: [
      { ra: 201, dec: -11, mag: 1.0 }, // Spica
      { ra: 195, dec: 2, mag: 2.8 },
      { ra: 190, dec: 5, mag: 2.8 },
      { ra: 198, dec: 8, mag: 3.4 },
      { ra: 203, dec: 0, mag: 3.4 },
    ],
    lines: [[0, 4], [4, 1], [1, 2], [1, 3]],
  },
  {
    name: "Libra",
    symbol: "♎",
    element: "Air",
    description: "The Scales - Cardinal air sign of balance and partnership",
    centerRa: 230, centerDec: -15,
    stars: [
      { ra: 222, dec: -16, mag: 2.6 },
      { ra: 229, dec: -9, mag: 2.8 },
      { ra: 234, dec: -15, mag: 3.3 },
      { ra: 238, dec: -23, mag: 3.9 },
    ],
    lines: [[0, 1], [1, 2], [2, 3]],
  },
  {
    name: "Scorpio",
    symbol: "♏",
    element: "Water",
    description: "The Scorpion - Fixed water sign of transformation and power",
    centerRa: 250, centerDec: -26,
    stars: [
      { ra: 247, dec: -26, mag: 1.0 }, // Antares
      { ra: 242, dec: -19, mag: 2.3 },
      { ra: 240, dec: -22, mag: 2.9 },
      { ra: 252, dec: -34, mag: 2.4 },
      { ra: 258, dec: -37, mag: 2.8 },
      { ra: 264, dec: -43, mag: 1.6 },
    ],
    lines: [[0, 1], [1, 2], [0, 3], [3, 4], [4, 5]],
  },
  {
    name: "Sagittarius",
    symbol: "♐",
    element: "Fire",
    description: "The Archer - Mutable fire sign of adventure and philosophy",
    centerRa: 285, centerDec: -28,
    stars: [
      { ra: 276, dec: -26, mag: 2.0 },
      { ra: 280, dec: -30, mag: 1.8 },
      { ra: 285, dec: -29, mag: 2.1 },
      { ra: 290, dec: -25, mag: 2.7 },
      { ra: 284, dec: -21, mag: 2.9 },
    ],
    lines: [[0, 1], [1, 2], [2, 3], [2, 4]],
  },
  {
    name: "Capricorn",
    symbol: "♑",
    element: "Earth",
    description: "The Sea-Goat - Cardinal earth sign of ambition and discipline",
    centerRa: 315, centerDec: -18,
    stars: [
      { ra: 305, dec: -12, mag: 3.6 },
      { ra: 310, dec: -17, mag: 2.9 },
      { ra: 320, dec: -16, mag: 2.9 },
      { ra: 325, dec: -22, mag: 3.7 },
    ],
    lines: [[0, 1], [1, 2], [2, 3]],
  },
  {
    name: "Aquarius",
    symbol: "♒",
    element: "Air",
    description: "The Water-Bearer - Fixed air sign of innovation and humanity",
    centerRa: 340, centerDec: -10,
    stars: [
      { ra: 331, dec: -1, mag: 2.9 },
      { ra: 340, dec: -6, mag: 2.9 },
      { ra: 343, dec: -8, mag: 3.3 },
      { ra: 346, dec: -14, mag: 2.9 },
      { ra: 348, dec: -22, mag: 3.8 },
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4]],
  },
  {
    name: "Pisces",
    symbol: "♓",
    element: "Water",
    description: "The Fish - Mutable water sign of intuition and transcendence",
    centerRa: 10, centerDec: 10,
    stars: [
      { ra: 2, dec: 7, mag: 3.6 },
      { ra: 8, dec: 15, mag: 4.1 },
      { ra: 15, dec: 12, mag: 3.8 },
      { ra: 20, dec: 5, mag: 4.5 },
      { ra: 25, dec: 3, mag: 4.3 },
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4]],
  },
];

// Convert celestial coordinates to 3D position
function celestialTo3D(ra: number, dec: number, radius: number): THREE.Vector3 {
  const raRad = (ra * Math.PI) / 180;
  const decRad = (dec * Math.PI) / 180;

  return new THREE.Vector3(
    radius * Math.cos(decRad) * Math.cos(raRad),
    radius * Math.sin(decRad),
    radius * Math.cos(decRad) * Math.sin(raRad)
  );
}

// Individual constellation component
function Constellation({
  data,
  radius,
  onHover,
  isHovered,
}: {
  data: ConstellationData;
  radius: number;
  onHover: (name: string | null) => void;
  isHovered: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);

  // Convert star positions to 3D
  const starPositions = useMemo(() => {
    return data.stars.map((star) => celestialTo3D(star.ra, star.dec, radius));
  }, [data.stars, radius]);

  // Create line geometry for connections
  const lineGeometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    data.lines.forEach(([a, b]) => {
      points.push(starPositions[a], starPositions[b]);
    });
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [data.lines, starPositions]);

  // Center position for label
  const centerPos = useMemo(() => {
    return celestialTo3D(data.centerRa, data.centerDec, radius * 0.95);
  }, [data.centerRa, data.centerDec, radius]);

  return (
    <group ref={groupRef}>
      {/* Connection lines */}
      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial
          color={isHovered ? "#d4a847" : "#4a4a4a"}
          transparent
          opacity={isHovered ? 0.6 : 0.25}
        />
      </lineSegments>

      {/* Stars */}
      {starPositions.map((pos, i) => {
        const mag = data.stars[i].mag;
        const size = Math.max(0.02, 0.05 - mag * 0.01);

        return (
          <mesh
            key={i}
            position={pos}
            onPointerEnter={() => onHover(data.name)}
            onPointerLeave={() => onHover(null)}
          >
            <sphereGeometry args={[size, 8, 8]} />
            <meshBasicMaterial
              color={isHovered ? "#ffd700" : "#e8e0d5"}
              transparent
              opacity={isHovered ? 0.9 : 0.6}
            />
          </mesh>
        );
      })}

      {/* Constellation symbol (always visible) */}
      <Text
        position={centerPos}
        fontSize={0.15}
        color={isHovered ? "#d4a847" : "#6a6a6a"}
        anchorX="center"
        anchorY="middle"
      >
        {data.symbol}
      </Text>

      {/* Hover info card */}
      {isHovered && (
        <Html
          position={[centerPos.x * 1.1, centerPos.y + 0.3, centerPos.z * 1.1]}
          center
          style={{ pointerEvents: "none" }}
        >
          <div
            className="bg-card/90 backdrop-blur-sm border border-border/50 rounded-lg px-4 py-3 min-w-[200px]"
            style={{ transform: "translateX(-50%)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl text-gold">{data.symbol}</span>
              <span className="font-serif text-cream text-lg">{data.name}</span>
            </div>
            <div className="text-xs text-sepia/70 mb-1">
              Element: <span className="text-cream/80">{data.element}</span>
            </div>
            <p className="text-xs text-cream/60 leading-relaxed">
              {data.description}
            </p>
          </div>
        </Html>
      )}
    </group>
  );
}

// Main constellations component
export function Constellations({ radius = 8 }: { radius?: number }) {
  const { hoveredConstellation, setHoveredConstellation, skyRotation } = useSphereStore();

  return (
    <group rotation={[skyRotation.x, skyRotation.y, skyRotation.z]}>
      {CONSTELLATIONS.map((constellation) => (
        <Constellation
          key={constellation.name}
          data={constellation}
          radius={radius}
          onHover={setHoveredConstellation}
          isHovered={hoveredConstellation === constellation.name}
        />
      ))}
    </group>
  );
}

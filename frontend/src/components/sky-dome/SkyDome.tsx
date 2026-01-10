"use client";

import React, { useMemo } from "react";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { Planet } from "./Planet";
import { useAstrologyStore } from "@/stores/useAstrologyStore";
import { useSphereStore } from "@/stores/useSphereStore";
import { ZODIAC_VISUALS, type ZodiacSign } from "@/types/astrology";
import { eclipticTo3D } from "@/lib/astronomy/coordinateTransform";

interface SkyDomeProps {
  radius?: number;
  showTransits?: boolean;
  showAspects?: boolean;
}

// Zodiac sign marker on the dome rim
function ZodiacMarker({
  sign,
  radius,
}: {
  sign: ZodiacSign;
  radius: number;
}) {
  const config = ZODIAC_VISUALS[sign];

  // Position on the rim (at horizon level)
  const position = useMemo(() => {
    const angle = (config.startDegree + 15) * (Math.PI / 180); // Center of sign
    return new THREE.Vector3(
      Math.cos(angle - Math.PI / 2) * radius,
      0.2, // Slightly above horizon
      Math.sin(angle - Math.PI / 2) * radius
    );
  }, [config.startDegree, radius]);

  // Rotation to face center
  const rotation = useMemo(() => {
    const angle = config.startDegree + 15;
    return [0, -((angle - 90) * Math.PI) / 180, 0] as [number, number, number];
  }, [config.startDegree]);

  return (
    <group position={position} rotation={rotation}>
      {/* Sign symbol */}
      <Text fontSize={0.15} color={config.color} anchorX="center" anchorY="middle">
        {config.symbol}
      </Text>

      {/* Sign name (smaller, below) */}
      <Text
        position={[0, -0.2, 0]}
        fontSize={0.06}
        color="#8a8a8a"
        anchorX="center"
        anchorY="middle"
      >
        {sign}
      </Text>
    </group>
  );
}

// Ecliptic circle (zodiac wheel on the dome)
function EclipticCircle({ radius }: { radius: number }) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 360; i += 2) {
      const pos = eclipticTo3D(i, 0, radius);
      pts.push(pos);
    }
    return pts;
  }, [radius]);

  const lineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return geometry;
  }, [points]);

  return (
    <line>
      <bufferGeometry attach="geometry" {...lineGeometry} />
      <lineBasicMaterial color="#d4a847" transparent opacity={0.3} />
    </line>
  );
}

// Division lines between zodiac signs
function ZodiacDivisions({ radius }: { radius: number }) {
  const lines = useMemo(() => {
    const divisions: React.ReactNode[] = [];

    for (let i = 0; i < 12; i++) {
      const angle = i * 30;
      const start = eclipticTo3D(angle, 0, radius);
      const end = eclipticTo3D(angle, 30, radius * 0.8); // Shorter line toward center

      const points = [start, end];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);

      divisions.push(
        <line key={`div-${i}`}>
          <bufferGeometry attach="geometry" {...geometry} />
          <lineBasicMaterial color="#4a4a4a" transparent opacity={0.2} />
        </line>
      );
    }

    return divisions;
  }, [radius]);

  return <>{lines}</>;
}

// Aspect lines between planets
function AspectLines({ radius }: { radius: number }) {
  const natalPlanets = useAstrologyStore((s) => s.natalPlanets);
  const quality = useSphereStore((s) => s.quality);

  // Only show aspects in high quality mode
  if (quality === "low" || natalPlanets.length < 2) return null;

  const aspectLines = useMemo(() => {
    const lines: React.ReactNode[] = [];

    // Simple aspect detection (major aspects only)
    const majorAspects = [
      { angle: 0, color: "#ffd700", name: "conjunction" },
      { angle: 60, color: "#87ceeb", name: "sextile" },
      { angle: 90, color: "#ff4500", name: "square" },
      { angle: 120, color: "#00ff00", name: "trine" },
      { angle: 180, color: "#ff0000", name: "opposition" },
    ];

    for (let i = 0; i < natalPlanets.length; i++) {
      for (let j = i + 1; j < natalPlanets.length; j++) {
        const p1 = natalPlanets[i];
        const p2 = natalPlanets[j];

        let angleDiff = Math.abs(p1.absoluteDegree - p2.absoluteDegree);
        if (angleDiff > 180) angleDiff = 360 - angleDiff;

        // Check for aspects
        for (const aspect of majorAspects) {
          const orb = 8; // 8 degree orb
          if (Math.abs(angleDiff - aspect.angle) <= orb) {
            const pos1 = eclipticTo3D(p1.absoluteDegree, 15, radius);
            const pos2 = eclipticTo3D(p2.absoluteDegree, 15, radius);

            // Create curved line
            const midPoint = new THREE.Vector3()
              .addVectors(pos1, pos2)
              .multiplyScalar(0.5);
            midPoint.y += 0.5; // Curve upward

            const curve = new THREE.QuadraticBezierCurve3(pos1, midPoint, pos2);
            const points = curve.getPoints(20);
            const geometry = new THREE.BufferGeometry().setFromPoints(points);

            lines.push(
              <line key={`aspect-${i}-${j}`}>
                <bufferGeometry attach="geometry" {...geometry} />
                <lineBasicMaterial
                  color={aspect.color}
                  transparent
                  opacity={0.3}
                  linewidth={1}
                />
              </line>
            );
            break;
          }
        }
      }
    }

    return lines;
  }, [natalPlanets, radius]);

  return <>{aspectLines}</>;
}

export function SkyDome({
  radius = 6,
  showTransits = true,
  showAspects = true,
}: SkyDomeProps) {
  const natalPlanets = useAstrologyStore((s) => s.natalPlanets);
  const transitPlanets = useAstrologyStore((s) => s.transitPlanets);
  const quality = useSphereStore((s) => s.quality);

  // Zodiac signs
  const zodiacSigns: ZodiacSign[] = [
    "Aries", "Taurus", "Gemini", "Cancer",
    "Leo", "Virgo", "Libra", "Scorpio",
    "Sagittarius", "Capricorn", "Aquarius", "Pisces",
  ];

  return (
    <group>
      {/* Dome hemisphere (subtle grid) */}
      <mesh rotation={[0, 0, 0]}>
        <sphereGeometry args={[radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial
          color="#1a1816"
          transparent
          opacity={0.1}
          side={THREE.BackSide}
          wireframe={quality !== "low"}
        />
      </mesh>

      {/* Ecliptic circle */}
      <EclipticCircle radius={radius} />

      {/* Zodiac divisions */}
      <ZodiacDivisions radius={radius} />

      {/* Zodiac markers */}
      {zodiacSigns.map((sign) => (
        <ZodiacMarker key={sign} sign={sign} radius={radius + 0.3} />
      ))}

      {/* Natal planets */}
      {natalPlanets.map((planet) => (
        <Planet
          key={`natal-${planet.name}`}
          planet={planet}
          isTransit={false}
          showLabel={quality !== "low"}
          domeRadius={radius}
        />
      ))}

      {/* Transit planets */}
      {showTransits &&
        transitPlanets.map((planet) => (
          <Planet
            key={`transit-${planet.name}`}
            planet={planet}
            isTransit={true}
            showLabel={quality === "high"}
            domeRadius={radius}
          />
        ))}

      {/* Aspect lines */}
      {showAspects && <AspectLines radius={radius} />}
    </group>
  );
}

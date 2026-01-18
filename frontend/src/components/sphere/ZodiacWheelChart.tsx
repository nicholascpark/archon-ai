"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Billboard, Line } from "@react-three/drei";
import * as THREE from "three";
import { useSphereStore } from "@/stores/useSphereStore";
import { useAstrologyStore } from "@/stores/useAstrologyStore";
import {
  ZODIAC_VISUALS,
  PLANET_VISUALS,
  ASPECT_VISUALS,
  type ZodiacSign,
  type PlanetPosition,
  type AspectType,
} from "@/types/astrology";
import { getAspectAngle, getAspectType } from "@/lib/astronomy/coordinateTransform";

interface ZodiacWheelChartProps {
  radius?: number;
}

// Convert zodiac degree to position on flat wheel
function degreeToWheelPosition(degree: number, radius: number, y: number = 0): THREE.Vector3 {
  // Rotate so 0° Aries is at top, going counterclockwise (traditional chart orientation)
  const angle = ((90 - degree) * Math.PI) / 180;
  return new THREE.Vector3(
    Math.cos(angle) * radius,
    y,
    Math.sin(angle) * radius
  );
}

// Zodiac segment of the wheel
function ZodiacSegment({
  sign,
  radius,
  opacity,
}: {
  sign: ZodiacSign;
  radius: number;
  opacity: number;
}) {
  const config = ZODIAC_VISUALS[sign];
  const startAngle = ((90 - config.startDegree) * Math.PI) / 180;
  const endAngle = ((90 - (config.startDegree + 30)) * Math.PI) / 180;

  // Create arc for this segment
  const innerRadius = radius * 0.8;
  const outerRadius = radius;

  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const segments = 16;

    // Outer arc
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = startAngle + (endAngle - startAngle) * t;
      pts.push(new THREE.Vector3(Math.cos(angle) * outerRadius, 0, Math.sin(angle) * outerRadius));
    }

    // Inner arc (reversed)
    for (let i = segments; i >= 0; i--) {
      const t = i / segments;
      const angle = startAngle + (endAngle - startAngle) * t;
      pts.push(new THREE.Vector3(Math.cos(angle) * innerRadius, 0, Math.sin(angle) * innerRadius));
    }

    pts.push(pts[0]); // Close the shape

    return pts;
  }, [startAngle, endAngle, innerRadius, outerRadius]);

  // Symbol position at segment midpoint
  const symbolPos = useMemo(() => {
    const midAngle = (startAngle + endAngle) / 2;
    const midRadius = (innerRadius + outerRadius) / 2;
    return new THREE.Vector3(
      Math.cos(midAngle) * midRadius,
      0.05,
      Math.sin(midAngle) * midRadius
    );
  }, [startAngle, endAngle, innerRadius, outerRadius]);

  return (
    <group>
      {/* Segment outline */}
      <Line
        points={points}
        color={config.color}
        lineWidth={1}
        opacity={opacity * 0.6}
        transparent
      />

      {/* Zodiac symbol */}
      <Billboard position={symbolPos}>
        <Text
          fontSize={0.25}
          color={config.color}
          anchorX="center"
          anchorY="middle"
          fillOpacity={opacity}
        >
          {config.symbol}
        </Text>
      </Billboard>
    </group>
  );
}

// Planet marker on the wheel
function WheelPlanet({
  planet,
  radius,
  opacity,
  isTransit = false,
}: {
  planet: PlanetPosition;
  radius: number;
  opacity: number;
  isTransit?: boolean;
}) {
  const visual = PLANET_VISUALS[planet.name] || PLANET_VISUALS.Sun;
  const meshRef = useRef<THREE.Mesh>(null);

  // Position planet on wheel - natal on outer ring, transit on inner
  const planetRadius = isTransit ? radius * 0.65 : radius * 0.72;
  const position = degreeToWheelPosition(planet.absoluteDegree, planetRadius, 0.1);

  const size = visual.size * 0.06 * (isTransit ? 0.8 : 1);

  // Gentle pulse animation
  useFrame((_, delta) => {
    if (meshRef.current) {
      const scale = 1 + Math.sin(Date.now() * 0.003) * 0.1;
      meshRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group position={position}>
      {/* Planet sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[size, 12, 12]} />
        <meshBasicMaterial
          color={visual.color}
          transparent
          opacity={opacity}
        />
      </mesh>

      {/* Glow */}
      <mesh scale={1.8}>
        <sphereGeometry args={[size, 12, 12]} />
        <meshBasicMaterial
          color={visual.color}
          transparent
          opacity={opacity * 0.3}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Symbol */}
      <Billboard position={[0, 0.15, 0]}>
        <Text
          fontSize={0.12}
          color={visual.color}
          anchorX="center"
          anchorY="middle"
          fillOpacity={opacity}
        >
          {visual.symbol}
        </Text>
      </Billboard>
    </group>
  );
}

// Geometric aspect pattern (line connecting planets)
function AspectLine({
  planet1,
  planet2,
  aspectType,
  radius,
  opacity,
}: {
  planet1: PlanetPosition;
  planet2: PlanetPosition;
  aspectType: AspectType;
  radius: number;
  opacity: number;
}) {
  const aspectConfig = ASPECT_VISUALS[aspectType];
  const planetRadius = radius * 0.72;

  const pos1 = degreeToWheelPosition(planet1.absoluteDegree, planetRadius, 0.02);
  const pos2 = degreeToWheelPosition(planet2.absoluteDegree, planetRadius, 0.02);

  // Create curved line for certain aspects
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const segments = 20;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = pos1.x + (pos2.x - pos1.x) * t;
      const z = pos1.z + (pos2.z - pos1.z) * t;

      // Curve toward center for visual appeal
      const midFactor = Math.sin(t * Math.PI);
      const curveAmount = aspectType === "opposition" ? 0.1 : 0.05;
      const scale = 1 - curveAmount * midFactor;

      pts.push(new THREE.Vector3(x * scale, 0.02, z * scale));
    }

    return pts;
  }, [pos1, pos2, aspectType]);

  return (
    <Line
      points={points}
      color={aspectConfig.color}
      lineWidth={aspectType === "conjunction" ? 2 : 1.5}
      opacity={opacity * aspectConfig.opacity}
      transparent
      dashed={!!aspectConfig.dashArray}
      dashSize={aspectConfig.dashArray?.[0] || 0}
      gapSize={aspectConfig.dashArray?.[1] || 0}
    />
  );
}

// Major aspect pattern visualization (e.g., grand trine, T-square)
function AspectPattern({
  planets,
  type,
  radius,
  opacity,
}: {
  planets: PlanetPosition[];
  type: "grand-trine" | "t-square" | "grand-cross";
  radius: number;
  opacity: number;
}) {
  const planetRadius = radius * 0.72;

  const points = useMemo(() => {
    return planets.map((p) => degreeToWheelPosition(p.absoluteDegree, planetRadius, 0.03));
  }, [planets, planetRadius]);

  // Close the shape
  const shapePoints = [...points, points[0]];

  // Pattern colors
  const colors: Record<string, string> = {
    "grand-trine": "#00ff88",
    "t-square": "#ff4444",
    "grand-cross": "#ff0000",
  };

  return (
    <group>
      {/* Filled pattern area */}
      <Line
        points={shapePoints}
        color={colors[type]}
        lineWidth={2}
        opacity={opacity * 0.7}
        transparent
      />

      {/* Glow effect for pattern */}
      <Line
        points={shapePoints}
        color={colors[type]}
        lineWidth={6}
        opacity={opacity * 0.2}
        transparent
      />
    </group>
  );
}

// Detect major aspect patterns
function detectAspectPatterns(planets: PlanetPosition[]): {
  type: "grand-trine" | "t-square" | "grand-cross";
  planets: PlanetPosition[];
}[] {
  const patterns: { type: "grand-trine" | "t-square" | "grand-cross"; planets: PlanetPosition[] }[] = [];
  const orb = 8;

  // Detect grand trines (3 planets each 120° apart)
  for (let i = 0; i < planets.length - 2; i++) {
    for (let j = i + 1; j < planets.length - 1; j++) {
      for (let k = j + 1; k < planets.length; k++) {
        const p1 = planets[i];
        const p2 = planets[j];
        const p3 = planets[k];

        const angle12 = getAspectAngle(p1.absoluteDegree, p2.absoluteDegree);
        const angle23 = getAspectAngle(p2.absoluteDegree, p3.absoluteDegree);
        const angle31 = getAspectAngle(p3.absoluteDegree, p1.absoluteDegree);

        // Check if all three angles are approximately 120°
        if (
          Math.abs(angle12 - 120) <= orb &&
          Math.abs(angle23 - 120) <= orb &&
          Math.abs(angle31 - 120) <= orb
        ) {
          patterns.push({ type: "grand-trine", planets: [p1, p2, p3] });
        }
      }
    }
  }

  // Detect T-squares (opposition with two squares)
  for (let i = 0; i < planets.length - 2; i++) {
    for (let j = i + 1; j < planets.length - 1; j++) {
      const angle = getAspectAngle(planets[i].absoluteDegree, planets[j].absoluteDegree);
      if (Math.abs(angle - 180) <= orb) {
        // Found opposition, look for planet squaring both
        for (let k = 0; k < planets.length; k++) {
          if (k === i || k === j) continue;
          const sq1 = getAspectAngle(planets[k].absoluteDegree, planets[i].absoluteDegree);
          const sq2 = getAspectAngle(planets[k].absoluteDegree, planets[j].absoluteDegree);
          if (Math.abs(sq1 - 90) <= orb && Math.abs(sq2 - 90) <= orb) {
            patterns.push({ type: "t-square", planets: [planets[i], planets[k], planets[j]] });
          }
        }
      }
    }
  }

  return patterns;
}

export function ZodiacWheelChart({ radius = 4 }: ZodiacWheelChartProps) {
  const zoomLevel = useSphereStore((s) => s.zoomLevel);
  const natalPlanets = useAstrologyStore((s) => s.natalPlanets);
  const transitPlanets = useAstrologyStore((s) => s.transitPlanets);

  // Calculate opacity based on zoom (fade in when zoomed out)
  // Start showing at zoomLevel 0.7, fully visible at 0.4
  const opacity = useMemo(() => {
    if (zoomLevel > 0.7) return 0;
    if (zoomLevel < 0.4) return 1;
    return (0.7 - zoomLevel) / 0.3;
  }, [zoomLevel]);

  // Zodiac signs
  const zodiacSigns: ZodiacSign[] = [
    "Aries", "Taurus", "Gemini", "Cancer",
    "Leo", "Virgo", "Libra", "Scorpio",
    "Sagittarius", "Capricorn", "Aquarius", "Pisces",
  ];

  // Calculate aspects between natal planets
  const aspects = useMemo(() => {
    const result: { p1: PlanetPosition; p2: PlanetPosition; type: AspectType }[] = [];

    for (let i = 0; i < natalPlanets.length - 1; i++) {
      for (let j = i + 1; j < natalPlanets.length; j++) {
        const angle = getAspectAngle(natalPlanets[i].absoluteDegree, natalPlanets[j].absoluteDegree);
        const type = getAspectType(angle, 8) as AspectType | null;
        if (type) {
          result.push({ p1: natalPlanets[i], p2: natalPlanets[j], type });
        }
      }
    }

    return result;
  }, [natalPlanets]);

  // Detect major patterns
  const patterns = useMemo(() => {
    return detectAspectPatterns(natalPlanets);
  }, [natalPlanets]);

  // Don't render if not visible
  if (opacity === 0) return null;

  return (
    <group position={[0, 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Center point */}
      <mesh>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial color="#d4a847" transparent opacity={opacity * 0.8} />
      </mesh>

      {/* Inner circle (houses area) */}
      <Line
        points={Array.from({ length: 65 }, (_, i) => {
          const angle = (i / 64) * Math.PI * 2;
          return new THREE.Vector3(Math.cos(angle) * radius * 0.5, 0, Math.sin(angle) * radius * 0.5);
        })}
        color="#4a4a4a"
        lineWidth={1}
        opacity={opacity * 0.4}
        transparent
      />

      {/* Natal planet ring */}
      <Line
        points={Array.from({ length: 65 }, (_, i) => {
          const angle = (i / 64) * Math.PI * 2;
          return new THREE.Vector3(Math.cos(angle) * radius * 0.72, 0, Math.sin(angle) * radius * 0.72);
        })}
        color="#666666"
        lineWidth={1}
        opacity={opacity * 0.3}
        transparent
      />

      {/* Zodiac wheel segments */}
      {zodiacSigns.map((sign) => (
        <ZodiacSegment key={sign} sign={sign} radius={radius} opacity={opacity} />
      ))}

      {/* Major aspect patterns (geometric shapes) */}
      {patterns.map((pattern, idx) => (
        <AspectPattern
          key={`pattern-${idx}`}
          planets={pattern.planets}
          type={pattern.type}
          radius={radius}
          opacity={opacity}
        />
      ))}

      {/* Individual aspect lines */}
      {aspects.map((aspect, idx) => (
        <AspectLine
          key={`aspect-${idx}`}
          planet1={aspect.p1}
          planet2={aspect.p2}
          aspectType={aspect.type}
          radius={radius}
          opacity={opacity * 0.6}
        />
      ))}

      {/* Natal planets */}
      {natalPlanets.map((planet) => (
        <WheelPlanet
          key={`natal-${planet.name}`}
          planet={planet}
          radius={radius}
          opacity={opacity}
          isTransit={false}
        />
      ))}

      {/* Transit planets (inner ring) */}
      {transitPlanets.map((planet) => (
        <WheelPlanet
          key={`transit-${planet.name}`}
          planet={planet}
          radius={radius}
          opacity={opacity * 0.8}
          isTransit={true}
        />
      ))}
    </group>
  );
}

export default ZodiacWheelChart;

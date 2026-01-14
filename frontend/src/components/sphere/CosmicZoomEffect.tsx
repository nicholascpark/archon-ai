"use client";

import { useRef, useMemo, useState, useEffect, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useSphereStore } from "@/stores/useSphereStore";
import { Html } from "@react-three/drei";

// Sacred geometry and cosmic symbols
const COSMIC_SYMBOLS = ["✦", "✧", "⋆", "★", "☆", "◇", "◆", "❖", "✴", "✵"];
const ZODIAC_GLYPHS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];
const PLANETARY_SYMBOLS = ["☉", "☽", "☿", "♀", "♂", "♃", "♄", "⛢", "♆", "⯓"];

// Color palette for cosmic dust
const COSMIC_COLORS = {
  stardust: "#e6c65c",
  nebula: "#9d7cd8",
  aurora: "#4ecdc4",
  rose: "#c9a0a0",
  moonlight: "#b8c4d4",
  solar: "#d4a847",
  void: "#2a1f4e",
};

interface ZoomParticle {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  initialZ: number;
  size: number;
  color: THREE.Color;
  symbol?: string;
  rotation: number;
  rotationSpeed: number;
  spiral: number;
  life: number;
  maxLife: number;
  layer: "micro" | "macro" | "symbolic";
}

// Geometric zoom particles streaming toward viewer
function ZoomingDustField({ intensity = 1, active = true }: { intensity?: number; active?: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const particlesRef = useRef<ZoomParticle[]>([]);
  const { camera } = useThree();
  const [tick, setTick] = useState(0);

  const maxParticles = Math.floor(200 * intensity);

  // Spawn new particles
  const spawnParticle = useCallback((layer: "micro" | "macro" | "symbolic"): ZoomParticle => {
    const angle = Math.random() * Math.PI * 2;
    const radius = 1 + Math.random() * 4;
    const spiralOffset = Math.random() * Math.PI * 2;

    const colors = Object.values(COSMIC_COLORS);
    const color = new THREE.Color(colors[Math.floor(Math.random() * colors.length)]);

    let symbol: string | undefined;
    if (layer === "symbolic" && Math.random() > 0.5) {
      const allSymbols = [...COSMIC_SYMBOLS, ...ZODIAC_GLYPHS, ...PLANETARY_SYMBOLS];
      symbol = allSymbols[Math.floor(Math.random() * allSymbols.length)];
    }

    return {
      id: Date.now() + Math.random(),
      position: new THREE.Vector3(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        -15 - Math.random() * 10
      ),
      velocity: new THREE.Vector3(0, 0, 3 + Math.random() * 2),
      initialZ: -15 - Math.random() * 10,
      size: layer === "macro" ? 0.08 + Math.random() * 0.12 : 0.02 + Math.random() * 0.04,
      color,
      symbol,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 2,
      spiral: spiralOffset,
      life: 1,
      maxLife: 3 + Math.random() * 2,
      layer,
    };
  }, []);

  // Initialize particles
  useEffect(() => {
    if (!active) return;

    const layers: ("micro" | "macro" | "symbolic")[] = ["micro", "macro", "symbolic"];
    for (let i = 0; i < maxParticles; i++) {
      const layer = layers[i % 3];
      particlesRef.current.push(spawnParticle(layer));
    }

    return () => {
      particlesRef.current = [];
    };
  }, [active, maxParticles, spawnParticle]);

  // Animate particles
  useFrame((state, delta) => {
    if (!active || !pointsRef.current) return;

    const time = state.clock.getElapsedTime();

    particlesRef.current.forEach((particle, idx) => {
      // Move toward camera with spiral motion
      particle.position.z += particle.velocity.z * delta;

      // Add spiral/geometric motion
      const spiralRadius = Math.max(0.1, Math.abs(particle.position.z) * 0.15);
      const spiralAngle = time * 0.5 + particle.spiral + particle.position.z * 0.3;
      particle.position.x += Math.cos(spiralAngle) * spiralRadius * delta * 0.5;
      particle.position.y += Math.sin(spiralAngle) * spiralRadius * delta * 0.5;

      // Rotation
      particle.rotation += particle.rotationSpeed * delta;

      // Life decay based on proximity
      if (particle.position.z > 2) {
        particle.life -= delta * 2;
      }

      // Reset particle when it passes camera or dies
      if (particle.position.z > 5 || particle.life <= 0) {
        const newParticle = spawnParticle(particle.layer);
        Object.assign(particle, newParticle);
      }
    });

    // Update geometry
    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const colors = pointsRef.current.geometry.attributes.color.array as Float32Array;
    const sizes = pointsRef.current.geometry.attributes.size.array as Float32Array;

    particlesRef.current.forEach((particle, i) => {
      if (i * 3 >= positions.length) return;

      positions[i * 3] = particle.position.x;
      positions[i * 3 + 1] = particle.position.y;
      positions[i * 3 + 2] = particle.position.z;

      // Color with distance fade
      const distanceFade = Math.max(0, Math.min(1, (5 - particle.position.z) / 20));
      const lifeFade = particle.life;
      const fade = distanceFade * lifeFade;

      colors[i * 3] = particle.color.r * fade;
      colors[i * 3 + 1] = particle.color.g * fade;
      colors[i * 3 + 2] = particle.color.b * fade;

      // Size increases as particles approach
      const proximityScale = Math.max(0.5, 1 + (particle.position.z + 10) * 0.1);
      sizes[i] = particle.size * proximityScale * lifeFade;
    });

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.geometry.attributes.color.needsUpdate = true;
    pointsRef.current.geometry.attributes.size.needsUpdate = true;

    setTick((t) => t + 1);
  });

  // Create initial geometry
  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(maxParticles * 3);
    const colors = new Float32Array(maxParticles * 3);
    const sizes = new Float32Array(maxParticles);

    for (let i = 0; i < maxParticles; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = -20;
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 1;
      sizes[i] = 0.05;
    }

    return { positions, colors, sizes };
  }, [maxParticles]);

  if (!active) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        vertexColors
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// Floating cosmic symbols layer
function SymbolicUniverseLayer({ active = true }: { active?: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  const symbols = useMemo(() => {
    const items: Array<{
      symbol: string;
      position: [number, number, number];
      color: string;
      size: number;
      speed: number;
    }> = [];

    // Zodiac ring
    ZODIAC_GLYPHS.forEach((glyph, i) => {
      const angle = (i / 12) * Math.PI * 2;
      const radius = 6;
      items.push({
        symbol: glyph,
        position: [
          Math.cos(angle) * radius,
          Math.sin(angle) * radius * 0.3,
          -8 + Math.sin(angle) * 2,
        ],
        color: COSMIC_COLORS.stardust,
        size: 1.2,
        speed: 0.1,
      });
    });

    // Planetary symbols scattered
    PLANETARY_SYMBOLS.forEach((symbol, i) => {
      const angle = Math.random() * Math.PI * 2;
      const radius = 3 + Math.random() * 4;
      items.push({
        symbol,
        position: [
          Math.cos(angle) * radius,
          (Math.random() - 0.5) * 4,
          -5 - Math.random() * 5,
        ],
        color: Object.values(COSMIC_COLORS)[i % Object.values(COSMIC_COLORS).length],
        size: 0.8 + Math.random() * 0.4,
        speed: 0.05 + Math.random() * 0.1,
      });
    });

    return items;
  }, []);

  useFrame(({ clock }) => {
    if (!groupRef.current || !active) return;
    const time = clock.getElapsedTime();
    groupRef.current.rotation.y = time * 0.02;
    groupRef.current.rotation.x = Math.sin(time * 0.1) * 0.05;
  });

  if (!active) return null;

  return (
    <group ref={groupRef}>
      {symbols.map((item, idx) => (
        <FloatingSymbol key={idx} {...item} index={idx} />
      ))}
    </group>
  );
}

// Individual floating symbol
function FloatingSymbol({
  symbol,
  position,
  color,
  size,
  speed,
  index,
}: {
  symbol: string;
  position: [number, number, number];
  color: string;
  size: number;
  speed: number;
  index: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const time = clock.getElapsedTime();

    // Gentle floating motion
    meshRef.current.position.y = position[1] + Math.sin(time * speed + index) * 0.3;
    meshRef.current.position.z = position[2] + Math.cos(time * speed * 0.5 + index) * 0.2;

    // Subtle rotation
    meshRef.current.rotation.y = Math.sin(time * 0.3 + index) * 0.2;
  });

  return (
    <mesh ref={meshRef} position={position}>
      <Html
        center
        style={{
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        <div
          className="transition-all duration-300"
          style={{
            fontSize: `${size * 20}px`,
            color,
            textShadow: `0 0 15px ${color}, 0 0 30px ${color}40`,
            filter: `drop-shadow(0 0 10px ${color}60)`,
            opacity: 0.7,
          }}
        >
          {symbol}
        </div>
      </Html>
    </mesh>
  );
}

// GPS/Location cosmic anchor point
function LocationAnchor({ latitude, longitude }: { latitude?: number; longitude?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringsRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current || !ringsRef.current) return;
    const time = clock.getElapsedTime();

    // Pulsing core
    const pulse = 1 + Math.sin(time * 2) * 0.1;
    meshRef.current.scale.setScalar(pulse);

    // Rotating rings
    ringsRef.current.rotation.x = time * 0.5;
    ringsRef.current.rotation.y = time * 0.3;
    ringsRef.current.rotation.z = time * 0.2;
  });

  return (
    <group position={[0, 0, -3]}>
      {/* Core point */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial
          color={COSMIC_COLORS.aurora}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Orbital rings */}
      <group ref={ringsRef}>
        {[0.3, 0.5, 0.7].map((radius, i) => (
          <mesh key={i} rotation={[Math.PI / 2 + i * 0.3, i * 0.5, 0]}>
            <torusGeometry args={[radius, 0.01, 8, 32]} />
            <meshBasicMaterial
              color={COSMIC_COLORS.aurora}
              transparent
              opacity={0.4 - i * 0.1}
            />
          </mesh>
        ))}
      </group>

      {/* Location label */}
      <Html position={[0, -0.5, 0]} center>
        <div className="text-center pointer-events-none">
          <div
            className="text-xs font-mono opacity-60"
            style={{ color: COSMIC_COLORS.aurora }}
          >
            {latitude?.toFixed(4) || "—"}, {longitude?.toFixed(4) || "—"}
          </div>
          <div
            className="text-[10px] opacity-40 mt-1"
            style={{ color: COSMIC_COLORS.moonlight }}
          >
            your cosmic anchor
          </div>
        </div>
      </Html>
    </group>
  );
}

// Constellation lines background
function ConstellationWeb({ active = true }: { active?: boolean }) {
  const linesRef = useRef<THREE.Group>(null);

  const constellationPoints = useMemo(() => {
    const lines: Array<{ start: THREE.Vector3; end: THREE.Vector3; color: string }> = [];

    // Generate random constellation-like connections
    const stars: THREE.Vector3[] = [];
    for (let i = 0; i < 30; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const radius = 8 + Math.random() * 4;
      stars.push(
        new THREE.Vector3(
          radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.sin(phi) * Math.sin(theta),
          -10 + radius * Math.cos(phi) * 0.3
        )
      );
    }

    // Connect nearby stars
    stars.forEach((star, i) => {
      const nearby = stars
        .map((s, j) => ({ star: s, dist: star.distanceTo(s), idx: j }))
        .filter((s) => s.idx !== i && s.dist < 4)
        .slice(0, 2);

      nearby.forEach((n) => {
        lines.push({
          start: star,
          end: n.star,
          color: COSMIC_COLORS.moonlight,
        });
      });
    });

    return { lines, stars };
  }, []);

  useFrame(({ clock }) => {
    if (!linesRef.current || !active) return;
    const time = clock.getElapsedTime();
    linesRef.current.rotation.y = time * 0.01;
  });

  if (!active) return null;

  return (
    <group ref={linesRef}>
      {/* Star points */}
      {constellationPoints.stars.map((star, i) => (
        <mesh key={`star-${i}`} position={star}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshBasicMaterial
            color={COSMIC_COLORS.stardust}
            transparent
            opacity={0.6}
          />
        </mesh>
      ))}

      {/* Connection lines */}
      {constellationPoints.lines.map((line, i) => (
        <ConstellationLine key={`line-${i}`} start={line.start} end={line.end} color={line.color} />
      ))}
    </group>
  );
}

// Single constellation line
function ConstellationLine({
  start,
  end,
  color,
}: {
  start: THREE.Vector3;
  end: THREE.Vector3;
  color: string;
}) {
  const lineGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
    return geo;
  }, [start, end]);

  const lineMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.2,
    });
  }, [color]);

  const lineObj = useMemo(() => {
    return new THREE.Line(lineGeometry, lineMaterial);
  }, [lineGeometry, lineMaterial]);

  return <primitive object={lineObj} />;
}

// Main cosmic zoom effect component
export function CosmicZoomEffect() {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [zoomActive, setZoomActive] = useState(true);
  const quality = useSphereStore((s) => s.quality);
  const isDragging = useSphereStore((s) => s.isDragging);

  // Get user location
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => {
          // Default to a mystical location if geolocation fails
          setLocation({ latitude: 33.8688, longitude: 151.2093 }); // Sydney Observatory
        }
      );
    }
  }, []);

  // Adjust intensity based on quality
  const intensity = quality === "high" ? 1 : quality === "medium" ? 0.6 : 0.3;

  // Reduce effect when dragging
  const effectIntensity = isDragging ? intensity * 0.3 : intensity;

  return (
    <group>
      {/* Background constellation web */}
      <ConstellationWeb active={zoomActive} />

      {/* Symbolic universe layer */}
      <SymbolicUniverseLayer active={zoomActive} />

      {/* Main zooming dust field */}
      <ZoomingDustField intensity={effectIntensity} active={zoomActive} />

      {/* Location anchor */}
      {location && (
        <LocationAnchor latitude={location.latitude} longitude={location.longitude} />
      )}
    </group>
  );
}

export { ZoomingDustField, SymbolicUniverseLayer, LocationAnchor, ConstellationWeb };

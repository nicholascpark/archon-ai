"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSphereStore } from "@/stores/useSphereStore";
import { Html } from "@react-three/drei";

// Celestial symbols for each direction
const DIRECTION_SYMBOLS = {
  left: { symbol: "☽", label: "memory", color: "#9d7cd8" },
  right: { symbol: "★", label: "social", color: "#c9a0a0" },
  up: { symbol: "♈", label: "charts", color: "#3d6b6b" },
  down: { symbol: "☉", label: "chat", color: "#d4a847" },
};

interface SwipeHintProps {
  position: [number, number, number];
  symbol: string;
  label: string;
  color: string;
  opacity: number;
  direction: "left" | "right" | "up" | "down";
}

function SwipeHint({ position, symbol, label, color, opacity, direction }: SwipeHintProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Animate the hint
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();

    // Gentle floating animation
    const floatOffset = Math.sin(t * 2) * 0.05;
    const pulseScale = 1 + Math.sin(t * 3) * 0.1;

    if (direction === "left" || direction === "right") {
      meshRef.current.position.x = position[0] + (direction === "left" ? -floatOffset : floatOffset);
    } else {
      meshRef.current.position.y = position[1] + (direction === "up" ? floatOffset : -floatOffset);
    }

    meshRef.current.scale.setScalar(pulseScale);
  });

  return (
    <mesh ref={meshRef} position={position}>
      <Html
        center
        style={{
          opacity,
          transition: "opacity 0.3s ease",
          pointerEvents: "none",
        }}
      >
        <div className="flex flex-col items-center gap-1">
          {/* Glowing symbol */}
          <div
            className="relative text-2xl"
            style={{
              color,
              textShadow: `0 0 10px ${color}, 0 0 20px ${color}40`,
              filter: `drop-shadow(0 0 8px ${color}60)`,
            }}
          >
            {symbol}
          </div>
          {/* Label */}
          <span
            className="text-[10px] font-serif tracking-wider opacity-60"
            style={{ color }}
          >
            {label}
          </span>
          {/* Animated arrow */}
          <div
            className="text-xs animate-pulse"
            style={{ color }}
          >
            {direction === "left" && "←"}
            {direction === "right" && "→"}
            {direction === "up" && "↑"}
            {direction === "down" && "↓"}
          </div>
        </div>
      </Html>
    </mesh>
  );
}

// Romantic swipe arc indicator
function SwipeArc({ progress, color }: { progress: number; color: string }) {
  const points = useMemo(() => {
    const curve = new THREE.EllipseCurve(
      0, 0,
      2.2, 2.2,
      0, Math.PI * 2 * Math.abs(progress),
      progress < 0,
      0
    );
    return curve.getPoints(50).map(p => new THREE.Vector3(p.x, p.y, 0));
  }, [progress]);

  if (Math.abs(progress) < 0.05) return null;

  // Create line using primitive to avoid JSX conflicts
  const lineGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    return geo;
  }, [points]);

  const lineMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.6,
    });
  }, [color]);

  const lineObj = useMemo(() => {
    return new THREE.Line(lineGeometry, lineMaterial);
  }, [lineGeometry, lineMaterial]);

  return <primitive object={lineObj} />;
}

export function SwipeGestureIndicators() {
  const isDragging = useSphereStore((s) => s.isDragging);
  const swipeMode = useSphereStore((s) => s.swipeMode);
  const activeQuadrant = useSphereStore((s) => s.activeQuadrant);
  const velocity = useSphereStore((s) => s.velocity);

  // Calculate swipe progress for arc
  const swipeProgress = useMemo(() => {
    return Math.max(-1, Math.min(1, velocity.y * 10));
  }, [velocity.y]);

  // Only show in archon mode
  if (swipeMode !== "archon") return null;

  // Get adjacent quadrants for hints
  const getAdjacentHints = () => {
    const hints: { direction: keyof typeof DIRECTION_SYMBOLS; opacity: number }[] = [];

    // Show hints when not dragging (idle state)
    if (!isDragging) {
      hints.push({ direction: "left", opacity: 0.4 });
      hints.push({ direction: "right", opacity: 0.4 });
    }

    return hints;
  };

  const hints = getAdjacentHints();
  const currentColor = DIRECTION_SYMBOLS[activeQuadrant === "chat" ? "down" : "left"].color;

  return (
    <group>
      {/* Direction hints */}
      {hints.map(({ direction, opacity }) => {
        const config = DIRECTION_SYMBOLS[direction];
        const positions: Record<string, [number, number, number]> = {
          left: [-2.8, 0, 0],
          right: [2.8, 0, 0],
          up: [0, 2.2, 0],
          down: [0, -2.2, 0],
        };

        return (
          <SwipeHint
            key={direction}
            position={positions[direction]}
            symbol={config.symbol}
            label={config.label}
            color={config.color}
            opacity={isDragging ? 0.1 : opacity}
            direction={direction}
          />
        );
      })}

      {/* Swipe progress arc */}
      {isDragging && (
        <SwipeArc progress={swipeProgress} color={currentColor} />
      )}

      {/* Center glow during interaction */}
      {isDragging && (
        <mesh>
          <sphereGeometry args={[0.3, 32, 32]} />
          <meshBasicMaterial
            color={currentColor}
            transparent
            opacity={0.3}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  );
}

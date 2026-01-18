"use client";

import { Suspense, useRef, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Stars, AdaptiveDpr } from "@react-three/drei";
import { cn } from "@/lib/utils";
import { useSphereStore } from "@/stores/useSphereStore";
import { CameraController } from "./CameraController";
import type { SphereCanvasProps } from "@/types/sphere";

// Loading fallback
function LoadingFallback() {
  return (
    <mesh>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial color="#1a1816" wireframe />
    </mesh>
  );
}

// Ambient lighting setup
function Lighting() {
  return (
    <>
      {/* Soft ambient light */}
      <ambientLight intensity={0.3} color="#e8e0d5" />

      {/* Main directional light (golden hour feel) */}
      <directionalLight
        position={[5, 10, 5]}
        intensity={0.8}
        color="#ffd4a3"
        castShadow
      />

      {/* Rim light from below (mystical glow) */}
      <pointLight
        position={[0, -5, 0]}
        intensity={0.4}
        color="#9d7cd8"
        distance={20}
      />

      {/* Accent lights at corners */}
      <pointLight
        position={[10, 5, 10]}
        intensity={0.2}
        color="#d4a847"
        distance={30}
      />
      <pointLight
        position={[-10, 5, -10]}
        intensity={0.2}
        color="#7c5cbf"
        distance={30}
      />
    </>
  );
}

// Star field background - disabled to reduce visual clutter
// The zodiac signs, planets, and constellation lines provide enough visual interest
function StarField() {
  return null;
}

export function SphereCanvas({ children, className }: SphereCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const quality = useSphereStore((s) => s.quality);

  // Detect low-end devices and adjust quality
  useEffect(() => {
    const setQuality = useSphereStore.getState().setQuality;

    // Check for mobile or low-end device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

    // Check WebGL capabilities
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");

    if (!gl) {
      setQuality("low");
      return;
    }

    // Check for max texture size as proxy for GPU power
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);

    if (isMobile || maxTextureSize < 4096) {
      setQuality("medium");
    } else if (maxTextureSize >= 8192) {
      setQuality("high");
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed inset-0 w-full h-full",
        "bg-gradient-to-b from-[#0a0908] via-[#12110f] to-[#1a1816]",
        className
      )}
    >
      <Canvas
        shadows={quality === "high"}
        dpr={quality === "high" ? [1, 2] : [1, 1.5]}
        gl={{
          antialias: quality !== "low",
          alpha: true,
          powerPreference: "high-performance",
          stencil: false,
          depth: true,
        }}
        style={{ touchAction: "none" }}
      >
        {/* Adaptive DPR for performance */}
        <AdaptiveDpr pixelated />

        {/* Camera */}
        <PerspectiveCamera
          makeDefault
          position={[0, 0, 8]}
          fov={50}
          near={0.1}
          far={200}
        />

        {/* Camera animation controller - handles smooth zoom transitions */}
        <CameraController />

        {/* Fog for depth */}
        <fog attach="fog" args={["#0a0908", 15, 100]} />

        {/* Lighting */}
        <Lighting />

        {/* Star field background */}
        <StarField />

        {/* Main content with suspense */}
        <Suspense fallback={<LoadingFallback />}>
          {children}
        </Suspense>

        {/* Orbit controls for development (will be replaced by gesture controls) */}
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          rotateSpeed={0.5}
          dampingFactor={0.05}
          enableDamping
        />
      </Canvas>

      {/* Vignette overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 0%, transparent 40%, rgba(10, 9, 8, 0.6) 100%)",
        }}
      />

      {/* Subtle parchment texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}

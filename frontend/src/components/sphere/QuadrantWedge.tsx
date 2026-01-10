"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Html } from "@react-three/drei";
import * as THREE from "three";
import type { QuadrantWedgeProps } from "@/types/sphere";

// Create a solid wedge geometry (orange slice) with curved surface and flat caps
function createSolidWedgeGeometry(
  radius: number,
  segments: number,
  phiStart: number,
  phiLength: number
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();

  const vertices: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];

  // Number of vertical segments (latitude)
  const heightSegments = segments;
  // Number of horizontal segments (longitude) for this wedge
  const widthSegments = Math.max(8, Math.floor(segments * (phiLength / (Math.PI * 2))));

  // Generate curved outer surface vertices
  for (let y = 0; y <= heightSegments; y++) {
    const theta = (y / heightSegments) * Math.PI; // 0 to PI (top to bottom)
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let x = 0; x <= widthSegments; x++) {
      const phi = phiStart + (x / widthSegments) * phiLength;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      // Position on sphere surface
      const px = radius * sinTheta * cosPhi;
      const py = radius * cosTheta;
      const pz = radius * sinTheta * sinPhi;

      vertices.push(px, py, pz);

      // Normal points outward
      normals.push(sinTheta * cosPhi, cosTheta, sinTheta * sinPhi);
    }
  }

  // Generate curved surface indices
  for (let y = 0; y < heightSegments; y++) {
    for (let x = 0; x < widthSegments; x++) {
      const a = y * (widthSegments + 1) + x;
      const b = a + 1;
      const c = a + (widthSegments + 1);
      const d = c + 1;

      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  // Add center point (for caps)
  const centerIndex = vertices.length / 3;
  vertices.push(0, 0, 0); // Center of sphere
  normals.push(0, 0, 0); // Will be overwritten by face normals

  // Add flat cap faces (triangles from center to edges)
  // First edge (at phiStart)
  const edge1Normal = new THREE.Vector3(
    -Math.sin(phiStart),
    0,
    Math.cos(phiStart)
  ).normalize();

  for (let y = 0; y < heightSegments; y++) {
    const a = y * (widthSegments + 1); // First vertex in this row
    const b = (y + 1) * (widthSegments + 1); // First vertex in next row

    // Add triangle: center -> a -> b
    indices.push(centerIndex, b, a);
  }

  // Second edge (at phiStart + phiLength)
  const edge2Normal = new THREE.Vector3(
    Math.sin(phiStart + phiLength),
    0,
    -Math.cos(phiStart + phiLength)
  ).normalize();

  for (let y = 0; y < heightSegments; y++) {
    const a = y * (widthSegments + 1) + widthSegments; // Last vertex in this row
    const b = (y + 1) * (widthSegments + 1) + widthSegments; // Last vertex in next row

    // Add triangle: center -> a -> b
    indices.push(centerIndex, a, b);
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

export function QuadrantWedge({
  config,
  isActive,
  isPulsing,
  onClick,
}: QuadrantWedgeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef(0);

  // Get radius from config or default
  const radius = config.radius ?? 1.5;

  // Create solid wedge geometry (orange slice)
  const geometry = useMemo(
    () => createSolidWedgeGeometry(radius, 32, config.rotationY, Math.PI / 2),
    [config.rotationY, radius]
  );

  // Glow geometry (slightly larger)
  const glowGeometry = useMemo(
    () => createSolidWedgeGeometry(radius * 1.02, 16, config.rotationY, Math.PI / 2),
    [config.rotationY, radius]
  );

  // Animation
  useFrame((_, delta) => {
    if (!meshRef.current) return;

    // Pulse animation when active
    if (isPulsing) {
      pulseRef.current += delta * 8;
      const pulseIntensity = Math.sin(pulseRef.current) * 0.5 + 0.5;

      if (glowRef.current) {
        const material = glowRef.current.material as THREE.MeshBasicMaterial;
        material.opacity = 0.3 + pulseIntensity * 0.4;
      }
    } else {
      pulseRef.current = 0;
    }

    // Subtle breathing animation for active wedge
    if (isActive && meshRef.current) {
      const breathe = Math.sin(Date.now() * 0.001) * 0.01;
      meshRef.current.scale.setScalar(1 + breathe);
    }
  });

  // Calculate label position (center of wedge face)
  const labelPosition = useMemo(() => {
    const angle = config.rotationY + Math.PI / 4; // Center of wedge
    const r = radius * 1.15;
    return new THREE.Vector3(
      Math.cos(angle) * r,
      0,
      Math.sin(angle) * r
    );
  }, [config.rotationY, radius]);

  return (
    <group>
      {/* Main wedge mesh */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        onClick={onClick}
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "default";
        }}
      >
        <meshStandardMaterial
          color={config.color}
          emissive={isActive ? config.emissiveColor : "#1a1816"}
          emissiveIntensity={isActive ? 0.2 : 0.05}
          metalness={0.1}
          roughness={0.85}
          transparent
          opacity={isActive ? 0.85 : 0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Subtle glow layer for active/pulsing state */}
      {(isActive || isPulsing) && (
        <mesh ref={glowRef} geometry={glowGeometry}>
          <meshBasicMaterial
            color={config.color}
            transparent
            opacity={isPulsing ? 0.25 : 0.1}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}

      {/* Edge highlight */}
      <lineSegments>
        <edgesGeometry args={[geometry, 30]} />
        <lineBasicMaterial
          color={isActive ? config.color : "#4a4a4a"}
          transparent
          opacity={isActive ? 0.8 : 0.3}
        />
      </lineSegments>

      {/* Label */}
      <Text
        position={labelPosition}
        fontSize={0.15}
        color={isActive ? "#e8e0d5" : "#8a8a8a"}
        anchorX="center"
        anchorY="middle"
      >
        {config.label}
      </Text>

      {/* Icon symbol */}
      <Text
        position={[
          labelPosition.x * 0.8,
          labelPosition.y + 0.3,
          labelPosition.z * 0.8,
        ]}
        fontSize={0.25}
        color={isActive ? config.color : "#6a6a6a"}
        anchorX="center"
        anchorY="middle"
      >
        {config.icon}
      </Text>

      {/* HTML overlay for active quadrant info */}
      {isActive && (
        <Html
          position={[
            labelPosition.x * 1.1,
            labelPosition.y - 0.3,
            labelPosition.z * 1.1,
          ]}
          center
          style={{
            opacity: 0.7,
            pointerEvents: "none",
          }}
        >
          <div className="font-serif text-xs text-cream/60 whitespace-nowrap">
            {config.description}
          </div>
        </Html>
      )}
    </group>
  );
}

"use client";

import { useRef, useCallback, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGesture } from "@use-gesture/react";
import * as THREE from "three";
import { QuadrantWedge } from "./QuadrantWedge";
import { MysticalEffects } from "./MysticalEffects";
import { useSphereStore } from "@/stores/useSphereStore";
import { QUADRANT_CONFIGS, type QuadrantType, type QuadrantSphereProps } from "@/types/sphere";

// Quadrant order for rotation detection
const QUADRANT_ORDER: QuadrantType[] = ["chat", "memory", "charts", "social"];

// Sensitivity for rotation
const ROTATION_SENSITIVITY = 0.005;

// Sphere radius (shrunk from 2 to 1.5)
const SPHERE_RADIUS = 1.5;

export function QuadrantSphere({
  radius = SPHERE_RADIUS,
  onQuadrantChange,
}: QuadrantSphereProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { gl } = useThree();

  // Store state
  const {
    activeQuadrant,
    rotation,
    skyRotation,
    swipeMode,
    isDragging,
    showModeShiftPulse,
    setActiveQuadrant,
    setRotation,
    setSkyRotation,
    startDrag,
    endDrag,
    applyMomentum,
    triggerModeShift,
  } = useSphereStore();

  // Detect which quadrant is facing the camera
  const detectActiveQuadrant = useCallback(() => {
    if (!groupRef.current) return;

    // Camera is at z=8, looking at origin
    const cameraDir = new THREE.Vector3(0, 0, -1);

    // Get the sphere's rotation
    const sphereRotation = new THREE.Euler(rotation.x, rotation.y, rotation.z);
    const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(sphereRotation);

    // Check each quadrant's normal
    let maxDot = -Infinity;
    let detectedQuadrant: QuadrantType = "chat";

    QUADRANT_ORDER.forEach((quadrantId) => {
      const config = QUADRANT_CONFIGS[quadrantId];

      // Quadrant normal (center of wedge)
      const angle = config.rotationY + Math.PI / 4;
      const normal = new THREE.Vector3(
        Math.sin(angle),
        0,
        Math.cos(angle)
      );

      // Apply sphere rotation to normal
      normal.applyMatrix4(rotationMatrix);

      // Dot product with camera direction
      const dot = normal.dot(cameraDir);

      if (dot > maxDot) {
        maxDot = dot;
        detectedQuadrant = quadrantId;
      }
    });

    // Update if changed
    if (detectedQuadrant !== activeQuadrant) {
      setActiveQuadrant(detectedQuadrant);
      triggerModeShift();
      onQuadrantChange?.(detectedQuadrant);
    }
  }, [rotation, activeQuadrant, setActiveQuadrant, triggerModeShift, onQuadrantChange]);

  // Apply rotation and momentum each frame
  useFrame(() => {
    if (!groupRef.current) return;

    // Apply momentum when not dragging
    if (!isDragging) {
      applyMomentum();
    }

    // Apply rotation to sphere
    groupRef.current.rotation.x = rotation.x;
    groupRef.current.rotation.y = rotation.y;
    groupRef.current.rotation.z = rotation.z;

    // Detect active quadrant (only in archon mode)
    if (swipeMode === "archon") {
      detectActiveQuadrant();
    }
  });

  // Gesture handling
  const bind = useGesture(
    {
      onDragStart: () => {
        startDrag();
      },
      onDrag: ({ delta: [dx, dy], event }) => {
        event?.preventDefault();

        if (swipeMode === "archon") {
          // Update sphere rotation
          setRotation({
            y: rotation.y + dx * ROTATION_SENSITIVITY,
            x: Math.max(
              -Math.PI / 3,
              Math.min(Math.PI / 3, rotation.x + dy * ROTATION_SENSITIVITY)
            ),
          });
        } else {
          // Update sky rotation
          setSkyRotation({
            y: skyRotation.y + dx * ROTATION_SENSITIVITY,
            x: Math.max(
              -Math.PI / 3,
              Math.min(Math.PI / 3, skyRotation.x + dy * ROTATION_SENSITIVITY)
            ),
          });
        }
      },
      onDragEnd: ({ velocity: [vx, vy] }) => {
        endDrag({
          x: vy * ROTATION_SENSITIVITY * 0.5,
          y: vx * ROTATION_SENSITIVITY * 0.5,
        });
      },
    },
    {
      drag: {
        filterTaps: true,
        threshold: 5,
      },
    }
  );

  // Bind gesture handlers to canvas
  useEffect(() => {
    const handlers = bind();
    const domElement = gl.domElement;

    // Type-safe event binding
    const onPointerDown = handlers.onPointerDown as unknown as EventListener;
    const onPointerMove = handlers.onPointerMove as unknown as EventListener;
    const onPointerUp = handlers.onPointerUp as unknown as EventListener;

    domElement.addEventListener("pointerdown", onPointerDown);
    domElement.addEventListener("pointermove", onPointerMove);
    domElement.addEventListener("pointerup", onPointerUp);
    domElement.addEventListener("pointerleave", onPointerUp);

    return () => {
      domElement.removeEventListener("pointerdown", onPointerDown);
      domElement.removeEventListener("pointermove", onPointerMove);
      domElement.removeEventListener("pointerup", onPointerUp);
      domElement.removeEventListener("pointerleave", onPointerUp);
    };
  }, [bind, gl]);

  // Handle quadrant click
  const handleQuadrantClick = useCallback(
    (quadrant: QuadrantType) => {
      if (quadrant === activeQuadrant) {
        // Toggle overlay visibility
        useSphereStore.getState().setOverlayVisible(
          !useSphereStore.getState().overlayVisible
        );
      } else {
        // Animate to clicked quadrant
        const targetAngle = QUADRANT_CONFIGS[quadrant].rotationY;
        setRotation({ y: -targetAngle });
      }
    },
    [activeQuadrant, setRotation]
  );

  return (
    <group ref={groupRef}>
      {/* Mystical effects layer */}
      <MysticalEffects sphereRadius={radius} />

      {/* Central core - subtle warm glow */}
      <mesh>
        <sphereGeometry args={[radius * 0.15, 32, 32]} />
        <meshBasicMaterial
          color="#a08060"
          transparent
          opacity={0.5}
        />
      </mesh>

      {/* Inner glow sphere - very subtle */}
      <mesh>
        <sphereGeometry args={[radius * 0.25, 32, 32]} />
        <meshBasicMaterial
          color="#6b5b7a"
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Quadrant wedges */}
      {QUADRANT_ORDER.map((quadrantId) => (
        <QuadrantWedge
          key={quadrantId}
          config={{ ...QUADRANT_CONFIGS[quadrantId], radius }}
          isActive={activeQuadrant === quadrantId}
          isPulsing={showModeShiftPulse && activeQuadrant === quadrantId}
          onClick={() => handleQuadrantClick(quadrantId)}
        />
      ))}

      {/* Equator ring - subtle gold */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, 0.006, 8, 64]} />
        <meshBasicMaterial color="#8b7355" transparent opacity={0.3} />
      </mesh>

      {/* Meridian rings - very subtle */}
      <mesh>
        <torusGeometry args={[radius, 0.003, 8, 64]} />
        <meshBasicMaterial color="#5a5a5a" transparent opacity={0.2} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[radius, 0.003, 8, 64]} />
        <meshBasicMaterial color="#5a5a5a" transparent opacity={0.2} />
      </mesh>
    </group>
  );
}

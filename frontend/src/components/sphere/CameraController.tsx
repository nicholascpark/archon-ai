"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useSpring, animated } from "@react-spring/three";
import * as THREE from "three";
import { useSphereStore } from "@/stores/useSphereStore";

// Zoom range constants (matching useSphereStore)
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 1.5;

// Camera configurations for different zoom levels
const CAMERA_POSITIONS = {
  // Normal view - looking straight at the sphere
  normal: {
    position: new THREE.Vector3(0, 0, 8),
    lookAt: new THREE.Vector3(0, 0, 0),
    fov: 50,
  },
  // Transit view - elevated orbital angle (~45 degrees)
  transit: {
    position: new THREE.Vector3(0, 12, 12), // Elevated and back
    lookAt: new THREE.Vector3(0, 0, 0),
    fov: 65, // Wider FOV for full chart view
  },
};

/**
 * CameraController - Manages smooth camera transitions based on zoom level
 *
 * Animates the camera from normal view to elevated orbital view when zooming out,
 * providing a dramatic 45-degree tilted perspective of the natal/transit chart.
 */
export function CameraController() {
  const { camera } = useThree();
  const previousZoom = useRef(1.0);

  // Get zoom level from store
  const zoomLevel = useSphereStore((s) => s.zoomLevel);
  const isTransitView = useSphereStore((s) => s.isTransitView);

  // Calculate interpolation factor (0 = normal view, 1 = transit view)
  // zoomLevel 1.0+ = normal, zoomLevel 0.3 = full transit
  const t = Math.max(0, Math.min(1, (1.0 - zoomLevel) / (1.0 - MIN_ZOOM)));

  // Spring animation for smooth transitions
  const [springs, api] = useSpring(() => ({
    posX: CAMERA_POSITIONS.normal.position.x,
    posY: CAMERA_POSITIONS.normal.position.y,
    posZ: CAMERA_POSITIONS.normal.position.z,
    fov: CAMERA_POSITIONS.normal.fov,
    config: {
      mass: 1,
      tension: 80, // Lower tension for smoother, more cinematic feel
      friction: 18, // Higher friction for elegant deceleration
    },
  }));

  // Update spring targets when zoom changes
  useEffect(() => {
    // Interpolate between normal and transit camera positions
    const targetX = THREE.MathUtils.lerp(
      CAMERA_POSITIONS.normal.position.x,
      CAMERA_POSITIONS.transit.position.x,
      t
    );
    const targetY = THREE.MathUtils.lerp(
      CAMERA_POSITIONS.normal.position.y,
      CAMERA_POSITIONS.transit.position.y,
      t
    );
    const targetZ = THREE.MathUtils.lerp(
      CAMERA_POSITIONS.normal.position.z,
      CAMERA_POSITIONS.transit.position.z,
      t
    );
    const targetFov = THREE.MathUtils.lerp(
      CAMERA_POSITIONS.normal.fov,
      CAMERA_POSITIONS.transit.fov,
      t
    );

    api.start({
      posX: targetX,
      posY: targetY,
      posZ: targetZ,
      fov: targetFov,
    });

    previousZoom.current = zoomLevel;
  }, [t, api, zoomLevel]);

  // Apply animated values to camera each frame
  useFrame((state, delta) => {
    if (camera instanceof THREE.PerspectiveCamera) {
      // Frame-rate independent smoothing factor
      // Using exponential decay: 1 - e^(-k * delta) approximated
      const smoothFactor = Math.min(1, delta * 5);

      // Smoothly interpolate camera position
      camera.position.x = THREE.MathUtils.lerp(
        camera.position.x,
        springs.posX.get(),
        smoothFactor
      );
      camera.position.y = THREE.MathUtils.lerp(
        camera.position.y,
        springs.posY.get(),
        smoothFactor
      );
      camera.position.z = THREE.MathUtils.lerp(
        camera.position.z,
        springs.posZ.get(),
        smoothFactor
      );

      // Smoothly interpolate FOV
      const targetFov = springs.fov.get();
      if (Math.abs(camera.fov - targetFov) > 0.01) {
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, smoothFactor);
        camera.updateProjectionMatrix();
      }

      // Always look at the center (origin where the chart is)
      camera.lookAt(0, 0, 0);
    }
  });

  return null; // Controller component - no visual output
}

export default CameraController;

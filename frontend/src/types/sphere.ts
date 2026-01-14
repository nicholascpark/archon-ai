/**
 * Type definitions for the 3D quadrant sphere navigation system
 */

import type { Euler, Vector3 } from "three";

// Quadrant identifiers
export type QuadrantType = "chat" | "memory" | "charts" | "social";

// Configuration for each quadrant
export interface QuadrantConfig {
  id: QuadrantType;
  label: string;
  description: string;
  color: string;
  emissiveColor: string;
  icon: string; // Unicode symbol
  // Rotation offset to position this wedge (radians)
  rotationY: number;
  // Optional radius override
  radius?: number;
}

// All quadrant configurations - elegant muted palette
export const QUADRANT_CONFIGS: Record<QuadrantType, QuadrantConfig> = {
  chat: {
    id: "chat",
    label: "communication",
    description: "real-time messaging",
    color: "#8b7355",      // Muted bronze/sepia
    emissiveColor: "#5c4a3a",
    icon: "\u2609", // Sun symbol
    rotationY: 0,
  },
  memory: {
    id: "memory",
    label: "identity",
    description: "profile & history",
    color: "#6b5b7a",      // Muted dusty purple
    emissiveColor: "#4a3d5c",
    icon: "\u263D", // Moon symbol
    rotationY: Math.PI / 2,
  },
  charts: {
    id: "charts",
    label: "astrology",
    description: "natal & houses",
    color: "#4a5d5d",      // Deep muted teal
    emissiveColor: "#2d3a3a",
    icon: "\u2648", // Aries symbol (represents charts)
    rotationY: Math.PI,
  },
  social: {
    id: "social",
    label: "connection",
    description: "friends & synastry",
    color: "#7a5a5a",      // Muted dusty rose
    emissiveColor: "#4a3535",
    icon: "\u2606", // Star symbol
    rotationY: (3 * Math.PI) / 2,
  },
};

// Sphere rotation state
export interface SphereRotation {
  x: number;
  y: number;
  z: number;
}

// Velocity for momentum-based rotation
export interface RotationVelocity {
  x: number;
  y: number;
}

// Swipe mode - archon (sphere) or sky (constellations)
export type SwipeMode = "archon" | "sky";

// Sphere store state
export interface SphereState {
  // Current active quadrant
  activeQuadrant: QuadrantType;
  previousQuadrant: QuadrantType | null;

  // Rotation state (Euler angles in radians)
  rotation: SphereRotation;

  // Sky rotation (separate from sphere)
  skyRotation: SphereRotation;

  // Swipe mode
  swipeMode: SwipeMode;

  // Interaction states
  isDragging: boolean;
  velocity: RotationVelocity;

  // UI states
  isTransitioning: boolean;
  overlayVisible: boolean;
  showModeShiftPulse: boolean;

  // Hovered constellation
  hoveredConstellation: string | null;

  // Quality setting for performance
  quality: "low" | "medium" | "high";

  // Zoom state
  zoomLevel: number;
  isTransitView: boolean;
  transitWindowOpen: boolean;
}

// Sphere store actions
export interface SphereActions {
  setActiveQuadrant: (quadrant: QuadrantType) => void;
  setRotation: (rotation: Partial<SphereRotation>) => void;
  setSkyRotation: (rotation: Partial<SphereRotation>) => void;
  setSwipeMode: (mode: SwipeMode) => void;
  toggleSwipeMode: () => void;
  startDrag: () => void;
  endDrag: (velocity: RotationVelocity) => void;
  applyMomentum: () => void;
  triggerModeShift: () => void;
  setOverlayVisible: (visible: boolean) => void;
  setHoveredConstellation: (name: string | null) => void;
  setQuality: (quality: "low" | "medium" | "high") => void;
  // Zoom actions
  setZoomLevel: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setTransitWindowOpen: (open: boolean) => void;
  reset: () => void;
}

// Combined store type
export type SphereStore = SphereState & SphereActions;

// Props for sphere components
export interface QuadrantWedgeProps {
  config: QuadrantConfig;
  isActive: boolean;
  isPulsing: boolean;
  onClick?: () => void;
}

export interface QuadrantSphereProps {
  radius?: number;
  onQuadrantChange?: (quadrant: QuadrantType) => void;
}

export interface SphereCanvasProps {
  children?: React.ReactNode;
  className?: string;
}

// Focal point for quadrant detection
export interface FocalPoint {
  quadrant: QuadrantType;
  confidence: number; // 0-1, how directly facing
  normal: Vector3;
}

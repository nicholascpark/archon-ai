"use client";

import { create } from "zustand";
import type {
  SphereStore,
  QuadrantType,
  SphereRotation,
  RotationVelocity,
  SwipeMode,
} from "@/types/sphere";

// Friction for momentum decay
const FRICTION = 0.95;
const MIN_VELOCITY = 0.001;

// Zoom settings
const MIN_ZOOM = 0.3;  // Max zoomed out (transit view)
const MAX_ZOOM = 1.5;  // Max zoomed in
const DEFAULT_ZOOM = 1.0;

// Initial state
const initialState = {
  activeQuadrant: "chat" as QuadrantType,
  previousQuadrant: null as QuadrantType | null,
  rotation: { x: 0, y: 0, z: 0 },
  skyRotation: { x: 0, y: 0, z: 0 },
  swipeMode: "archon" as SwipeMode,
  isDragging: false,
  velocity: { x: 0, y: 0 },
  isTransitioning: false,
  overlayVisible: false,
  showModeShiftPulse: false,
  hoveredConstellation: null as string | null,
  quality: "high" as const,
  // Zoom state
  zoomLevel: DEFAULT_ZOOM,
  isTransitView: false,
  transitWindowOpen: false,
};

export const useSphereStore = create<SphereStore>((set, get) => ({
  ...initialState,

  setActiveQuadrant: (quadrant: QuadrantType) => {
    const current = get().activeQuadrant;
    if (current !== quadrant) {
      set({
        previousQuadrant: current,
        activeQuadrant: quadrant,
        isTransitioning: true,
      });
      // Reset transition flag after animation
      setTimeout(() => set({ isTransitioning: false }), 500);
    }
  },

  setRotation: (rotation: Partial<SphereRotation>) => {
    set((state) => ({
      rotation: { ...state.rotation, ...rotation },
    }));
  },

  setSkyRotation: (rotation: Partial<SphereRotation>) => {
    set((state) => ({
      skyRotation: { ...state.skyRotation, ...rotation },
    }));
  },

  setSwipeMode: (mode: SwipeMode) => {
    set({ swipeMode: mode });
  },

  toggleSwipeMode: () => {
    set((state) => ({
      swipeMode: state.swipeMode === "archon" ? "sky" : "archon",
    }));
  },

  startDrag: () => {
    set({ isDragging: true, velocity: { x: 0, y: 0 } });
  },

  endDrag: (velocity: RotationVelocity) => {
    set({ isDragging: false, velocity });
  },

  applyMomentum: () => {
    const { isDragging, velocity, rotation, skyRotation, swipeMode } = get();

    // Don't apply momentum while dragging
    if (isDragging) return;

    // Check if velocity is significant
    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
    if (speed < MIN_VELOCITY) {
      set({ velocity: { x: 0, y: 0 } });
      return;
    }

    if (swipeMode === "archon") {
      // Apply velocity to sphere rotation
      const newRotation = {
        x: rotation.x + velocity.x,
        y: rotation.y + velocity.y,
        z: rotation.z,
      };
      set({ rotation: newRotation });
    } else {
      // Apply velocity to sky rotation
      const newSkyRotation = {
        x: skyRotation.x + velocity.x,
        y: skyRotation.y + velocity.y,
        z: skyRotation.z,
      };
      set({ skyRotation: newSkyRotation });
    }

    // Apply friction
    const newVelocity = {
      x: velocity.x * FRICTION,
      y: velocity.y * FRICTION,
    };

    set({ velocity: newVelocity });
  },

  triggerModeShift: () => {
    set({ showModeShiftPulse: true });
    // Reset pulse after animation
    setTimeout(() => set({ showModeShiftPulse: false }), 600);
  },

  setOverlayVisible: (visible: boolean) => {
    set({ overlayVisible: visible });
  },

  setHoveredConstellation: (name: string | null) => {
    set({ hoveredConstellation: name });
  },

  setQuality: (quality: "low" | "medium" | "high") => {
    set({ quality });
  },

  // Zoom functions
  setZoomLevel: (zoom: number) => {
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
    const isTransitView = clampedZoom <= MIN_ZOOM + 0.1;
    set({ zoomLevel: clampedZoom, isTransitView });
  },

  zoomIn: () => {
    const { zoomLevel } = get();
    const newZoom = Math.min(MAX_ZOOM, zoomLevel + 0.1);
    const isTransitView = newZoom <= MIN_ZOOM + 0.1;
    set({ zoomLevel: newZoom, isTransitView });
  },

  zoomOut: () => {
    const { zoomLevel } = get();
    const newZoom = Math.max(MIN_ZOOM, zoomLevel - 0.1);
    const isTransitView = newZoom <= MIN_ZOOM + 0.1;
    set({ zoomLevel: newZoom, isTransitView });
  },

  setTransitWindowOpen: (open: boolean) => {
    set({ transitWindowOpen: open });
  },

  reset: () => {
    set(initialState);
  },
}));

// Selector hooks for common patterns
export const useActiveQuadrant = () =>
  useSphereStore((state) => state.activeQuadrant);

export const useRotation = () =>
  useSphereStore((state) => state.rotation);

export const useSkyRotation = () =>
  useSphereStore((state) => state.skyRotation);

export const useSwipeMode = () =>
  useSphereStore((state) => state.swipeMode);

export const useIsDragging = () =>
  useSphereStore((state) => state.isDragging);

export const useIsTransitioning = () =>
  useSphereStore((state) => state.isTransitioning);

export const useQuality = () =>
  useSphereStore((state) => state.quality);

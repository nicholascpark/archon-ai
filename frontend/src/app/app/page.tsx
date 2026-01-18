"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useSphereStore } from "@/stores/useSphereStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useAstrologyStore } from "@/stores/useAstrologyStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import { usePlanetaryData, useDemoPlanetaryData } from "@/hooks/usePlanetaryData";

// Dynamic import to prevent SSR issues with Three.js
const SphereCanvas = dynamic(
  () => import("@/components/sphere/SphereCanvas").then((mod) => mod.SphereCanvas),
  {
    ssr: false,
    loading: () => <LoadingScreen />,
  }
);

const QuadrantSphere = dynamic(
  () => import("@/components/sphere/QuadrantSphere").then((mod) => mod.QuadrantSphere),
  { ssr: false }
);

const SkyDome = dynamic(
  () => import("@/components/sky-dome/SkyDome").then((mod) => mod.SkyDome),
  { ssr: false }
);

const Constellations = dynamic(
  () => import("@/components/sky-dome/Constellations").then((mod) => mod.Constellations),
  { ssr: false }
);

// Enhanced space-themed overlays
const EnhancedChatOverlay = dynamic(
  () => import("@/components/overlays/SpaceThemedOverlay").then((mod) => mod.EnhancedChatOverlay),
  { ssr: false }
);

const EnhancedMemoryOverlay = dynamic(
  () => import("@/components/overlays/SpaceThemedOverlay").then((mod) => mod.EnhancedMemoryOverlay),
  { ssr: false }
);

const EnhancedChartOverlay = dynamic(
  () => import("@/components/overlays/SpaceThemedOverlay").then((mod) => mod.EnhancedChartOverlay),
  { ssr: false }
);

const EnhancedSocialOverlay = dynamic(
  () => import("@/components/overlays/SpaceThemedOverlay").then((mod) => mod.EnhancedSocialOverlay),
  { ssr: false }
);

// Transit window and zoom controls
const TransitWindow = dynamic(
  () => import("@/components/overlays/TransitWindow").then((mod) => mod.TransitWindow),
  { ssr: false }
);

const ZoomControls = dynamic(
  () => import("@/components/overlays/TransitWindow").then((mod) => mod.ZoomControls),
  { ssr: false }
);

// New romantic swipe UI components
const SwipeGestureIndicators = dynamic(
  () => import("@/components/sphere/SwipeGestureIndicators").then((mod) => mod.SwipeGestureIndicators),
  { ssr: false }
);

const SwipeTrailEffect = dynamic(
  () => import("@/components/sphere/SwipeTrailEffect").then((mod) => mod.SwipeTrailEffect),
  { ssr: false }
);

const AmbientSparkles = dynamic(
  () => import("@/components/sphere/SwipeTrailEffect").then((mod) => mod.AmbientSparkles),
  { ssr: false }
);

const RomanticAmbientEffects = dynamic(
  () => import("@/components/sphere/RomanticAmbientEffects").then((mod) => mod.RomanticAmbientEffects),
  { ssr: false }
);

// Cosmic zoom effect - magical dust streaming toward user
const CosmicZoomEffect = dynamic(
  () => import("@/components/sphere/CosmicZoomEffect").then((mod) => mod.CosmicZoomEffect),
  { ssr: false }
);

// Enhanced UI components
import {
  EnhancedQuadrantIndicator,
  SwipeProgressBar,
  SwipeInstructionHint,
} from "@/components/ui/EnhancedQuadrantIndicator";

// Loading screen
function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        {/* Animated sigil */}
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold/30 to-primary/30 animate-pulse" />
          <span className="absolute inset-0 flex items-center justify-center text-3xl text-gold animate-float">
            &#9737;
          </span>
        </div>

        {/* Loading text */}
        <p className="font-serif text-cream/60 text-sm animate-pulse-soft">
          aligning the celestial sphere...
        </p>
      </div>
    </div>
  );
}

// Quadrant indicator (bottom of screen)
function QuadrantIndicator() {
  const activeQuadrant = useSphereStore((s) => s.activeQuadrant);
  const swipeMode = useSphereStore((s) => s.swipeMode);

  const quadrantLabels = {
    chat: { label: "communication", icon: "&#9737;", color: "text-gold" },
    memory: { label: "identity", icon: "&#9789;", color: "text-primary" },
    charts: { label: "astrology", icon: "&#9800;", color: "text-water" },
    social: { label: "connection", icon: "&#9734;", color: "text-fire" },
  };

  const current = quadrantLabels[activeQuadrant];

  // Don't show quadrant in sky mode
  if (swipeMode === "sky") return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="flex items-center gap-3 px-4 py-2 bg-card/60 backdrop-blur-md rounded-full border border-border/30">
        <span
          className={`text-lg ${current.color}`}
          dangerouslySetInnerHTML={{ __html: current.icon }}
        />
        <span className="font-serif text-cream/80 text-sm">{current.label}</span>
      </div>
    </div>
  );
}

// Swipe mode toggle
function SwipeModeToggle() {
  const swipeMode = useSphereStore((s) => s.swipeMode);
  const toggleSwipeMode = useSphereStore((s) => s.toggleSwipeMode);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={toggleSwipeMode}
        className="flex items-center gap-2 px-4 py-2 bg-card/60 backdrop-blur-md rounded-full border border-border/30 hover:border-gold/30 transition-colors"
      >
        <span className="text-sm">
          {swipeMode === "archon" ? "☉" : "☆"}
        </span>
        <span className="font-serif text-cream/70 text-xs">
          {swipeMode === "archon" ? "archon" : "sky"}
        </span>
      </button>
    </div>
  );
}

// Instructions overlay
function InstructionsOverlay() {
  const swipeMode = useSphereStore((s) => s.swipeMode);
  const hoveredConstellation = useSphereStore((s) => s.hoveredConstellation);

  // Show constellation name when hovering
  if (swipeMode === "sky" && hoveredConstellation) {
    return (
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <div className="px-4 py-2 bg-card/80 backdrop-blur-md rounded-full border border-gold/30">
          <p className="font-serif text-gold text-sm text-center">
            {hoveredConstellation}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <p className="font-serif text-cream/40 text-xs text-center">
        {swipeMode === "archon"
          ? "drag to rotate the archon sphere"
          : "drag to explore the celestial sphere"}
      </p>
    </div>
  );
}

// Planet count indicator
function PlanetIndicator() {
  const natalPlanets = useAstrologyStore((s) => s.natalPlanets);
  const isLoading = useAstrologyStore((s) => s.isLoadingNatal);
  const swipeMode = useSphereStore((s) => s.swipeMode);

  // In sky mode, show different info
  if (swipeMode === "sky") {
    return (
      <div className="fixed top-6 right-6 z-50 pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-card/60 backdrop-blur-md rounded-full border border-border/30">
          <span className="text-primary text-sm">☆</span>
          <span className="text-xs text-cream/60">12 constellations</span>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="fixed top-6 right-6 z-50 pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-card/60 backdrop-blur-md rounded-full border border-border/30">
          <span className="text-xs text-cream/40 animate-pulse">loading chart...</span>
        </div>
      </div>
    );
  }

  if (natalPlanets.length === 0) return null;

  return (
    <div className="fixed top-6 right-6 z-50 pointer-events-none">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-card/60 backdrop-blur-md rounded-full border border-border/30">
        <span className="text-gold text-sm">☉</span>
        <span className="text-xs text-cream/60">{natalPlanets.length} planets</span>
      </div>
    </div>
  );
}

export default function SphereHome() {
  const { token, user } = useAuthStore();
  const natalPlanets = useAstrologyStore((s) => s.natalPlanets);
  const swipeMode = useSphereStore((s) => s.swipeMode);

  // Initialize WebSocket connection for chat
  useWebSocket();

  // Fetch planetary data from backend
  const { fetchNatalChart, hasChart } = usePlanetaryData();

  // Use demo data if no chart available after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasChart && natalPlanets.length === 0) {
        // Load demo data for visualization
        import("@/hooks/usePlanetaryData").then(({ useDemoPlanetaryData }) => {
          // We'll use the demo data directly
        });
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [hasChart, natalPlanets.length]);

  // Handle quadrant changes
  const handleQuadrantChange = (quadrant: string) => {
    // Could trigger analytics, sounds, or other effects here
    console.log(`Mode shift: ${quadrant}`);
  };

  return (
    <>
      {/* 3D Canvas with sphere and sky dome */}
      <SphereCanvas>
        {/* Sky dome with planets */}
        <SkyDome radius={5} showTransits={true} showAspects={true} />

        {/* Constellations layer (visible in sky mode, subtle in archon mode) */}
        <Constellations radius={7} />

        {/* Romantic ambient effects (shooting stars, floating particles) */}
        <RomanticAmbientEffects />

        {/* Cosmic zoom effect - magical dust streaming geometrically toward viewer */}
        <CosmicZoomEffect />

        {/* Ambient sparkles around sphere - reduced for cleaner view */}
        <AmbientSparkles count={10} />

        {/* Swipe trail effect (particles during drag) */}
        <SwipeTrailEffect />

        {/* Swipe gesture direction indicators */}
        <SwipeGestureIndicators />

        {/* Navigation sphere */}
        <QuadrantSphere onQuadrantChange={handleQuadrantChange} />

        {/* Transit window (appears when zoomed out) */}
        <TransitWindow />
      </SphereCanvas>

      {/* Enhanced space-themed overlays - temporarily disabled to fix UI blocking
      <EnhancedChatOverlay />
      <EnhancedMemoryOverlay />
      <EnhancedChartOverlay />
      <EnhancedSocialOverlay />
      */}

      {/* UI overlays outside canvas */}
      <EnhancedQuadrantIndicator />
      <SwipeProgressBar />
      <SwipeInstructionHint />
      <InstructionsOverlay />
      <PlanetIndicator />
      <SwipeModeToggle />

      {/* Zoom controls (left side) */}
      <ZoomControls />
    </>
  );
}

// Component to load demo data
function DemoDataLoader() {
  useDemoPlanetaryData();
  return null;
}

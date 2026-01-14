"use client";

import { useEffect, useState, useRef } from "react";
import { useSphereStore } from "@/stores/useSphereStore";

// Quadrant configuration with romantic theming
const QUADRANT_CONFIG = {
  chat: {
    label: "communication",
    icon: "☉",
    color: "#d4a847",
    bgGradient: "from-amber-900/30 to-yellow-900/20",
    description: "speak from the heart",
    romanticIcon: "💬",
  },
  memory: {
    label: "identity",
    icon: "☽",
    color: "#9d7cd8",
    bgGradient: "from-purple-900/30 to-violet-900/20",
    description: "remember who you are",
    romanticIcon: "🌙",
  },
  charts: {
    label: "astrology",
    icon: "♈",
    color: "#3d6b6b",
    bgGradient: "from-teal-900/30 to-cyan-900/20",
    description: "read the stars",
    romanticIcon: "✨",
  },
  social: {
    label: "connection",
    icon: "★",
    color: "#c9a0a0",
    bgGradient: "from-rose-900/30 to-pink-900/20",
    description: "find your soulmate",
    romanticIcon: "💫",
  },
};

type QuadrantType = keyof typeof QUADRANT_CONFIG;

// Sparkle component with CSS animation
function Sparkle({ index }: { index: number }) {
  const delay = index * 200;

  return (
    <span
      className="absolute w-1 h-1 bg-gold rounded-full animate-sparkle-rise"
      style={{
        left: `${20 + index * 25}%`,
        bottom: "100%",
        animationDelay: `${delay}ms`,
      }}
    />
  );
}

export function EnhancedQuadrantIndicator() {
  const activeQuadrant = useSphereStore((s) => s.activeQuadrant) as QuadrantType;
  const previousQuadrant = useSphereStore((s) => s.previousQuadrant) as QuadrantType | null;
  const swipeMode = useSphereStore((s) => s.swipeMode);
  const isTransitioning = useSphereStore((s) => s.isTransitioning);
  const isDragging = useSphereStore((s) => s.isDragging);

  const [showDescription, setShowDescription] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const config = QUADRANT_CONFIG[activeQuadrant];
  const prevConfig = previousQuadrant ? QUADRANT_CONFIG[previousQuadrant] : null;

  // Trigger animation on quadrant change
  useEffect(() => {
    setAnimationKey((k) => k + 1);
  }, [activeQuadrant]);

  // Show description briefly after transition
  useEffect(() => {
    if (isTransitioning) {
      setShowDescription(true);
      const timer = setTimeout(() => setShowDescription(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isTransitioning, activeQuadrant]);

  // Don't show in sky mode
  if (swipeMode === "sky") return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div
        key={animationKey}
        className="relative animate-indicator-enter"
      >
        {/* Main indicator */}
        <div
          className={`
            relative flex items-center gap-4 px-6 py-3
            bg-gradient-to-r ${config.bgGradient}
            backdrop-blur-md rounded-full
            border border-border/30
            transition-all duration-500 ease-out
          `}
          style={{
            boxShadow: `0 0 30px ${config.color}20, 0 4px 20px rgba(0,0,0,0.3)`,
          }}
        >
          {/* Sparkles during transition */}
          {isTransitioning && (
            <>
              <Sparkle index={0} />
              <Sparkle index={1} />
              <Sparkle index={2} />
            </>
          )}

          {/* Icon with glow */}
          <span
            className={`text-2xl relative transition-transform duration-500 ${
              isTransitioning ? "animate-icon-pulse" : ""
            }`}
            style={{
              color: config.color,
              textShadow: `0 0 15px ${config.color}, 0 0 30px ${config.color}60`,
              filter: `drop-shadow(0 0 10px ${config.color})`,
            }}
          >
            {config.icon}

            {/* Pulse ring */}
            {isTransitioning && (
              <span
                className="absolute inset-0 rounded-full animate-pulse-ring"
                style={{ borderColor: config.color, border: "2px solid" }}
              />
            )}
          </span>

          {/* Label section */}
          <div className="flex flex-col">
            <span
              className="font-serif text-sm tracking-wide transition-colors duration-300"
              style={{ color: config.color }}
            >
              {config.label}
            </span>

            {/* Description (shows during transition) */}
            <span
              className={`
                text-xs text-cream/50 font-serif italic
                transition-all duration-300 overflow-hidden
                ${showDescription ? "max-h-8 opacity-60" : "max-h-0 opacity-0"}
              `}
            >
              {config.description}
            </span>
          </div>

          {/* Romantic icon */}
          <span
            className={`text-lg transition-all duration-200 ${
              isDragging ? "scale-80 opacity-30" : "opacity-60"
            }`}
          >
            {config.romanticIcon}
          </span>
        </div>

        {/* Swipe direction hints (visible during drag) */}
        <div
          className={`
            absolute -left-16 top-1/2 -translate-y-1/2 text-cream/40
            transition-all duration-200
            ${isDragging ? "opacity-50 translate-x-0" : "opacity-0 translate-x-2"}
          `}
        >
          <span className="text-2xl">←</span>
        </div>
        <div
          className={`
            absolute -right-16 top-1/2 -translate-y-1/2 text-cream/40
            transition-all duration-200
            ${isDragging ? "opacity-50 translate-x-0" : "opacity-0 -translate-x-2"}
          `}
        >
          <span className="text-2xl">→</span>
        </div>

        {/* Connection line (during transition between quadrants) */}
        {isTransitioning && prevConfig && (
          <div
            className="absolute -top-8 left-1/2 -translate-x-1/2 animate-fade-in"
          >
            <div className="flex items-center gap-2 text-xs">
              <span style={{ color: prevConfig.color }}>{prevConfig.icon}</span>
              <span className="text-cream/30">→</span>
              <span style={{ color: config.color }}>{config.icon}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Mini indicator for compact display
export function MiniQuadrantIndicator() {
  const activeQuadrant = useSphereStore((s) => s.activeQuadrant) as QuadrantType;
  const swipeMode = useSphereStore((s) => s.swipeMode);

  if (swipeMode === "sky") return null;

  const config = QUADRANT_CONFIG[activeQuadrant];

  return (
    <div className="fixed bottom-4 left-4 z-50 pointer-events-none">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md border border-border/30 transition-all duration-300"
        style={{
          backgroundColor: `${config.color}20`,
          boxShadow: `0 0 20px ${config.color}30`,
        }}
      >
        <span
          className="text-lg"
          style={{
            color: config.color,
            textShadow: `0 0 10px ${config.color}`,
          }}
        >
          {config.icon}
        </span>
      </div>
    </div>
  );
}

// Swipe progress bar
export function SwipeProgressBar() {
  const activeQuadrant = useSphereStore((s) => s.activeQuadrant) as QuadrantType;
  const isDragging = useSphereStore((s) => s.isDragging);
  const velocity = useSphereStore((s) => s.velocity);
  const swipeMode = useSphereStore((s) => s.swipeMode);

  if (swipeMode === "sky") return null;

  const config = QUADRANT_CONFIG[activeQuadrant];
  const progress = Math.min(1, Math.abs(velocity.y) * 20);

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
      <div
        className={`
          w-48 h-1 bg-card/50 rounded-full overflow-hidden backdrop-blur-sm
          transition-all duration-200 origin-center
          ${isDragging ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"}
        `}
      >
        <div
          className="h-full rounded-full transition-all duration-100"
          style={{
            backgroundColor: config.color,
            width: `${progress * 100}%`,
          }}
        />
      </div>
    </div>
  );
}

// Swipe instruction hint
export function SwipeInstructionHint() {
  const swipeMode = useSphereStore((s) => s.swipeMode);
  const isDragging = useSphereStore((s) => s.isDragging);
  const [showHint, setShowHint] = useState(true);

  // Hide hint after first drag
  useEffect(() => {
    if (isDragging) {
      setShowHint(false);
    }
  }, [isDragging]);

  if (!showHint || swipeMode === "sky") return null;

  return (
    <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
      <div className="flex items-center gap-3 px-4 py-2 bg-card/40 backdrop-blur-sm rounded-full animate-pulse-soft">
        <span className="text-cream/40 text-xl animate-swipe-hint">←</span>
        <span className="text-cream/40 text-xs font-serif">swipe to explore</span>
        <span className="text-cream/40 text-xl animate-swipe-hint-reverse">→</span>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useSphereStore } from "@/stores/useSphereStore";
import { useAstrologyStore } from "@/stores/useAstrologyStore";

// Transit aspect configurations
const TRANSIT_ASPECTS = {
  conjunction: { symbol: "☌", angle: 0, color: "#d4a847", intensity: "major" },
  opposition: { symbol: "☍", angle: 180, color: "#c9a0a0", intensity: "major" },
  trine: { symbol: "△", angle: 120, color: "#4ecdc4", intensity: "major" },
  square: { symbol: "□", angle: 90, color: "#ff6b6b", intensity: "major" },
  sextile: { symbol: "⚹", angle: 60, color: "#9d7cd8", intensity: "minor" },
  quincunx: { symbol: "⚻", angle: 150, color: "#b8c4d4", intensity: "minor" },
};

// Sample transit data (in production, this would come from backend)
const CURRENT_TRANSITS = [
  {
    id: 1,
    transitPlanet: "Mars",
    transitSign: "Aries",
    natalPlanet: "Sun",
    natalSign: "Leo",
    aspect: "trine",
    orb: 2.3,
    applying: true,
    message: "Dynamic energy flows harmoniously to your core essence",
  },
  {
    id: 2,
    transitPlanet: "Venus",
    transitSign: "Pisces",
    natalPlanet: "Moon",
    natalSign: "Cancer",
    aspect: "trine",
    orb: 1.5,
    applying: false,
    message: "Emotional depth meets divine love in cosmic harmony",
  },
  {
    id: 3,
    transitPlanet: "Saturn",
    transitSign: "Pisces",
    natalPlanet: "Mercury",
    natalSign: "Gemini",
    aspect: "square",
    orb: 3.1,
    applying: true,
    message: "Structure challenges communication — discipline your thoughts",
  },
  {
    id: 4,
    transitPlanet: "Jupiter",
    transitSign: "Taurus",
    natalPlanet: "Venus",
    natalSign: "Taurus",
    aspect: "conjunction",
    orb: 0.8,
    applying: false,
    message: "Abundance amplifies your capacity for love and beauty",
  },
];

// Gold letter animation component
function GoldLetter({ char, delay, className }: { char: string; delay: number; className?: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay * 50);
    return () => clearTimeout(timer);
  }, [delay]);

  if (char === " ") return <span className="inline-block w-2" />;

  return (
    <span
      className={cn(
        "inline-block transition-all duration-500",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
        className
      )}
      style={{
        color: "#d4a847",
        textShadow: "0 0 20px rgba(212, 168, 71, 0.8), 0 0 40px rgba(212, 168, 71, 0.4)",
        filter: "drop-shadow(0 0 10px rgba(212, 168, 71, 0.6))",
      }}
    >
      {char}
    </span>
  );
}

// Animated gold text component
function GoldText({ text, className, startDelay = 0 }: { text: string; className?: string; startDelay?: number }) {
  return (
    <span className={className}>
      {text.split("").map((char, i) => (
        <GoldLetter key={i} char={char} delay={startDelay + i} />
      ))}
    </span>
  );
}

// Transit aspect card
function TransitCard({
  transit,
  index,
  isExpanded,
  onToggle,
}: {
  transit: typeof CURRENT_TRANSITS[0];
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const aspect = TRANSIT_ASPECTS[transit.aspect as keyof typeof TRANSIT_ASPECTS];

  return (
    <div
      className={cn(
        "rounded-xl overflow-hidden transition-all duration-500",
        "cursor-pointer hover:scale-[1.02]"
      )}
      style={{
        background: `linear-gradient(135deg, rgba(${hexToRgb(aspect.color)}, 0.15) 0%, rgba(10, 10, 20, 0.9) 100%)`,
        border: `1px solid ${aspect.color}40`,
        boxShadow: isExpanded ? `0 0 30px ${aspect.color}30, 0 0 0 2px ${aspect.color}` : "none",
        animationDelay: `${index * 100}ms`,
      }}
      onClick={onToggle}
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Aspect symbol */}
          <span
            className="text-2xl"
            style={{
              color: aspect.color,
              textShadow: `0 0 15px ${aspect.color}`,
            }}
          >
            {aspect.symbol}
          </span>

          {/* Planets */}
          <div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-cream/80">{transit.transitPlanet}</span>
              <span className="text-cream/30">in</span>
              <span style={{ color: aspect.color }}>{transit.transitSign}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-cream/50">
              <span>{transit.aspect}</span>
              <span>→</span>
              <span>{transit.natalPlanet}</span>
              <span className="text-cream/30">({transit.natalSign})</span>
            </div>
          </div>
        </div>

        {/* Orb indicator */}
        <div className="text-right">
          <p className="text-xs text-cream/40">orb</p>
          <p className="font-mono text-sm" style={{ color: aspect.color }}>
            {transit.orb.toFixed(1)}°
          </p>
        </div>
      </div>

      {/* Expanded content */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-500",
          isExpanded ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="px-4 pb-4 border-t" style={{ borderColor: `${aspect.color}20` }}>
          {/* Gold letter message */}
          <div className="mt-3">
            <p className="text-xs text-cream/30 uppercase tracking-wider mb-2">celestial message</p>
            <p className="font-serif text-sm leading-relaxed">
              <GoldText text={transit.message} startDelay={0} />
            </p>
          </div>

          {/* Applying/Separating indicator */}
          <div className="flex items-center gap-2 mt-3">
            <span
              className={cn(
                "px-2 py-1 rounded text-xs",
                transit.applying ? "bg-emerald-900/30 text-emerald-400" : "bg-amber-900/30 text-amber-400"
              )}
            >
              {transit.applying ? "↗ applying" : "↘ separating"}
            </span>
            <span className="text-xs text-cream/30">
              {aspect.intensity} aspect
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Circular transit chart visualization
function TransitChartVisualization() {
  return (
    <div
      className="relative w-full aspect-square max-w-xs mx-auto rounded-full"
      style={{
        background: "radial-gradient(circle, rgba(212, 168, 71, 0.05) 0%, transparent 70%)",
        border: "1px solid rgba(212, 168, 71, 0.2)",
      }}
    >
      {/* Zodiac wheel */}
      <div className="absolute inset-4 rounded-full border border-gold/20">
        {/* Zodiac signs around the wheel */}
        {["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"].map((sign, i) => {
          const angle = (i * 30 - 90) * (Math.PI / 180);
          const radius = 45;
          const x = 50 + radius * Math.cos(angle);
          const y = 50 + radius * Math.sin(angle);

          return (
            <span
              key={sign}
              className="absolute text-xs transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                color: "rgba(212, 168, 71, 0.5)",
              }}
            >
              {sign}
            </span>
          );
        })}
      </div>

      {/* Inner natal chart ring */}
      <div className="absolute inset-12 rounded-full border border-purple-500/30" />

      {/* Center label */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <span className="text-2xl text-gold">☉</span>
          <p className="text-xs text-cream/40 mt-1">natal + transit</p>
        </div>
      </div>

      {/* Sample aspect lines */}
      <svg className="absolute inset-0 w-full h-full">
        <line
          x1="30%" y1="30%"
          x2="70%" y2="70%"
          stroke="rgba(78, 205, 196, 0.4)"
          strokeWidth="1"
          strokeDasharray="4,4"
        />
        <line
          x1="70%" y1="30%"
          x2="30%" y2="70%"
          stroke="rgba(212, 168, 71, 0.4)"
          strokeWidth="1"
          strokeDasharray="4,4"
        />
      </svg>
    </div>
  );
}

// Main Transit Window Component
export function TransitWindow() {
  const isTransitView = useSphereStore((s) => s.isTransitView);
  const transitWindowOpen = useSphereStore((s) => s.transitWindowOpen);
  const setTransitWindowOpen = useSphereStore((s) => s.setTransitWindowOpen);
  const zoomLevel = useSphereStore((s) => s.zoomLevel);

  const [expandedTransit, setExpandedTransit] = useState<number | null>(null);
  const [showContent, setShowContent] = useState(false);

  // Auto-open when in transit view
  useEffect(() => {
    if (isTransitView && !transitWindowOpen) {
      const timer = setTimeout(() => setTransitWindowOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isTransitView, transitWindowOpen, setTransitWindowOpen]);

  // Animate content in
  useEffect(() => {
    if (transitWindowOpen) {
      const timer = setTimeout(() => setShowContent(true), 300);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [transitWindowOpen]);

  const isOpen = isTransitView && transitWindowOpen;

  return (
    <div
      className={cn(
        "fixed inset-0 flex items-end justify-center pb-8 z-[90]",
        "transition-all duration-700",
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
      style={{ pointerEvents: isOpen ? "auto" : "none" }}
    >
        {/* Semi-transparent backdrop */}
        <div
          className="absolute inset-0 backdrop-blur-sm"
          style={{
            background: "radial-gradient(ellipse at bottom, rgba(212, 168, 71, 0.1) 0%, rgba(10, 10, 20, 0.7) 70%)",
          }}
          onClick={() => setTransitWindowOpen(false)}
        />

        {/* Transit window panel */}
        <div
          className={cn(
            "relative w-full max-w-2xl mx-4 max-h-[70vh]",
            "rounded-t-3xl overflow-hidden",
            "transform transition-all duration-700 ease-out",
            isOpen ? "translate-y-0" : "translate-y-full"
          )}
          style={{
            background: "linear-gradient(180deg, rgba(20, 20, 35, 0.98) 0%, rgba(10, 10, 20, 0.95) 100%)",
            border: "1px solid rgba(212, 168, 71, 0.3)",
            borderBottom: "none",
            boxShadow: `
              0 -20px 60px rgba(212, 168, 71, 0.2),
              inset 0 1px 0 rgba(212, 168, 71, 0.2)
            `,
          }}
        >
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-2">
            <div
              className="w-12 h-1 rounded-full"
              style={{ background: "rgba(212, 168, 71, 0.4)" }}
            />
          </div>

          {/* Header */}
          <div className="px-6 py-4 border-b border-gold/20">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-xl tracking-wide">
                  <GoldText text="Transit Observatory" />
                </h2>
                <p className="text-cream/40 text-sm mt-1">
                  viewing celestial movements from above
                </p>
              </div>

              {/* Zoom indicator */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gold/10">
                <span className="text-gold text-sm">🔭</span>
                <span className="text-xs text-gold/80">
                  zoom: {Math.round((1 - zoomLevel) * 100 + 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div
            className={cn(
              "p-6 overflow-y-auto transition-all duration-500",
              showContent ? "opacity-100" : "opacity-0"
            )}
            style={{ maxHeight: "calc(70vh - 120px)" }}
          >
            {/* Transit chart visualization */}
            <div className="mb-6">
              <TransitChartVisualization />
            </div>

            {/* Transit heading with gold letters */}
            <div className="text-center mb-6">
              <p className="font-serif text-lg">
                <GoldText text="Current Celestial Alignments" startDelay={10} />
              </p>
              <p className="text-cream/30 text-xs mt-2">
                tap each transit to reveal its cosmic message
              </p>
            </div>

            {/* Transit cards */}
            <div className="space-y-3">
              {CURRENT_TRANSITS.map((transit, index) => (
                <TransitCard
                  key={transit.id}
                  transit={transit}
                  index={index}
                  isExpanded={expandedTransit === transit.id}
                  onToggle={() => setExpandedTransit(
                    expandedTransit === transit.id ? null : transit.id
                  )}
                />
              ))}
            </div>

            {/* Summary message */}
            <div
              className="mt-6 p-4 rounded-xl text-center"
              style={{
                background: "rgba(212, 168, 71, 0.05)",
                border: "1px solid rgba(212, 168, 71, 0.15)",
              }}
            >
              <p className="text-xs text-cream/40 uppercase tracking-wider mb-2">
                cosmic summary
              </p>
              <p className="font-serif text-sm">
                <GoldText
                  text="The heavens move in your favor — embrace the trine energies"
                  startDelay={20}
                />
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Zoom Controls Component
export function ZoomControls() {
  const zoomLevel = useSphereStore((s) => s.zoomLevel);
  const zoomIn = useSphereStore((s) => s.zoomIn);
  const zoomOut = useSphereStore((s) => s.zoomOut);
  const isTransitView = useSphereStore((s) => s.isTransitView);

  return (
    <div className="fixed left-6 top-1/2 -translate-y-1/2 z-50">
      <div
        className="flex flex-col gap-2 p-2 rounded-full"
        style={{
          background: "rgba(20, 20, 35, 0.8)",
          border: "1px solid rgba(212, 168, 71, 0.2)",
          backdropFilter: "blur(10px)",
        }}
      >
        {/* Zoom in */}
        <button
          onClick={zoomIn}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            "transition-all duration-200",
            "hover:bg-gold/20"
          )}
          style={{ color: "#d4a847" }}
        >
          <span className="text-lg">+</span>
        </button>

        {/* Zoom indicator */}
        <div className="relative h-24 mx-auto w-1 rounded-full bg-gold/20">
          <div
            className="absolute bottom-0 left-0 right-0 rounded-full bg-gold transition-all duration-200"
            style={{ height: `${((zoomLevel - 0.3) / 1.2) * 100}%` }}
          />
        </div>

        {/* Zoom out */}
        <button
          onClick={zoomOut}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            "transition-all duration-200",
            "hover:bg-gold/20"
          )}
          style={{ color: "#d4a847" }}
        >
          <span className="text-lg">−</span>
        </button>

        {/* Transit view indicator */}
        {isTransitView && (
          <div
            className="mt-2 px-2 py-1 rounded text-center"
            style={{
              background: "rgba(212, 168, 71, 0.2)",
              border: "1px solid rgba(212, 168, 71, 0.3)",
            }}
          >
            <span className="text-[10px] text-gold">transit</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Utility
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
  }
  return "255, 255, 255";
}

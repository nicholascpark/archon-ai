"use client";

import { useEffect, useState, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useSphereStore } from "@/stores/useSphereStore";

// Space-themed overlay color palette
const OVERLAY_THEMES = {
  chat: {
    accent: "#d4a847",
    glow: "rgba(212, 168, 71, 0.3)",
    border: "rgba(212, 168, 71, 0.4)",
    gradient: "from-amber-900/20 via-transparent to-amber-900/10",
    icon: "☉",
    title: "communication",
    subtitle: "cosmic dialogue",
  },
  memory: {
    accent: "#9d7cd8",
    glow: "rgba(157, 124, 216, 0.3)",
    border: "rgba(157, 124, 216, 0.4)",
    gradient: "from-purple-900/20 via-transparent to-purple-900/10",
    icon: "☽",
    title: "identity",
    subtitle: "celestial memory",
  },
  charts: {
    accent: "#4ecdc4",
    glow: "rgba(78, 205, 196, 0.3)",
    border: "rgba(78, 205, 196, 0.4)",
    gradient: "from-teal-900/20 via-transparent to-teal-900/10",
    icon: "♈",
    title: "astrology",
    subtitle: "natal wisdom",
  },
  social: {
    accent: "#c9a0a0",
    glow: "rgba(201, 160, 160, 0.3)",
    border: "rgba(201, 160, 160, 0.4)",
    gradient: "from-rose-900/20 via-transparent to-rose-900/10",
    icon: "★",
    title: "connection",
    subtitle: "synastry bonds",
  },
};

type QuadrantType = keyof typeof OVERLAY_THEMES;

// Animated star particles for overlay background
function OverlayParticles({ color }: { color: string }) {
  const [particles] = useState(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      delay: Math.random() * 3,
      duration: 2 + Math.random() * 2,
    }))
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full animate-pulse"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: color,
            opacity: 0.4,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            boxShadow: `0 0 ${p.size * 2}px ${color}`,
          }}
        />
      ))}
    </div>
  );
}

// Animated border glow effect
function GlowingBorder({ color, active }: { color: string; active: boolean }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Corner accents */}
      {["top-left", "top-right", "bottom-left", "bottom-right"].map((corner) => (
        <div
          key={corner}
          className={cn(
            "absolute w-8 h-8 transition-all duration-700",
            corner.includes("top") ? "top-0" : "bottom-0",
            corner.includes("left") ? "left-0" : "right-0",
            active ? "opacity-100" : "opacity-0"
          )}
          style={{
            borderColor: color,
            borderWidth: 2,
            borderStyle: "solid",
            borderTopWidth: corner.includes("top") ? 2 : 0,
            borderBottomWidth: corner.includes("bottom") ? 2 : 0,
            borderLeftWidth: corner.includes("left") ? 2 : 0,
            borderRightWidth: corner.includes("right") ? 2 : 0,
            boxShadow: `0 0 20px ${color}40`,
          }}
        />
      ))}

      {/* Animated scan line */}
      {active && (
        <div
          className="absolute left-0 right-0 h-px animate-scan-line"
          style={{
            background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
            boxShadow: `0 0 10px ${color}`,
          }}
        />
      )}
    </div>
  );
}

// Base overlay window component
interface SpaceWindowProps {
  children: ReactNode;
  quadrant: QuadrantType;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export function SpaceWindow({ children, quadrant, isOpen, onClose, className }: SpaceWindowProps) {
  const theme = OVERLAY_THEMES[quadrant];
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Delay content reveal for dramatic effect
      const timer = setTimeout(() => setShowContent(true), 200);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [isOpen]);

  return (
    <div
      className={cn(
        "fixed inset-0 flex items-center justify-center p-4 z-[100]",
        "transition-all duration-500 ease-out",
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      {/* Backdrop with cosmic blur */}
      <div
        className={cn(
          "absolute inset-0 backdrop-blur-md",
          "transition-opacity duration-500",
          isOpen ? "opacity-100" : "opacity-0"
        )}
        style={{
          background: `radial-gradient(ellipse at center, ${theme.glow} 0%, rgba(10, 10, 20, 0.85) 70%)`,
        }}
        onClick={onClose}
      />

      {/* Main window */}
      <div
        className={cn(
          "relative w-full max-w-2xl mx-4",
          "h-[60vh] max-h-[500px]",
          "rounded-2xl overflow-hidden",
          "transform transition-all duration-700 ease-out",
          isOpen ? "scale-100 translate-y-0" : "scale-90 translate-y-8",
          className
        )}
        style={{
          background: `linear-gradient(135deg, rgba(20, 20, 35, 0.95) 0%, rgba(10, 10, 20, 0.98) 100%)`,
          border: `1px solid ${theme.border}`,
          boxShadow: `
            0 0 40px ${theme.glow},
            inset 0 0 60px rgba(0, 0, 0, 0.5),
            0 25px 50px -12px rgba(0, 0, 0, 0.8)
          `,
        }}
      >
        {/* Animated particles */}
        <OverlayParticles color={theme.accent} />

        {/* Glowing border */}
        <GlowingBorder color={theme.accent} active={isOpen} />

        {/* Window header */}
        <div
          className="relative z-10 flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: theme.border }}
        >
          <div className="flex items-center gap-3">
            {/* Animated icon */}
            <span
              className={cn(
                "text-2xl transition-all duration-500",
                showContent ? "opacity-100 scale-100" : "opacity-0 scale-50"
              )}
              style={{
                color: theme.accent,
                textShadow: `0 0 20px ${theme.accent}, 0 0 40px ${theme.accent}40`,
                filter: `drop-shadow(0 0 10px ${theme.accent})`,
              }}
            >
              {theme.icon}
            </span>

            <div
              className={cn(
                "transition-all duration-500 delay-100",
                showContent ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
              )}
            >
              <h2
                className="font-serif text-lg tracking-wide"
                style={{ color: theme.accent }}
              >
                {theme.title}
              </h2>
              <p className="text-xs text-cream/40 font-light tracking-wider">
                {theme.subtitle}
              </p>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded-full",
              "transition-all duration-300",
              "hover:bg-white/10"
            )}
            style={{ color: theme.accent }}
          >
            <span className="text-xl">×</span>
          </button>
        </div>

        {/* Content area */}
        <div
          className={cn(
            "relative z-10 flex-1 overflow-y-auto p-6",
            "transition-all duration-700 delay-200",
            showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
          style={{ height: "calc(100% - 70px)" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

// Chat quadrant content
export function ChatQuadrantContent() {
  return (
    <div className="h-full flex flex-col">
      {/* Chat messages area */}
      <div className="flex-1 space-y-4 overflow-y-auto pr-2">
        <WelcomeMessage
          icon="☉"
          color="#d4a847"
          title="Cosmic Communication"
          message="Speak to the celestial intelligence. Your words traverse the astral plane."
        />

        {/* Placeholder messages */}
        <div className="space-y-3">
          <MessageBubble sender="archon" color="#d4a847">
            The stars align in your favor today. What wisdom do you seek?
          </MessageBubble>
        </div>
      </div>

      {/* Input area */}
      <div className="mt-4 pt-4 border-t border-amber-900/30">
        <div
          className="flex items-center gap-3 p-3 rounded-xl"
          style={{
            background: "rgba(212, 168, 71, 0.1)",
            border: "1px solid rgba(212, 168, 71, 0.2)",
          }}
        >
          <input
            type="text"
            placeholder="transmit your message..."
            className="flex-1 bg-transparent text-cream/80 text-sm placeholder:text-cream/30 outline-none"
          />
          <button
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: "rgba(212, 168, 71, 0.2)",
              color: "#d4a847",
            }}
          >
            ✦ send
          </button>
        </div>
      </div>
    </div>
  );
}

// Memory quadrant content
export function MemoryQuadrantContent() {
  return (
    <div className="h-full">
      <WelcomeMessage
        icon="☽"
        color="#9d7cd8"
        title="Celestial Memory"
        message="Your cosmic identity across time and space."
      />

      <div className="mt-6 space-y-4">
        {/* Profile section */}
        <div
          className="p-4 rounded-xl"
          style={{
            background: "rgba(157, 124, 216, 0.1)",
            border: "1px solid rgba(157, 124, 216, 0.2)",
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(157, 124, 216, 0.3), rgba(157, 124, 216, 0.1))",
                border: "1px solid rgba(157, 124, 216, 0.4)",
              }}
            >
              <span className="text-2xl">☽</span>
            </div>
            <div>
              <h3 className="text-cream font-serif">Celestial Wanderer</h3>
              <p className="text-cream/40 text-sm">joined the cosmos recently</p>
            </div>
          </div>
        </div>

        {/* Memory timeline */}
        <div className="space-y-3">
          <h4 className="text-cream/60 text-xs uppercase tracking-wider">Recent Memories</h4>
          <MemoryItem time="today" text="Explored the natal chart" />
          <MemoryItem time="yesterday" text="Connected with a fellow star" />
        </div>
      </div>
    </div>
  );
}

// Charts quadrant content
export function ChartsQuadrantContent() {
  return (
    <div className="h-full">
      <WelcomeMessage
        icon="♈"
        color="#4ecdc4"
        title="Astrological Wisdom"
        message="Your natal blueprint written in the stars."
      />

      <div className="mt-6 grid grid-cols-2 gap-4">
        {/* Natal chart placeholder */}
        <div
          className="col-span-2 aspect-square max-h-64 rounded-xl flex items-center justify-center"
          style={{
            background: "radial-gradient(circle, rgba(78, 205, 196, 0.1) 0%, transparent 70%)",
            border: "1px solid rgba(78, 205, 196, 0.2)",
          }}
        >
          <div className="text-center">
            <span className="text-4xl block mb-2" style={{ color: "#4ecdc4" }}>♈</span>
            <p className="text-cream/40 text-sm">natal chart visualization</p>
          </div>
        </div>

        {/* Planetary positions */}
        <PlanetaryCard planet="Sun" sign="Aries" color="#d4a847" />
        <PlanetaryCard planet="Moon" sign="Cancer" color="#9d7cd8" />
        <PlanetaryCard planet="Rising" sign="Leo" color="#c9a0a0" />
        <PlanetaryCard planet="Mercury" sign="Gemini" color="#4ecdc4" />
      </div>
    </div>
  );
}

// Social quadrant content
export function SocialQuadrantContent() {
  return (
    <div className="h-full">
      <WelcomeMessage
        icon="★"
        color="#c9a0a0"
        title="Cosmic Connections"
        message="Find souls whose stars align with yours."
      />

      <div className="mt-6 space-y-4">
        {/* Compatibility section */}
        <div
          className="p-4 rounded-xl text-center"
          style={{
            background: "rgba(201, 160, 160, 0.1)",
            border: "1px solid rgba(201, 160, 160, 0.2)",
          }}
        >
          <span className="text-3xl">💫</span>
          <h4 className="text-cream font-serif mt-2">Synastry Matching</h4>
          <p className="text-cream/40 text-sm mt-1">Discover celestial compatibility</p>
        </div>

        {/* Connection cards */}
        <div className="space-y-3">
          <h4 className="text-cream/60 text-xs uppercase tracking-wider">Cosmic Matches</h4>
          <ConnectionCard name="Stellar Soul" sign="Scorpio" compatibility={87} />
          <ConnectionCard name="Moon Child" sign="Pisces" compatibility={72} />
        </div>
      </div>
    </div>
  );
}

// Helper components
function WelcomeMessage({ icon, color, title, message }: {
  icon: string;
  color: string;
  title: string;
  message: string;
}) {
  return (
    <div className="text-center py-6">
      <span
        className="text-4xl block mb-3"
        style={{
          color,
          textShadow: `0 0 30px ${color}`,
        }}
      >
        {icon}
      </span>
      <h3
        className="font-serif text-xl tracking-wide mb-2"
        style={{ color }}
      >
        {title}
      </h3>
      <p className="text-cream/50 text-sm max-w-sm mx-auto">
        {message}
      </p>
    </div>
  );
}

function MessageBubble({ children, sender, color }: {
  children: ReactNode;
  sender: "user" | "archon";
  color: string;
}) {
  return (
    <div className={cn(
      "max-w-[80%] p-3 rounded-xl",
      sender === "user" ? "ml-auto" : "mr-auto"
    )}
      style={{
        background: sender === "archon" ? `rgba(${hexToRgb(color)}, 0.1)` : "rgba(255, 255, 255, 0.05)",
        border: `1px solid ${sender === "archon" ? `${color}40` : "rgba(255, 255, 255, 0.1)"}`,
      }}
    >
      <p className="text-cream/80 text-sm">{children}</p>
    </div>
  );
}

function MemoryItem({ time, text }: { time: string; text: string }) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg"
      style={{
        background: "rgba(157, 124, 216, 0.05)",
        border: "1px solid rgba(157, 124, 216, 0.1)",
      }}
    >
      <span className="text-cream/30 text-xs">{time}</span>
      <span className="text-cream/60 text-sm">{text}</span>
    </div>
  );
}

function PlanetaryCard({ planet, sign, color }: { planet: string; sign: string; color: string }) {
  return (
    <div
      className="p-3 rounded-xl text-center"
      style={{
        background: `rgba(${hexToRgb(color)}, 0.1)`,
        border: `1px solid ${color}30`,
      }}
    >
      <p className="text-cream/40 text-xs uppercase">{planet}</p>
      <p className="font-serif" style={{ color }}>{sign}</p>
    </div>
  );
}

function ConnectionCard({ name, sign, compatibility }: { name: string; sign: string; compatibility: number }) {
  return (
    <div
      className="flex items-center justify-between p-3 rounded-xl"
      style={{
        background: "rgba(201, 160, 160, 0.05)",
        border: "1px solid rgba(201, 160, 160, 0.1)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "rgba(201, 160, 160, 0.2)" }}
        >
          ★
        </div>
        <div>
          <p className="text-cream text-sm">{name}</p>
          <p className="text-cream/40 text-xs">{sign}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-rose-300 font-serif">{compatibility}%</p>
        <p className="text-cream/30 text-xs">match</p>
      </div>
    </div>
  );
}

// Utility function
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
  }
  return "255, 255, 255";
}

// Export the main overlay component for each quadrant
export function EnhancedChatOverlay() {
  const activeQuadrant = useSphereStore((s) => s.activeQuadrant);
  const overlayVisible = useSphereStore((s) => s.overlayVisible);
  const setOverlayVisible = useSphereStore((s) => s.setOverlayVisible);

  const isOpen = activeQuadrant === "chat" && overlayVisible;

  return (
    <SpaceWindow quadrant="chat" isOpen={isOpen} onClose={() => setOverlayVisible(false)}>
      <ChatQuadrantContent />
    </SpaceWindow>
  );
}

export function EnhancedMemoryOverlay() {
  const activeQuadrant = useSphereStore((s) => s.activeQuadrant);
  const overlayVisible = useSphereStore((s) => s.overlayVisible);
  const setOverlayVisible = useSphereStore((s) => s.setOverlayVisible);

  const isOpen = activeQuadrant === "memory" && overlayVisible;

  return (
    <SpaceWindow quadrant="memory" isOpen={isOpen} onClose={() => setOverlayVisible(false)}>
      <MemoryQuadrantContent />
    </SpaceWindow>
  );
}

export function EnhancedChartOverlay() {
  const activeQuadrant = useSphereStore((s) => s.activeQuadrant);
  const overlayVisible = useSphereStore((s) => s.overlayVisible);
  const setOverlayVisible = useSphereStore((s) => s.setOverlayVisible);

  const isOpen = activeQuadrant === "charts" && overlayVisible;

  return (
    <SpaceWindow quadrant="charts" isOpen={isOpen} onClose={() => setOverlayVisible(false)}>
      <ChartsQuadrantContent />
    </SpaceWindow>
  );
}

export function EnhancedSocialOverlay() {
  const activeQuadrant = useSphereStore((s) => s.activeQuadrant);
  const overlayVisible = useSphereStore((s) => s.overlayVisible);
  const setOverlayVisible = useSphereStore((s) => s.setOverlayVisible);

  const isOpen = activeQuadrant === "social" && overlayVisible;

  return (
    <SpaceWindow quadrant="social" isOpen={isOpen} onClose={() => setOverlayVisible(false)}>
      <SocialQuadrantContent />
    </SpaceWindow>
  );
}

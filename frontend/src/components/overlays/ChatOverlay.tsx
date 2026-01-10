"use client";

import { useEffect, useRef } from "react";
import { Html } from "@react-three/drei";
import { cn } from "@/lib/utils";
import { useSphereStore } from "@/stores/useSphereStore";
import { ChatContainer } from "@/components/chat/chat-container";

interface ChatOverlayProps {
  className?: string;
}

export function ChatOverlay({ className }: ChatOverlayProps) {
  const activeQuadrant = useSphereStore((s) => s.activeQuadrant);
  const overlayVisible = useSphereStore((s) => s.overlayVisible);
  const isTransitioning = useSphereStore((s) => s.isTransitioning);

  const isActive = activeQuadrant === "chat";
  const shouldShow = isActive && overlayVisible;

  return (
    <Html
      center
      fullscreen
      style={{
        pointerEvents: shouldShow ? "auto" : "none",
      }}
    >
      <div
        className={cn(
          "fixed inset-0 flex items-center justify-center",
          "transition-all duration-500 ease-out",
          shouldShow ? "opacity-100" : "opacity-0",
          isTransitioning && "scale-95",
          className
        )}
      >
        {/* Backdrop */}
        <div
          className={cn(
            "absolute inset-0 bg-background/60 backdrop-blur-sm",
            "transition-opacity duration-300",
            shouldShow ? "opacity-100" : "opacity-0"
          )}
        />

        {/* Chat container */}
        <div
          className={cn(
            "relative z-10 w-full max-w-lg h-[80vh] mx-4",
            "bg-card/80 backdrop-blur-md rounded-lg",
            "border border-gold/20",
            "shadow-2xl shadow-black/50",
            "flex flex-col overflow-hidden",
            "transform transition-transform duration-500",
            shouldShow ? "translate-y-0" : "translate-y-8"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
            <div className="flex items-center gap-2">
              <span className="text-gold text-lg">&#9737;</span>
              <span className="font-serif text-cream/80 text-sm">communication</span>
            </div>
            <button
              onClick={() => useSphereStore.getState().setOverlayVisible(false)}
              className="text-cream/40 hover:text-cream transition-colors"
            >
              <span className="text-lg">&#x2715;</span>
            </button>
          </div>

          {/* Chat content */}
          <div className="flex-1 overflow-hidden">
            <ChatContainer />
          </div>
        </div>
      </div>
    </Html>
  );
}

// Placeholder overlays for other quadrants
export function MemoryOverlay() {
  const activeQuadrant = useSphereStore((s) => s.activeQuadrant);
  const overlayVisible = useSphereStore((s) => s.overlayVisible);

  const isActive = activeQuadrant === "memory";
  const shouldShow = isActive && overlayVisible;

  return (
    <Html center fullscreen style={{ pointerEvents: shouldShow ? "auto" : "none" }}>
      <div
        className={cn(
          "fixed inset-0 flex items-center justify-center",
          "transition-all duration-500",
          shouldShow ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
        <div className="relative z-10 w-full max-w-lg h-[80vh] mx-4 bg-card/80 backdrop-blur-md rounded-lg border border-primary/20 flex flex-col items-center justify-center">
          <span className="text-primary text-4xl mb-4">&#9789;</span>
          <h2 className="font-serif text-cream text-xl mb-2">identity</h2>
          <p className="text-cream/60 text-sm">profile & message history</p>
          <p className="text-cream/40 text-xs mt-4 italic">coming soon</p>
        </div>
      </div>
    </Html>
  );
}

export function ChartOverlay() {
  const activeQuadrant = useSphereStore((s) => s.activeQuadrant);
  const overlayVisible = useSphereStore((s) => s.overlayVisible);

  const isActive = activeQuadrant === "charts";
  const shouldShow = isActive && overlayVisible;

  return (
    <Html center fullscreen style={{ pointerEvents: shouldShow ? "auto" : "none" }}>
      <div
        className={cn(
          "fixed inset-0 flex items-center justify-center",
          "transition-all duration-500",
          shouldShow ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
        <div className="relative z-10 w-full max-w-lg h-[80vh] mx-4 bg-card/80 backdrop-blur-md rounded-lg border border-water/20 flex flex-col items-center justify-center">
          <span className="text-water text-4xl mb-4">&#9800;</span>
          <h2 className="font-serif text-cream text-xl mb-2">astrology</h2>
          <p className="text-cream/60 text-sm">natal chart & houses</p>
          <p className="text-cream/40 text-xs mt-4 italic">coming soon</p>
        </div>
      </div>
    </Html>
  );
}

export function SocialOverlay() {
  const activeQuadrant = useSphereStore((s) => s.activeQuadrant);
  const overlayVisible = useSphereStore((s) => s.overlayVisible);

  const isActive = activeQuadrant === "social";
  const shouldShow = isActive && overlayVisible;

  return (
    <Html center fullscreen style={{ pointerEvents: shouldShow ? "auto" : "none" }}>
      <div
        className={cn(
          "fixed inset-0 flex items-center justify-center",
          "transition-all duration-500",
          shouldShow ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
        <div className="relative z-10 w-full max-w-lg h-[80vh] mx-4 bg-card/80 backdrop-blur-md rounded-lg border border-fire/20 flex flex-col items-center justify-center">
          <span className="text-fire text-4xl mb-4">&#9734;</span>
          <h2 className="font-serif text-cream text-xl mb-2">connection</h2>
          <p className="text-cream/60 text-sm">friends & synastry</p>
          <p className="text-cream/40 text-xs mt-4 italic">coming soon</p>
        </div>
      </div>
    </Html>
  );
}

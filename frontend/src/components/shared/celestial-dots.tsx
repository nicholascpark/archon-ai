"use client";

import { useEffect, useRef, useState } from "react";

interface Dot {
  id: number;
  x: number;
  y: number;
  duration: number;
  color: string;
  size: number;
  key: number;
}

interface ArchonStar {
  color: string;
  transitionDuration: number;
}

function randomSparkColor(): string {
  // Subtle, varied colors with low opacity to not interfere with text
  const colors = [
    // Warm golds (very subtle)
    "rgba(255, 215, 150, 0.25)",
    "rgba(255, 200, 120, 0.3)",
    "rgba(240, 190, 100, 0.2)",
    // Cool silvers/whites
    "rgba(220, 220, 240, 0.2)",
    "rgba(200, 210, 230, 0.25)",
    "rgba(230, 230, 250, 0.15)",
    // Soft lavenders
    "rgba(180, 160, 200, 0.2)",
    "rgba(200, 180, 220, 0.25)",
    "rgba(160, 140, 180, 0.2)",
    // Pale rose/pink
    "rgba(220, 180, 190, 0.2)",
    "rgba(200, 160, 170, 0.15)",
    // Soft blues
    "rgba(160, 190, 220, 0.2)",
    "rgba(140, 170, 200, 0.25)",
    "rgba(180, 200, 230, 0.15)",
    // Amber/copper hints
    "rgba(200, 150, 100, 0.2)",
    "rgba(180, 140, 90, 0.15)",
    // Pale green/teal (variety)
    "rgba(160, 200, 180, 0.15)",
    "rgba(140, 180, 170, 0.2)",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Archon's color palette - the eternal light at the center, bright and present
function archonColor(): string {
  const colors = [
    "rgba(255, 255, 255, 0.85)", // Bright white
    "rgba(255, 255, 255, 0.8)",
    "rgba(255, 250, 230, 0.8)", // Warm white gold
    "rgba(255, 245, 220, 0.75)", // Golden cream
    "rgba(255, 235, 200, 0.7)", // Soft gold
    "rgba(245, 245, 255, 0.75)", // Cool starlight
    "rgba(255, 248, 235, 0.8)", // Champagne glow
    "rgba(255, 253, 245, 0.85)", // Pure radiance
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

function edgeWeightedPosition(): number {
  // Centrifugal distribution - dots appear more at edges, leaving center clear for text
  // Uses a bimodal distribution weighted toward 0-30% and 70-100%
  const rand = Math.random();
  let position: number;

  if (rand < 0.45) {
    // Left/top edge (5-30%)
    position = 5 + Math.random() * 25;
  } else if (rand < 0.9) {
    // Right/bottom edge (70-95%)
    position = 70 + Math.random() * 25;
  } else {
    // Occasional middle appearance (30-70%) - rare
    position = 30 + Math.random() * 40;
  }

  // Add slight jitter
  const jitter = (Math.random() - 0.5) * 8;
  return Math.max(3, Math.min(97, position + jitter));
}

function durationByProximity(x: number, y: number): number {
  const distFromCenter = Math.sqrt(Math.pow(x - 50, 2) + Math.pow(y - 50, 2));
  const maxDist = 70;
  const proximity = 1 - Math.min(distFromCenter / maxDist, 1);
  return 8 + proximity * 20 + Math.random() * 7;
}

function randomSize(): number {
  // Smaller, more subtle dots (1-3px)
  return 1 + Math.random() * 2;
}

export function CelestialDots() {
  const [dots, setDots] = useState<Dot[]>([]);
  const [archon, setArchon] = useState<ArchonStar>({
    color: "rgba(255, 255, 255, 0.85)",
    transitionDuration: 8,
  });
  const timersRef = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const keyCounterRef = useRef(0);
  const idCounterRef = useRef(0);
  const [targetCount, setTargetCount] = useState(5);

  const minDots = 3;
  const maxDots = 12;

  const createDot = (): Dot => {
    const x = edgeWeightedPosition();
    const y = edgeWeightedPosition();
    return {
      id: idCounterRef.current++,
      x,
      y,
      duration: durationByProximity(x, y),
      color: randomSparkColor(),
      size: randomSize(),
      key: keyCounterRef.current++,
    };
  };

  useEffect(() => {
    const initial: Dot[] = [];
    for (let i = 0; i < 3; i++) {
      initial.push(createDot());
    }
    setDots(initial);

    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  // Archon's color changes slowly over time
  useEffect(() => {
    const archonColorTimer = setInterval(() => {
      setArchon({
        color: archonColor(),
        transitionDuration: 5 + Math.random() * 10, // 5-15 second transition
      });
    }, 15000 + Math.random() * 20000); // Change every 15-35 seconds

    return () => clearInterval(archonColorTimer);
  }, []);

  // Fluctuate target count
  useEffect(() => {
    const fluctuateTimer = setInterval(() => {
      setTargetCount((prev) => {
        const change = Math.floor(Math.random() * 5) - 2;
        return Math.max(minDots, Math.min(maxDots, prev + change));
      });
    }, 10000 + Math.random() * 8000);

    return () => clearInterval(fluctuateTimer);
  }, []);

  // Adjust toward target
  useEffect(() => {
    const currentCount = dots.length;

    if (currentCount < targetCount) {
      const addTimer = setTimeout(() => {
        setDots((prev) => [...prev, createDot()]);
      }, 2500 + Math.random() * 4000);
      return () => clearTimeout(addTimer);
    } else if (currentCount > targetCount && currentCount > minDots) {
      const removeTimer = setTimeout(() => {
        setDots((prev) => {
          if (prev.length <= minDots) return prev;
          const indexToRemove = Math.floor(Math.random() * prev.length);
          const newDots = [...prev];
          const removedDot = newDots[indexToRemove];
          if (timersRef.current.has(removedDot.key)) {
            clearTimeout(timersRef.current.get(removedDot.key));
            timersRef.current.delete(removedDot.key);
          }
          newDots.splice(indexToRemove, 1);
          return newDots;
        });
      }, 4000 + Math.random() * 5000);
      return () => clearTimeout(removeTimer);
    }
  }, [dots.length, targetCount]);

  // Respawn timers
  useEffect(() => {
    dots.forEach((dot) => {
      if (timersRef.current.has(dot.key)) return;

      const timer = setTimeout(() => {
        timersRef.current.delete(dot.key);

        setDots((prev) =>
          prev.map((d) => {
            if (d.id !== dot.id) return d;
            const x = edgeWeightedPosition();
            const y = edgeWeightedPosition();
            return {
              ...d,
              x,
              y,
              duration: durationByProximity(x, y),
              color: randomSparkColor(),
              size: randomSize(),
              key: keyCounterRef.current++,
            };
          })
        );
      }, dot.duration * 1000);

      timersRef.current.set(dot.key, timer);
    });
  }, [dots]);

  return (
    <div className="celestial-dots">
      {/* Archon - the eternal star at center */}
      <div
        className="archon-star"
        style={{
          "--archon-color": archon.color,
          "--archon-transition": `${archon.transitionDuration}s`,
        } as React.CSSProperties}
      />

      {/* Other celestial dots */}
      {dots.map((dot) => (
        <div
          key={dot.key}
          className="celestial-dot"
          style={{
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            "--appear-duration": `${dot.duration}s`,
            "--dot-color": dot.color,
            "--dot-size": `${dot.size}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

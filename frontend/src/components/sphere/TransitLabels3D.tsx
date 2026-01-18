"use client";

import { useMemo } from "react";
import { Html, Billboard } from "@react-three/drei";
import * as THREE from "three";
import { useSphereStore } from "@/stores/useSphereStore";
import { useAstrologyStore } from "@/stores/useAstrologyStore";
import { eclipticTo3D, getAspectAngle, getAspectType } from "@/lib/astronomy/coordinateTransform";
import { ASPECT_VISUALS, type AspectType, type PlanetPosition } from "@/types/astrology";

// Aspect symbols for display
const ASPECT_SYMBOLS: Record<AspectType, string> = {
  conjunction: "\u260C", // ☌
  opposition: "\u260D", // ☍
  trine: "\u25B3", // △
  square: "\u25A1", // □
  sextile: "\u26B9", // ⚹
};

// Aspect display names
const ASPECT_NAMES: Record<AspectType, string> = {
  conjunction: "conjunction",
  opposition: "opposition",
  trine: "trine",
  square: "square",
  sextile: "sextile",
};

interface TransitLabelData {
  id: string;
  position: THREE.Vector3;
  transitPlanet: string;
  natalPlanet: string;
  aspectType: AspectType;
  orb: number;
  applying: boolean;
  color: string;
}

/**
 * Individual floating 3D label for a transit aspect
 */
function TransitLabel3D({
  label,
  opacity,
}: {
  label: TransitLabelData;
  opacity: number;
}) {
  const aspectConfig = ASPECT_VISUALS[label.aspectType];

  return (
    <Billboard
      follow
      lockX={false}
      lockY={false}
      lockZ={false}
      position={label.position}
    >
      <Html
        center
        style={{
          pointerEvents: "none",
          opacity,
          transition: "opacity 0.5s ease-out",
          transform: "scale(0.9)",
        }}
        zIndexRange={[100, 0]}
      >
        <div
          className="rounded-xl px-3 py-2 backdrop-blur-md min-w-[140px]"
          style={{
            background: `linear-gradient(135deg, rgba(20, 20, 35, 0.92) 0%, rgba(10, 10, 20, 0.95) 100%)`,
            border: `1px solid ${aspectConfig.color}50`,
            boxShadow: `
              0 0 20px ${aspectConfig.color}20,
              0 4px 16px rgba(0, 0, 0, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.05)
            `,
          }}
        >
          {/* Aspect symbol and planets */}
          <div className="flex items-center gap-2">
            <span
              className="text-xl font-light"
              style={{
                color: aspectConfig.color,
                textShadow: `0 0 12px ${aspectConfig.color}80`,
                filter: `drop-shadow(0 0 4px ${aspectConfig.color}60)`,
              }}
            >
              {ASPECT_SYMBOLS[label.aspectType]}
            </span>

            <div className="flex flex-col">
              {/* Planet connection */}
              <div className="flex items-center gap-1.5 text-xs">
                <span
                  className="font-medium"
                  style={{ color: aspectConfig.color }}
                >
                  {label.transitPlanet}
                </span>
                <span className="text-cream/30">\u2192</span>
                <span className="text-cream/80">{label.natalPlanet}</span>
              </div>

              {/* Aspect name and orb */}
              <div className="flex items-center gap-2 text-[10px] text-cream/50 mt-0.5">
                <span>{ASPECT_NAMES[label.aspectType]}</span>
                <span className="text-cream/30">|</span>
                <span className="font-mono">{label.orb.toFixed(1)}\u00B0</span>
                <span
                  className={
                    label.applying ? "text-emerald-400" : "text-amber-400"
                  }
                >
                  {label.applying ? "\u2197" : "\u2198"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Html>
    </Billboard>
  );
}

/**
 * TransitLabels3D - Floating 3D labels for transit aspects
 *
 * Appears when zoomed out to transit view, showing aspect information
 * as floating cards positioned near the aspect lines.
 */
export function TransitLabels3D({ domeRadius = 6 }: { domeRadius?: number }) {
  const zoomLevel = useSphereStore((s) => s.zoomLevel);
  const isTransitView = useSphereStore((s) => s.isTransitView);
  const natalPlanets = useAstrologyStore((s) => s.natalPlanets);
  const transitPlanets = useAstrologyStore((s) => s.transitPlanets);
  const transitAspects = useAstrologyStore((s) => s.transitAspects);

  // Calculate label opacity based on zoom level
  // Start showing at zoomLevel 0.7, fully visible at 0.4
  const opacity = useMemo(() => {
    if (zoomLevel > 0.7) return 0;
    if (zoomLevel < 0.4) return 1;
    return (0.7 - zoomLevel) / 0.3;
  }, [zoomLevel]);

  // Generate label data from transit aspects or calculate from planets
  const labels = useMemo(() => {
    const labelData: TransitLabelData[] = [];

    // If we have transit aspects from the store, use those
    if (transitAspects && transitAspects.length > 0) {
      transitAspects.forEach((aspect, idx) => {
        // Find planet positions
        const transitPlanet = transitPlanets.find(
          (p) => p.name === aspect.planet1
        );
        const natalPlanet = natalPlanets.find((p) => p.name === aspect.planet2);

        if (transitPlanet && natalPlanet) {
          // Calculate midpoint position for label
          const pos1 = eclipticTo3D(
            transitPlanet.absoluteDegree,
            10,
            domeRadius
          );
          const pos2 = eclipticTo3D(natalPlanet.absoluteDegree, 15, domeRadius);

          const midpoint = new THREE.Vector3()
            .addVectors(pos1, pos2)
            .multiplyScalar(0.5);

          // Offset label upward from the aspect line
          midpoint.y += 1.2;

          labelData.push({
            id: `transit-${aspect.planet1}-${aspect.planet2}-${idx}`,
            position: midpoint,
            transitPlanet: aspect.planet1,
            natalPlanet: aspect.planet2,
            aspectType: aspect.type,
            orb: aspect.orb,
            applying: aspect.applying,
            color: ASPECT_VISUALS[aspect.type].color,
          });
        }
      });
    } else if (transitPlanets.length > 0 && natalPlanets.length > 0) {
      // Calculate aspects manually if no aspects in store
      transitPlanets.forEach((transitP) => {
        natalPlanets.forEach((natalP) => {
          const angle = getAspectAngle(
            transitP.absoluteDegree,
            natalP.absoluteDegree
          );
          const aspectType = getAspectType(angle, 8) as AspectType | null;

          if (aspectType) {
            const pos1 = eclipticTo3D(
              transitP.absoluteDegree,
              10,
              domeRadius
            );
            const pos2 = eclipticTo3D(natalP.absoluteDegree, 15, domeRadius);

            const midpoint = new THREE.Vector3()
              .addVectors(pos1, pos2)
              .multiplyScalar(0.5);
            midpoint.y += 1.2;

            // Calculate orb
            const exactAngle =
              aspectType === "conjunction"
                ? 0
                : aspectType === "sextile"
                ? 60
                : aspectType === "square"
                ? 90
                : aspectType === "trine"
                ? 120
                : 180;
            const orb = Math.abs(angle - exactAngle);

            // Determine if applying (simplified - would need proper speed data)
            const applying = transitP.speed ? transitP.speed > 0 : true;

            labelData.push({
              id: `calc-${transitP.name}-${natalP.name}`,
              position: midpoint,
              transitPlanet: transitP.name,
              natalPlanet: natalP.name,
              aspectType,
              orb,
              applying,
              color: ASPECT_VISUALS[aspectType].color,
            });
          }
        });
      });
    } else if (natalPlanets.length >= 2) {
      // Show natal-to-natal aspects if no transits
      for (let i = 0; i < Math.min(natalPlanets.length, 5); i++) {
        for (let j = i + 1; j < Math.min(natalPlanets.length, 5); j++) {
          const p1 = natalPlanets[i];
          const p2 = natalPlanets[j];

          const angle = getAspectAngle(p1.absoluteDegree, p2.absoluteDegree);
          const aspectType = getAspectType(angle, 8) as AspectType | null;

          if (aspectType) {
            const pos1 = eclipticTo3D(p1.absoluteDegree, 15, domeRadius);
            const pos2 = eclipticTo3D(p2.absoluteDegree, 15, domeRadius);

            const midpoint = new THREE.Vector3()
              .addVectors(pos1, pos2)
              .multiplyScalar(0.5);
            midpoint.y += 1.2;

            const exactAngle =
              aspectType === "conjunction"
                ? 0
                : aspectType === "sextile"
                ? 60
                : aspectType === "square"
                ? 90
                : aspectType === "trine"
                ? 120
                : 180;

            labelData.push({
              id: `natal-${p1.name}-${p2.name}`,
              position: midpoint,
              transitPlanet: p1.name,
              natalPlanet: p2.name,
              aspectType,
              orb: Math.abs(angle - exactAngle),
              applying: false,
              color: ASPECT_VISUALS[aspectType].color,
            });
          }
        }
      }
    }

    // Limit to top 6 labels to avoid clutter
    return labelData.slice(0, 6);
  }, [transitAspects, transitPlanets, natalPlanets, domeRadius]);

  // Don't render if opacity is 0 or no labels
  if (opacity === 0 || labels.length === 0) return null;

  return (
    <group>
      {labels.map((label) => (
        <TransitLabel3D key={label.id} label={label} opacity={opacity} />
      ))}
    </group>
  );
}

export default TransitLabels3D;

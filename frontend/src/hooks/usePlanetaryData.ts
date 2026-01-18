"use client";

import { useEffect, useCallback } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useAstrologyStore } from "@/stores/useAstrologyStore";
import api from "@/lib/api";
import type { NatalChartData, PlanetPosition } from "@/types/astrology";

// Transform backend chart data to frontend format
function transformChartData(backendChart: Record<string, unknown>): NatalChartData {
  const planets = backendChart.planets as Record<string, unknown>;

  // Transform planets to the expected format
  const transformedPlanets: Record<string, PlanetPosition> = {};

  for (const [name, data] of Object.entries(planets)) {
    const planetData = data as Record<string, unknown>;
    transformedPlanets[name] = {
      name: name.charAt(0).toUpperCase() + name.slice(1) as any,
      sign: planetData.sign as string as any,
      degree: planetData.position as number,
      absoluteDegree: calculateAbsoluteDegree(
        planetData.sign as string,
        planetData.position as number
      ),
      house: planetData.house as number,
      isRetrograde: planetData.retrograde as boolean,
    };
  }

  return {
    birthDate: backendChart.birth_date as string,
    birthTime: backendChart.birth_time as string,
    latitude: backendChart.latitude as number,
    longitude: backendChart.longitude as number,
    timezone: backendChart.timezone as string,
    planets: transformedPlanets,
    houses: backendChart.houses as any,
    aspects: backendChart.aspects as any,
    ascendant: 0, // Will be computed from houses
    midheaven: 0,
    computedAt: backendChart.computed_at as string,
  };
}

// Calculate absolute degree from sign and position
function calculateAbsoluteDegree(sign: string, position: number): number {
  const signOffsets: Record<string, number> = {
    Aries: 0, Taurus: 30, Gemini: 60, Cancer: 90,
    Leo: 120, Virgo: 150, Libra: 180, Scorpio: 210,
    Sagittarius: 240, Capricorn: 270, Aquarius: 300, Pisces: 330,
  };
  return (signOffsets[sign] || 0) + position;
}

export function usePlanetaryData() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const { setNatalChart, setLoading, setError, natalChart } = useAstrologyStore();

  // Fetch natal chart from backend
  const fetchNatalChart = useCallback(async () => {
    if (!token) return;

    setLoading("natal", true);

    try {
      // Try to get chart from user profile first
      if (user?.natal_chart_data) {
        const transformed = transformChartData(user.natal_chart_data as Record<string, unknown>);
        setNatalChart(transformed);
        return;
      }

      // Otherwise fetch from API
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/user/chart`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch chart");
      }

      const data = await response.json();

      if (data.chart) {
        const transformed = transformChartData(data.chart);
        setNatalChart(transformed);
      }
    } catch (error) {
      console.error("Failed to fetch natal chart:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch chart");
    } finally {
      setLoading("natal", false);
    }
  }, [token, user, setNatalChart, setLoading, setError]);

  // Fetch on mount if we have a token but no chart
  useEffect(() => {
    if (token && !natalChart) {
      fetchNatalChart();
    }
  }, [token, natalChart, fetchNatalChart]);

  return {
    fetchNatalChart,
    isLoading: useAstrologyStore((s) => s.isLoadingNatal),
    error: useAstrologyStore((s) => s.error),
    hasChart: !!natalChart,
  };
}

// Fetch current transit positions (real-time planetary locations)
export function useTransitData() {
  const { updateTransits, setLoading, setError } = useAstrologyStore();

  const fetchTransits = useCallback(async () => {
    setLoading("transits", true);

    try {
      // Try to fetch from backend API
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/astrology/transits`,
        { method: "GET" }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.transits) {
          updateTransits(data.transits);
          return;
        }
      }

      // Fall back to demo transit data
      loadDemoTransits();
    } catch (error) {
      console.warn("Failed to fetch transits, using demo data:", error);
      loadDemoTransits();
    } finally {
      setLoading("transits", false);
    }
  }, [updateTransits, setLoading, setError]);

  // Load demo transit data
  const loadDemoTransits = useCallback(() => {
    // Current approximate planetary positions (Jan 2026 - demo data)
    const demoTransits: PlanetPosition[] = [
      { name: "Sun", sign: "Capricorn", degree: 28.3, absoluteDegree: 298.3, house: 4, isRetrograde: false },
      { name: "Moon", sign: "Leo", degree: 15.7, absoluteDegree: 135.7, house: 11, isRetrograde: false },
      { name: "Mercury", sign: "Capricorn", degree: 12.1, absoluteDegree: 282.1, house: 4, isRetrograde: false },
      { name: "Venus", sign: "Pisces", degree: 8.5, absoluteDegree: 338.5, house: 6, isRetrograde: false },
      { name: "Mars", sign: "Cancer", degree: 22.4, absoluteDegree: 112.4, house: 10, isRetrograde: true },
      { name: "Jupiter", sign: "Gemini", degree: 14.2, absoluteDegree: 74.2, house: 9, isRetrograde: false },
      { name: "Saturn", sign: "Pisces", degree: 25.8, absoluteDegree: 355.8, house: 6, isRetrograde: false },
      { name: "Uranus", sign: "Taurus", degree: 27.1, absoluteDegree: 57.1, house: 8, isRetrograde: true },
      { name: "Neptune", sign: "Pisces", degree: 29.3, absoluteDegree: 359.3, house: 6, isRetrograde: false },
      { name: "Pluto", sign: "Aquarius", degree: 3.6, absoluteDegree: 303.6, house: 5, isRetrograde: false },
    ];

    updateTransits({
      date: new Date().toISOString(),
      transitPlanets: demoTransits,
      aspects: [],
      significantTransits: ["Mars Retrograde in Cancer", "Saturn-Neptune conjunction approaching"],
    });
  }, [updateTransits]);

  // Fetch transits on mount
  useEffect(() => {
    fetchTransits();

    // Refresh transits every 10 minutes
    const interval = setInterval(fetchTransits, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchTransits]);

  return { fetchTransits };
}

// Demo data for testing (when no backend data available)
export function useDemoPlanetaryData() {
  const { setNatalChart, updateTransits } = useAstrologyStore();

  useEffect(() => {
    // Demo natal chart data
    const demoChart: NatalChartData = {
      birthDate: "1990-06-15",
      birthTime: "14:30:00",
      latitude: 40.7128,
      longitude: -74.006,
      timezone: "America/New_York",
      planets: {
        sun: {
          name: "Sun",
          sign: "Gemini",
          degree: 24.5,
          absoluteDegree: 84.5,
          house: 10,
          isRetrograde: false,
        },
        moon: {
          name: "Moon",
          sign: "Scorpio",
          degree: 12.3,
          absoluteDegree: 222.3,
          house: 2,
          isRetrograde: false,
        },
        mercury: {
          name: "Mercury",
          sign: "Cancer",
          degree: 5.7,
          absoluteDegree: 95.7,
          house: 10,
          isRetrograde: false,
        },
        venus: {
          name: "Venus",
          sign: "Taurus",
          degree: 28.2,
          absoluteDegree: 58.2,
          house: 9,
          isRetrograde: false,
        },
        mars: {
          name: "Mars",
          sign: "Aries",
          degree: 15.8,
          absoluteDegree: 15.8,
          house: 7,
          isRetrograde: false,
        },
        jupiter: {
          name: "Jupiter",
          sign: "Cancer",
          degree: 3.1,
          absoluteDegree: 93.1,
          house: 10,
          isRetrograde: false,
        },
        saturn: {
          name: "Saturn",
          sign: "Capricorn",
          degree: 22.4,
          absoluteDegree: 292.4,
          house: 4,
          isRetrograde: true,
        },
        uranus: {
          name: "Uranus",
          sign: "Capricorn",
          degree: 8.9,
          absoluteDegree: 278.9,
          house: 4,
          isRetrograde: false,
        },
        neptune: {
          name: "Neptune",
          sign: "Capricorn",
          degree: 14.2,
          absoluteDegree: 284.2,
          house: 4,
          isRetrograde: false,
        },
        pluto: {
          name: "Pluto",
          sign: "Scorpio",
          degree: 16.5,
          absoluteDegree: 226.5,
          house: 2,
          isRetrograde: true,
        },
      },
      houses: {},
      aspects: [],
      ascendant: 0,
      midheaven: 270,
      computedAt: new Date().toISOString(),
    };

    setNatalChart(demoChart);

    // Also set demo transit data
    const demoTransits: PlanetPosition[] = [
      { name: "Sun", sign: "Capricorn", degree: 28.3, absoluteDegree: 298.3, house: 4, isRetrograde: false },
      { name: "Moon", sign: "Leo", degree: 15.7, absoluteDegree: 135.7, house: 11, isRetrograde: false },
      { name: "Mercury", sign: "Capricorn", degree: 12.1, absoluteDegree: 282.1, house: 4, isRetrograde: false },
      { name: "Venus", sign: "Pisces", degree: 8.5, absoluteDegree: 338.5, house: 6, isRetrograde: false },
      { name: "Mars", sign: "Cancer", degree: 22.4, absoluteDegree: 112.4, house: 10, isRetrograde: true },
      { name: "Jupiter", sign: "Gemini", degree: 14.2, absoluteDegree: 74.2, house: 9, isRetrograde: false },
      { name: "Saturn", sign: "Pisces", degree: 25.8, absoluteDegree: 355.8, house: 6, isRetrograde: false },
      { name: "Uranus", sign: "Taurus", degree: 27.1, absoluteDegree: 57.1, house: 8, isRetrograde: true },
      { name: "Neptune", sign: "Pisces", degree: 29.3, absoluteDegree: 359.3, house: 6, isRetrograde: false },
      { name: "Pluto", sign: "Aquarius", degree: 3.6, absoluteDegree: 303.6, house: 5, isRetrograde: false },
    ];

    updateTransits({
      date: new Date().toISOString(),
      transitPlanets: demoTransits,
      aspects: [],
      significantTransits: ["Mars Retrograde in Cancer", "Saturn-Neptune conjunction"],
    });
  }, [setNatalChart, updateTransits]);
}

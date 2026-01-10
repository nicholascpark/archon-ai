"use client";

import { create } from "zustand";
import type {
  AstrologyStore,
  NatalChartData,
  TransitData,
  MoonPhase,
  RetrogradeInfo,
  PlanetPosition,
} from "@/types/astrology";

// Initial state
const initialState = {
  natalChart: null as NatalChartData | null,
  natalPlanets: [] as PlanetPosition[],
  transitPlanets: [] as PlanetPosition[],
  transitAspects: [],
  significantTransits: [] as string[],
  currentMoonPhase: null as MoonPhase | null,
  retrogradePlanets: [] as RetrogradeInfo[],
  isLoadingNatal: false,
  isLoadingTransits: false,
  lastUpdate: null as Date | null,
  error: null as string | null,
};

export const useAstrologyStore = create<AstrologyStore>((set) => ({
  ...initialState,

  setNatalChart: (chart: NatalChartData) => {
    // Extract planets array from chart object
    const planets = Object.entries(chart.planets).map(([planetName, data]) => ({
      ...data,
      name: planetName.charAt(0).toUpperCase() + planetName.slice(1),
    })) as PlanetPosition[];

    set({
      natalChart: chart,
      natalPlanets: planets,
      isLoadingNatal: false,
      lastUpdate: new Date(),
    });
  },

  updateTransits: (transits: TransitData) => {
    set({
      transitPlanets: transits.transitPlanets,
      transitAspects: transits.aspects,
      significantTransits: transits.significantTransits,
      isLoadingTransits: false,
      lastUpdate: new Date(),
    });
  },

  setMoonPhase: (phase: MoonPhase) => {
    set({ currentMoonPhase: phase });
  },

  setRetrogrades: (retrogrades: RetrogradeInfo[]) => {
    set({ retrogradePlanets: retrogrades });
  },

  setLoading: (key: "natal" | "transits", loading: boolean) => {
    if (key === "natal") {
      set({ isLoadingNatal: loading });
    } else {
      set({ isLoadingTransits: loading });
    }
  },

  setError: (error: string | null) => {
    set({ error });
  },

  reset: () => {
    set(initialState);
  },
}));

// Selector hooks
export const useNatalPlanets = () =>
  useAstrologyStore((state) => state.natalPlanets);

export const useTransitPlanets = () =>
  useAstrologyStore((state) => state.transitPlanets);

export const useMoonPhase = () =>
  useAstrologyStore((state) => state.currentMoonPhase);

export const useRetrogrades = () =>
  useAstrologyStore((state) => state.retrogradePlanets);

export const useNatalChart = () =>
  useAstrologyStore((state) => state.natalChart);

export const useIsLoadingAstrology = () =>
  useAstrologyStore((state) => state.isLoadingNatal || state.isLoadingTransits);

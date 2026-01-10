/**
 * Type definitions for astrology data and planetary visualization
 */

// Zodiac signs
export type ZodiacSign =
  | "Aries"
  | "Taurus"
  | "Gemini"
  | "Cancer"
  | "Leo"
  | "Virgo"
  | "Libra"
  | "Scorpio"
  | "Sagittarius"
  | "Capricorn"
  | "Aquarius"
  | "Pisces";

// Planet names
export type PlanetName =
  | "Sun"
  | "Moon"
  | "Mercury"
  | "Venus"
  | "Mars"
  | "Jupiter"
  | "Saturn"
  | "Uranus"
  | "Neptune"
  | "Pluto";

// Aspect types
export type AspectType =
  | "conjunction"
  | "opposition"
  | "trine"
  | "square"
  | "sextile";

// Moon phases
export type MoonPhaseName =
  | "New Moon"
  | "Waxing Crescent"
  | "First Quarter"
  | "Waxing Gibbous"
  | "Full Moon"
  | "Waning Gibbous"
  | "Last Quarter"
  | "Waning Crescent";

// Individual planet position
export interface PlanetPosition {
  name: PlanetName;
  sign: ZodiacSign;
  degree: number; // 0-30 within sign
  absoluteDegree: number; // 0-360 on ecliptic
  house: number; // 1-12
  isRetrograde: boolean;
  speed?: number; // degrees per day
}

// Aspect between two planets
export interface AspectData {
  planet1: PlanetName;
  planet2: PlanetName;
  type: AspectType;
  orb: number; // degrees
  applying: boolean; // getting closer or separating
  isTransit?: boolean; // transit aspect vs natal
}

// House data
export interface HouseData {
  house: number; // 1-12
  sign: ZodiacSign;
  degree: number; // cusp position
}

// Moon phase info
export interface MoonPhase {
  name: MoonPhaseName;
  sign: ZodiacSign;
  degree: number;
  illumination: number; // 0-100%
  angle: number; // 0-360
}

// Complete natal chart data (from backend)
export interface NatalChartData {
  birthDate: string;
  birthTime: string;
  latitude: number;
  longitude: number;
  timezone: string;
  planets: Record<string, PlanetPosition>;
  houses: Record<string, HouseData>;
  aspects: AspectData[];
  ascendant: number;
  midheaven: number;
  computedAt: string;
}

// Transit data
export interface TransitData {
  date: string;
  transitPlanets: PlanetPosition[];
  aspects: AspectData[];
  significantTransits: string[];
}

// Retrograde planet info
export interface RetrogradeInfo {
  planet: PlanetName;
  sign: ZodiacSign;
  meaning: string;
}

// Planet visual configuration for 3D rendering
export interface PlanetVisualConfig {
  name: PlanetName;
  color: string;
  emissive: string;
  size: number; // relative size
  symbol: string; // Unicode symbol
  glowIntensity: number;
}

// All planet visual configs
export const PLANET_VISUALS: Record<PlanetName, PlanetVisualConfig> = {
  Sun: {
    name: "Sun",
    color: "#ffd700",
    emissive: "#ff8c00",
    size: 1.2,
    symbol: "\u2609",
    glowIntensity: 1.5,
  },
  Moon: {
    name: "Moon",
    color: "#c0c0c0",
    emissive: "#a0a0a0",
    size: 0.9,
    symbol: "\u263D",
    glowIntensity: 0.8,
  },
  Mercury: {
    name: "Mercury",
    color: "#b0b0b0",
    emissive: "#808080",
    size: 0.5,
    symbol: "\u263F",
    glowIntensity: 0.6,
  },
  Venus: {
    name: "Venus",
    color: "#ffc0cb",
    emissive: "#ff69b4",
    size: 0.7,
    symbol: "\u2640",
    glowIntensity: 0.9,
  },
  Mars: {
    name: "Mars",
    color: "#ff4500",
    emissive: "#8b0000",
    size: 0.6,
    symbol: "\u2642",
    glowIntensity: 0.8,
  },
  Jupiter: {
    name: "Jupiter",
    color: "#daa520",
    emissive: "#b8860b",
    size: 1.0,
    symbol: "\u2643",
    glowIntensity: 1.0,
  },
  Saturn: {
    name: "Saturn",
    color: "#f4a460",
    emissive: "#8b4513",
    size: 0.9,
    symbol: "\u2644",
    glowIntensity: 0.7,
  },
  Uranus: {
    name: "Uranus",
    color: "#40e0d0",
    emissive: "#008b8b",
    size: 0.8,
    symbol: "\u2645",
    glowIntensity: 0.8,
  },
  Neptune: {
    name: "Neptune",
    color: "#4169e1",
    emissive: "#00008b",
    size: 0.8,
    symbol: "\u2646",
    glowIntensity: 0.9,
  },
  Pluto: {
    name: "Pluto",
    color: "#800080",
    emissive: "#4b0082",
    size: 0.4,
    symbol: "\u2647",
    glowIntensity: 0.6,
  },
};

// Zodiac sign visual configs
export interface ZodiacVisualConfig {
  sign: ZodiacSign;
  symbol: string;
  element: "fire" | "earth" | "air" | "water";
  color: string;
  startDegree: number; // 0-360
}

export const ZODIAC_VISUALS: Record<ZodiacSign, ZodiacVisualConfig> = {
  Aries: { sign: "Aries", symbol: "\u2648", element: "fire", color: "#ff4500", startDegree: 0 },
  Taurus: { sign: "Taurus", symbol: "\u2649", element: "earth", color: "#228b22", startDegree: 30 },
  Gemini: { sign: "Gemini", symbol: "\u264A", element: "air", color: "#ffd700", startDegree: 60 },
  Cancer: { sign: "Cancer", symbol: "\u264B", element: "water", color: "#c0c0c0", startDegree: 90 },
  Leo: { sign: "Leo", symbol: "\u264C", element: "fire", color: "#ffa500", startDegree: 120 },
  Virgo: { sign: "Virgo", symbol: "\u264D", element: "earth", color: "#8b4513", startDegree: 150 },
  Libra: { sign: "Libra", symbol: "\u264E", element: "air", color: "#ffc0cb", startDegree: 180 },
  Scorpio: { sign: "Scorpio", symbol: "\u264F", element: "water", color: "#8b0000", startDegree: 210 },
  Sagittarius: { sign: "Sagittarius", symbol: "\u2650", element: "fire", color: "#800080", startDegree: 240 },
  Capricorn: { sign: "Capricorn", symbol: "\u2651", element: "earth", color: "#2f4f4f", startDegree: 270 },
  Aquarius: { sign: "Aquarius", symbol: "\u2652", element: "air", color: "#4169e1", startDegree: 300 },
  Pisces: { sign: "Pisces", symbol: "\u2653", element: "water", color: "#40e0d0", startDegree: 330 },
};

// Aspect visual configs
export const ASPECT_VISUALS: Record<AspectType, { color: string; opacity: number; dashArray?: number[] }> = {
  conjunction: { color: "#ffd700", opacity: 0.8 },
  opposition: { color: "#ff4500", opacity: 0.6, dashArray: [0.1, 0.05] },
  trine: { color: "#00ff00", opacity: 0.5 },
  square: { color: "#ff0000", opacity: 0.5, dashArray: [0.05, 0.05] },
  sextile: { color: "#87ceeb", opacity: 0.4 },
};

// Astrology store state
export interface AstrologyState {
  // Natal chart data
  natalChart: NatalChartData | null;
  natalPlanets: PlanetPosition[];

  // Transit data
  transitPlanets: PlanetPosition[];
  transitAspects: AspectData[];
  significantTransits: string[];

  // Current sky
  currentMoonPhase: MoonPhase | null;
  retrogradePlanets: RetrogradeInfo[];

  // Loading states
  isLoadingNatal: boolean;
  isLoadingTransits: boolean;
  lastUpdate: Date | null;

  // Error
  error: string | null;
}

// Astrology store actions
export interface AstrologyActions {
  setNatalChart: (chart: NatalChartData) => void;
  updateTransits: (transits: TransitData) => void;
  setMoonPhase: (phase: MoonPhase) => void;
  setRetrogrades: (retrogrades: RetrogradeInfo[]) => void;
  setLoading: (key: "natal" | "transits", loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

// Combined store
export type AstrologyStore = AstrologyState & AstrologyActions;

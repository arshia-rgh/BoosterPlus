// See README.motion.md before adding a scene. Decorative selection never enables
// an unpublished game or bypasses the backend catalog.
export interface MotionScene {
  id: string;
  game: string;
  cycle: number;
  sway: number;
  secondary: {
    field: string;
    bounds: readonly [number, number, number, number];
    positive: number;
    negative: number;
  };
}

export const scenes = [
  {
    id: "miya",
    game: "Mobile Legends",
    cycle: 6.4,
    sway: 48,
    secondary: {
      field: "/characters/miya-hair-field.svg",
      bounds: [505, 180, 290, 380],
      positive: 52,
      negative: -38,
    },
  },
  {
    id: "illidan",
    game: "World of Warcraft",
    cycle: 7.2,
    sway: 48,
    secondary: {
      field: "/characters/illidan-wing-field.svg",
      bounds: [-32, -16, 1088, 1180],
      positive: 48,
      negative: -36,
    },
  },
  {
    id: "ahri",
    game: "League of Legends",
    cycle: 6.8,
    sway: 48,
    secondary: {
      field: "/characters/ahri-tail-field.svg",
      bounds: [-32, -16, 1088, 1240],
      positive: 50,
      negative: -38,
    },
  },
] as const satisfies readonly MotionScene[];

export type SceneKey = (typeof scenes)[number]["id"];
export const sceneByKey = (key: SceneKey) =>
  scenes.find((scene) => scene.id === key) ?? scenes[0];

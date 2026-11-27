// Types du fichier repris tel quel sceneUniforms.js (seulement ce que lib/asteroides/scene.ts utilise) :
// sans eux, TypeScript devine mal les paramètres (une valeur par défaut « null » devient le type null).
import type { Camera, Color, Texture, Vector2, Vector3 } from "three";

export const fogUniforms: {
  tNoise: { value: Texture | null };
  uGlowPos: { value: Vector3 };
  uGlowColor: { value: Color };
  [nom: string]: { value: unknown };
};

export class CursorTracker {
  constructor(element?: Window | HTMLElement);
  ndc: Vector2;
  fast: Vector2;
  update(dt: number): void;
}

export function updateSceneUniforms(options: {
  time: number;
  camera: Camera;
  cursor?: CursorTracker | null;
  height: number;
  pixelRatio?: number;
  focus?: number | null;
  bokeh?: number | null;
}): void;

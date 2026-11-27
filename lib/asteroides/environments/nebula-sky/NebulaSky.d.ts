// Types du fichier repris tel quel NebulaSky.js (voir sceneUniforms.d.ts).
import type { Camera, Group } from "three";

export class NebulaSky {
  constructor(options?: { stars?: number; seed?: number; [reglage: string]: unknown });
  group: Group;
  settings: Record<string, unknown>;
  update(camera: Camera): void;
  dispose(): void;
}

export const SKY_PRESETS: Record<string, Record<string, string | number>>;
export function applySkyPreset(sky: NebulaSky, preset: Record<string, string | number>): void;

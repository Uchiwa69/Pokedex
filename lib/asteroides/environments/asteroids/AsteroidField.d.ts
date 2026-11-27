// Types du fichier repris tel quel AsteroidField.js (voir sceneUniforms.d.ts).
import type { Group, Material, Vector3 } from "three";

export class AsteroidField {
  constructor(options: {
    count?: number;
    seed?: number;
    bounds?: Vector3;
    placer?: ((position: Vector3, random: () => number) => void) | null;
    sizeMin?: number;
    sizeMax?: number;
    material: Material;
    variants?: number;
    detail?: number;
    spin?: number;
    push?: number;
    rock?: Record<string, unknown>;
    orbit?: { center: [number, number, number]; speed: number } | null;
  });
  group: Group;
  uniforms: Record<string, { value: unknown }>;
  dispose(): void;
}

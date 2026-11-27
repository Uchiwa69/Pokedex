import { Color, MeshStandardMaterial } from 'three';
import { inject, patchMaterial } from '../../core/scene-kit/patchMaterial.js';

/** Le code ajouté au fragment shader : variation de teinte, cavités, fissures, relief, liseré. */
export const stoneFragmentPatch = (src) => {
	src = inject(src, '#include <common>', /* glsl */ `
		varying vec3 vObjPos;
		uniform float uBump, uBumpFreq, uBump2, uBumpFreq2, uVar, uVarFreq, uCracks, uCrackFreq, uCavityAmt, uRimPow;
		uniform vec3 uCavity, uRim;
		float crackMask(vec3 p){
			float n = snoise(p * uCrackFreq) + 0.5 * snoise(p * uCrackFreq * 2.3 + 4.1);
			return (1.0 - smoothstep(0.0, 0.05, abs(n))) * smoothstep(-0.2, 0.4, snoise(p * 0.7 + 9.0));
		}`);
	src = inject(src, '#include <color_fragment>', /* glsl */ `
		float nv = fbm3(vObjPos * uVarFreq);
		float cav = smoothstep(0.1, -0.5, snoise(vObjPos * uBumpFreq * 0.9 + 2.0));
		diffuseColor.rgb *= mix(1.0 - uVar, 1.0 + uVar, nv * 0.5 + 0.5);
		diffuseColor.rgb = mix(diffuseColor.rgb, uCavity, cav * uCavityAmt);
		float cracks = uCracks > 0.0 ? crackMask(vObjPos) * uCracks : 0.0;
		diffuseColor.rgb *= 1.0 - cracks * 0.85;`);
	src = inject(src, '#include <normal_fragment_maps>', /* glsl */ `
		// (le relief vient de la pente du bruit lui-même : lisse quelle que soit la distance de l'objectif)
		float nLev = noiseLevel(vObjPos);
		vec3 hgtG = fbm3dL(vObjPos * uBumpFreq, nLev, uBumpFreq).yzw * (uBump * uBumpFreq) + snoisedL(vObjPos * (uBumpFreq2 * 1.6), grainLevel(nLev, uBumpFreq2 * 1.6)).yzw * (uBump2 * uBumpFreq2 * 1.6);
		normal = perturbNormalG(-vViewPosition, normal, vObjPos, hgtG, -cracks * 0.02);`);
	return inject(src, '#include <emissivemap_fragment>', /* glsl */ `
		float rimF = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), uRimPow);
		totalEmissiveRadiance += uRim * rimF;`);
};

/**
 * Matériau pierre, entièrement procédural (aucune texture) : MeshStandardMaterial de three, auquel on greffe une
 * variation de teinte, des cavités sombres, des fissures, un relief en deux échelles (bosses et grain) et un liseré
 * lumineux sur les bords. Le motif est attaché à l'objet (il ne glisse pas quand la roche tourne).
 *
 *   const basalt = createStoneMaterial({ color: '#3b3b40', bump: 0.07, cracks: 0.8, cavity: '#070708', cavityAmt: 0.55 });
 *
 * Demande le volume de bruit (`fogUniforms.tNoise.value = bakeNoiseVolume(renderer)`).
 * Options : color, roughness (0.9), metalness (0), env (envMapIntensity), flat (flatShading), emissive,
 * emissiveIntensity, bump (0.03), bumpFreq (2.5), bump2 (0.008), bumpFreq2 (16), variation (0.3), varFreq (0.8),
 * cracks (0), crackFreq (1.2), cavity (couleur des creux), cavityAmt (0), rim (couleur du liseré), rimPow (3), key.
 */
export function createStoneMaterial(options = {}) {
	const material = new MeshStandardMaterial({
		color: options.color ?? '#2a2a2c',
		roughness: options.roughness ?? 0.9,
		metalness: options.metalness ?? 0,
		envMapIntensity: options.env ?? 1,
		flatShading: options.flat ?? false,
	});
	if (options.emissive) {
		material.emissive.set(options.emissive);
		material.emissiveIntensity = options.emissiveIntensity ?? 1;
	}
	const uniforms = {
		uBump: { value: options.bump ?? 0.03 },
		uBumpFreq: { value: options.bumpFreq ?? 2.5 },
		uBump2: { value: options.bump2 ?? 0.008 },
		uBumpFreq2: { value: options.bumpFreq2 ?? 16 },
		uVar: { value: options.variation ?? 0.3 },
		uVarFreq: { value: options.varFreq ?? 0.8 },
		uCracks: { value: options.cracks ?? 0 },
		uCrackFreq: { value: options.crackFreq ?? 1.2 },
		uCavity: { value: new Color(options.cavity ?? '#000000') },
		uCavityAmt: { value: options.cavityAmt ?? 0 },
		uRim: { value: new Color(options.rim ?? '#000000') },
		uRimPow: { value: options.rimPow ?? 3 },
	};
	patchMaterial(material, {
		uniforms,
		key: `stone-${options.key ?? 'default'}`,
		vertex: (src) => {
			src = inject(src, '#include <common>', 'varying vec3 vObjPos;');
			return inject(src, '#include <begin_vertex>', `
				vObjPos = position;
				#ifdef USE_INSTANCING
					vObjPos += instanceMatrix[3].xyz * 0.37; // chaque exemplaire a son propre motif
				#endif`);
		},
		fragment: stoneFragmentPatch,
	});
	material.userData.fragmentPatch = stoneFragmentPatch;
	return material;
}

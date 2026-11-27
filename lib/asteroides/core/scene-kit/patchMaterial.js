import { Material, ShaderChunk } from 'three';
import { NOISE_GLSL } from './noiseVolume.js';
import { CURSOR_GLSL, FOG_GLSL, fogUniforms, PERTURB_NORMAL_GLSL, SCENE_UNIFORMS_GLSL, sceneUniforms } from './sceneUniforms.js';

/** Insère `code` juste après (ou avant) la ligne `anchor` d'un shader. */
export const inject = (source, anchor, code, after = true) => source.replace(anchor, after ? `${anchor}\n${code}` : `${code}\n${anchor}`);

let patchCount = 0;

/**
 * Greffe du code sur un matériau standard de three (MeshStandardMaterial, MeshLambertMaterial…) sans le réécrire :
 * on garde son éclairage, ses ombres, son brouillard, et on ajoute ce qu'on veut aux bons endroits.
 * Le matériau reçoit les uniforms partagés (temps, rayon du curseur, brouillard, bruit) et les fonctions GLSL de
 * `scene-kit` (`snoise`, `fbm3`, `cursorAway`, `perturbNormalG`…).
 *
 *   patchMaterial(new MeshStandardMaterial(), {
 *     uniforms: { uAmount: { value: 1 } },
 *     vertex: (src) => inject(src, '#include <begin_vertex>', 'transformed.y += snoise(position) * 0.1;'),
 *     fragment: (src) => src,
 *     key: 'mon-materiau',          // même clé = même programme compilé (à changer si le code greffé change)
 *   });
 */
export function patchMaterial(material, { uniforms = {}, vertex = null, fragment = null, key = null } = {}) {
	const cacheKey = key || `patch-${patchCount++}`;
	material.userData.uniforms = uniforms;
	material.onBeforeCompile = (shader) => {
		Object.assign(shader.uniforms, fogUniforms, sceneUniforms, uniforms);
		if (vertex) shader.vertexShader = vertex(shader.vertexShader);
		if (fragment) shader.fragmentShader = fragment(shader.fragmentShader);
		const shared = `${SCENE_UNIFORMS_GLSL}\n${NOISE_GLSL}\n${CURSOR_GLSL}\n`;
		shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${shared}`);
		shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\n${shared}\n${PERTURB_NORMAL_GLSL}`);
	};
	material.customProgramCacheKey = () => cacheKey;
	return material;
}

let fogInstalled = false;

/**
 * Remplace le brouillard de three par le brouillard de hauteur de `scene-kit` (plus dense en bas, densité qui
 * dérive, deux lueurs qui s'y diffusent), pour **tous** les matériaux standard de la page qui ont `fog: true` et
 * dont la scène a un `scene.fog` (n'importe lequel : ses réglages sont ignorés, ce sont ceux de `fogUniforms` qui
 * comptent). À appeler une fois, avant de créer les matériaux.
 *
 *   installHeightFog();
 *   scene.fog = new FogExp2(0, 0.01);       // sert seulement d'interrupteur
 *   fogUniforms.uFogDensity.value = 0.02;   // les vrais réglages
 *
 * C'est une modification globale des morceaux de shader de three : à n'utiliser que si toute la page en profite.
 */
export function installHeightFog() {
	if (fogInstalled) return;
	fogInstalled = true;
	ShaderChunk.fog_pars_vertex = '#ifdef USE_FOG\n  varying vec3 vFogWorldPos;\n#endif\n';
	ShaderChunk.fog_vertex = '#ifdef USE_FOG\n  vFogWorldPos = transpose(mat3(viewMatrix)) * (mvPosition.xyz - viewMatrix[3].xyz);\n#endif\n';
	ShaderChunk.fog_pars_fragment = `#ifdef USE_FOG\n  varying vec3 vFogWorldPos;\n  ${FOG_GLSL}\n#endif\n`;
	ShaderChunk.fog_fragment = '#ifdef USE_FOG\n  gl_FragColor.rgb = applyFog(gl_FragColor.rgb, vFogWorldPos);\n#endif\n';
	// les matériaux non greffés reçoivent eux aussi les réglages du brouillard (un matériau qui a son propre
	// onBeforeCompile doit appeler withFogUniforms lui-même)
	Material.prototype.onBeforeCompile = withFogUniforms;
}

/**
 * À donner à `material.onBeforeCompile` (ou à appeler dedans) pour qu'un matériau standard non greffé reçoive
 * quand même les uniforms du brouillard de hauteur.
 */
export function withFogUniforms(shader) {
	Object.assign(shader.uniforms, fogUniforms);
}

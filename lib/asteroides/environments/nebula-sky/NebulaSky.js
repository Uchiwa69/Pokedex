import { AdditiveBlending, BackSide, BufferGeometry, Color, Float32BufferAttribute, Group, Mesh, Points, ShaderMaterial, SphereGeometry } from 'three';
import { mulberry, NOISE_GLSL } from '../../core/scene-kit/noiseVolume.js';
import { FOG_GLSL, fogUniforms, SCENE_UNIFORMS_GLSL, sceneUniforms } from '../../core/scene-kit/sceneUniforms.js';

/** Les réglages du ciel, avec leurs valeurs par défaut (une nuit froide). */
export const createSkySettings = () => ({
	skyTop: new Color('#010204'), // couleur au zénith
	skyHorizon: new Color('#081116'), // à l'horizon
	skyBottom: new Color('#04080a'), // sous l'horizon
	horizonY: -0.12, // hauteur de l'horizon (-1..1)
	skyK: 3, // netteté du dégradé autour de l'horizon
	nebA: new Color('#10323d'), // les deux couleurs de la nébuleuse
	nebB: new Color('#3c0b0e'),
	nebAmt: 0.6, // intensité de la nébuleuse (0 = ciel uni)
	skyFog: 0.02, // le brouillard mange l'horizon
	stars: 1, // intensité des étoiles (0 = aucune)
});

/**
 * Ciel de nuit profonde : un dôme qui suit la caméra, en dégradé autour de l'horizon, traversé d'une nébuleuse
 * (deux couleurs, des filaments et des zones sombres, obtenus en déformant un bruit par un autre bruit), et 5 200
 * étoiles qui scintillent, quelques-unes plus grosses. Le curseur creuse légèrement la nébuleuse là où il pointe,
 * et les lueurs du brouillard (`fogUniforms.uGlowPos`, `uGlowColor`) s'y diffusent : une source lumineuse de la
 * scène allume le ciel autour d'elle.
 *
 *   const sky = new NebulaSky();
 *   scene.add(sky.group);
 *   sky.update(camera);                    // à chaque frame (le dôme suit la caméra)
 *   sky.settings.nebAmt = 0.8;
 *
 * Demande le volume de bruit (`fogUniforms.tNoise.value = bakeNoiseVolume(renderer)`) et les uniforms partagés.
 */
export class NebulaSky {
	/** Options : stars (nombre d'étoiles, 5200), seed, et toute valeur de createSkySettings(). */
	constructor({ stars = 5200, seed = 7, ...settings } = {}) {
		this.settings = Object.assign(createSkySettings(), settings);
		this.uniforms = {
			uSkyTop: { value: new Color() },
			uSkyHorizon: { value: new Color() },
			uSkyBottom: { value: new Color() },
			uNebA: { value: new Color() },
			uNebB: { value: new Color() },
			uNebAmt: { value: 0.5 },
			uSkyFog: { value: 0.3 },
			uHorizonY: { value: 0 },
			uSkyK: { value: 3 },
			...fogUniforms,
			...sceneUniforms,
		};
		const dome = new Mesh(new SphereGeometry(10, 48, 24), new ShaderMaterial({
			uniforms: this.uniforms,
			side: BackSide,
			depthWrite: false,
			vertexShader: /* glsl */ `
				varying vec3 vDir;
				void main(){
					vDir = position;
					vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
					gl_Position = p.xyww; // toujours au plus loin : rien ne passe derrière le ciel
				}`,
			fragmentShader: /* glsl */ `
				varying vec3 vDir;
				uniform vec3 uSkyTop, uSkyHorizon, uSkyBottom, uNebA, uNebB;
				uniform float uNebAmt, uSkyFog, uHorizonY, uSkyK;
				${SCENE_UNIFORMS_GLSL}
				${NOISE_GLSL}
				${FOG_GLSL}
				void main(){
					vec3 d = normalize(vDir);
					float y = d.y - uHorizonY;
					vec3 col = y > 0.0
						? mix(uSkyHorizon, uSkyTop, 1.0 - exp(-y * uSkyK))
						: mix(uSkyHorizon, uSkyBottom, 1.0 - exp(y * uSkyK * 1.6));
					if (uNebAmt > 0.001) {
						vec3 q = d * 1.65;
						// le curseur creuse un peu la nébuleuse là où il pointe
						float cd = max(dot(d, uRayD), 0.0);
						q -= uRayD * pow(cd, 10.0) * 0.28 * (0.4 + uCursorVel);
						q += vec3(uTime * 0.0035, uTime * 0.001, uTime * 0.002);
						// un bruit déformé par un autre bruit : des nuages qui ont l'air de s'enrouler
						vec3 w = vec3(fbm3(q + 1.7), fbm3(q + 9.2), fbm3(q + 4.4));
						float n = fbm5(q * 1.25 + w * 1.7);
						float neb = smoothstep(-0.15, 0.8, n);
						neb = neb * neb * (0.55 + 0.45 * smoothstep(-0.2, 0.5, w.y));
						vec3 nc = mix(uNebA, uNebB, smoothstep(-0.25, 0.45, w.x));
						float fil = pow(max(1.0 - abs(fbm3(q * 3.1 + w * 2.2)), 0.0), 7.0); // les filaments
						col += nc * (neb * 1.4 + fil * 0.5) * uNebAmt;
						col *= 1.0 - smoothstep(0.15, 0.7, fbm3(q * 2.3 - w * 1.3)) * 0.6 * uNebAmt; // les nuages sombres
					}
					col = mix(col, uFogColor, uSkyFog * (1.0 - smoothstep(0.0, 0.55, abs(y))));
					vec3 far = cameraPosition + d * 1800.0;
					col += fogScatter(cameraPosition, far, uGlowPos, uGlowColor);
					col += fogScatter(cameraPosition, far, uGlowPos2, uGlowColor2);
					gl_FragColor = vec4(col, 1.0);
				}`,
		}));
		dome.frustumCulled = false;
		dome.renderOrder = 10000;

		// les étoiles : des points répartis sur la sphère, quelques-uns beaucoup plus gros (aléa à la puissance 6)
		const random = mulberry(seed);
		const positions = new Float32Array(stars * 3);
		const seeds = new Float32Array(stars * 2);
		for (let i = 0; i < stars; i++) {
			const z = random() * 2 - 1;
			const angle = random() * Math.PI * 2;
			const r = Math.sqrt(1 - z * z);
			positions[i * 3] = Math.cos(angle) * r;
			positions[i * 3 + 1] = z;
			positions[i * 3 + 2] = Math.sin(angle) * r;
			seeds[i * 2] = random();
			seeds[i * 2 + 1] = random() ** 6;
		}
		const geometry = new BufferGeometry();
		geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
		geometry.setAttribute('aSeed', new Float32BufferAttribute(seeds, 2));
		this.starUniforms = { uStars: { value: 1 }, uHorizonY: this.uniforms.uHorizonY, ...sceneUniforms };
		const starPoints = new Points(geometry, new ShaderMaterial({
			uniforms: this.starUniforms,
			transparent: true,
			depthWrite: false,
			blending: AdditiveBlending,
			vertexShader: /* glsl */ `
				attribute vec2 aSeed;
				varying float vA;
				varying vec3 vCol;
				uniform float uStars, uHorizonY;
				${SCENE_UNIFORMS_GLSL}
				void main(){
					vec4 p = projectionMatrix * modelViewMatrix * vec4(position * 10.0, 1.0);
					gl_Position = p.xyww;
					float tw = 0.65 + 0.35 * sin(uTime * (1.0 + aSeed.x * 3.0) + aSeed.x * 40.0);
					float big = aSeed.y;
					gl_PointSize = (1.0 + big * 3.2) * uPixelRatio;
					vA = uStars * tw * (0.35 + big * 2.2) * smoothstep(-0.08, 0.12, position.y - uHorizonY * 0.5);
					vCol = mix(vec3(0.75, 0.85, 1.0), vec3(1.0, 0.85, 0.7), aSeed.x); // du bleuté au doré
				}`,
			fragmentShader: /* glsl */ `
				varying float vA;
				varying vec3 vCol;
				void main(){
					vec2 c = gl_PointCoord - 0.5;
					float d = length(c);
					float a = smoothstep(0.5, 0.0, d);
					a *= a;
					gl_FragColor = vec4(vCol * vA * a * 3.0, 1.0);
				}`,
		}));
		starPoints.frustumCulled = false;
		starPoints.renderOrder = -999;
		this.stars = starPoints;
		this.group = new Group();
		this.group.add(dome, starPoints);
	}

	/** À chaque frame : le dôme suit la caméra et reprend les réglages. */
	update(camera) {
		const s = this.settings;
		const u = this.uniforms;
		this.group.position.copy(camera.position);
		u.uSkyTop.value.copy(s.skyTop);
		u.uSkyHorizon.value.copy(s.skyHorizon);
		u.uSkyBottom.value.copy(s.skyBottom);
		u.uNebA.value.copy(s.nebA);
		u.uNebB.value.copy(s.nebB);
		u.uNebAmt.value = s.nebAmt;
		u.uSkyFog.value = s.skyFog;
		u.uHorizonY.value = s.horizonY;
		u.uSkyK.value = s.skyK;
		this.starUniforms.uStars.value = s.stars;
		this.stars.visible = s.stars > 0.01;
	}

	dispose() {
		for (const child of this.group.children) {
			child.geometry.dispose();
			child.material.dispose();
		}
	}
}

/** Les ambiances de ciel d'origine (couleurs du ciel, de la nébuleuse et du brouillard). */
export const SKY_PRESETS = {
	nuit: { skyTop: '#010204', skyHorizon: '#081116', skyBottom: '#04080a', horizonY: -0.12, nebA: '#10323d', nebB: '#3c0b0e', nebAmt: 0.6, skyFog: 0.02, stars: 1, fogColor: '#05080a', fogDensity: 0.0012, fogFalloff: 0.01, fogBase: -40, fogNoise: 0.1 },
	foret: { skyTop: '#010302', skyHorizon: '#07170c', skyBottom: '#020604', horizonY: -0.05, nebA: '#0e3b1d', nebB: '#05180f', nebAmt: 0.22, skyFog: 0.45, stars: 0.18, fogColor: '#081a0e', fogDensity: 0.028, fogFalloff: 0.1, fogBase: 0.5, fogNoise: 0.85 },
	braise: { skyTop: '#070102', skyHorizon: '#e6401a', skyBottom: '#1c0503', horizonY: -0.01, skyK: 7, nebA: '#3a0705', nebB: '#7a1606', nebAmt: 0.1, skyFog: 0.12, stars: 0.05, fogColor: '#3a0904', fogDensity: 0.016, fogFalloff: 0.2, fogBase: -0.5, fogNoise: 0.5 },
	sang: { skyTop: '#020101', skyHorizon: '#140504', skyBottom: '#050101', horizonY: -0.1, nebA: '#2e0907', nebB: '#10323d', nebAmt: 0.45, skyFog: 0.04, stars: 0.85, fogColor: '#0b0302', fogDensity: 0.01, fogFalloff: 0.05, fogBase: -6, fogNoise: 0.45 },
	cendre: { skyTop: '#353b41', skyHorizon: '#7d858b', skyBottom: '#15171a', horizonY: -0.03, nebA: '#2a3038', nebB: '#3a1c1c', nebAmt: 0.1, skyFog: 0.3, stars: 0.95, fogColor: '#596168', fogDensity: 0.006, fogFalloff: 0.06, fogBase: -4, fogNoise: 0.45 },
	espace: { skyTop: '#010204', skyHorizon: '#0a0d12', skyBottom: '#030405', horizonY: -0.2, nebA: '#122c38', nebB: '#3d0c10', nebAmt: 0.75, skyFog: 0.1, stars: 1, fogColor: '#0a0e12', fogDensity: 0.0011, fogFalloff: 0.004, fogBase: -200, fogNoise: 0.2 },
};

const _from = new Color();
const _to = new Color();
const _blend = {};

/** Mélange deux préréglages (t de 0 à 1) dans le ciel et le brouillard : pour glisser d'une ambiance à l'autre au scroll. */
export function blendSkyPresets(sky, from, to, t) {
	for (const key in _blend) delete _blend[key];
	for (const key of ['skyTop', 'skyHorizon', 'skyBottom', 'nebA', 'nebB', 'fogColor']) _blend[key] = `#${_from.set(from[key]).lerp(_to.set(to[key]), t).getHexString()}`;
	for (const key of ['horizonY', 'nebAmt', 'skyFog', 'stars', 'fogDensity', 'fogFalloff', 'fogBase', 'fogNoise']) _blend[key] = from[key] + (to[key] - from[key]) * t;
	_blend.skyK = (from.skyK ?? 3) + ((to.skyK ?? 3) - (from.skyK ?? 3)) * t;
	applySkyPreset(sky, _blend);
}

/** Applique un préréglage de SKY_PRESETS au ciel et au brouillard de hauteur. */
export function applySkyPreset(sky, preset) {
	for (const key of ['skyTop', 'skyHorizon', 'skyBottom', 'nebA', 'nebB']) if (preset[key]) sky.settings[key].set(preset[key]);
	for (const key of ['horizonY', 'skyK', 'nebAmt', 'skyFog', 'stars']) if (preset[key] !== undefined) sky.settings[key] = preset[key];
	if (preset.skyK === undefined) sky.settings.skyK = 3;
	if (preset.fogColor) fogUniforms.uFogColor.value.set(preset.fogColor);
	for (const [key, uniform] of [['fogDensity', 'uFogDensity'], ['fogFalloff', 'uFogFalloff'], ['fogBase', 'uFogBase'], ['fogNoise', 'uFogNoise']]) if (preset[key] !== undefined) fogUniforms[uniform].value = preset[key];
}

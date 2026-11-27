import { Color, MathUtils, Raycaster, Vector2, Vector3 } from 'three';

/**
 * Les uniforms partagés par tous les effets de `scene-kit` : un seul objet, référencé par chaque matériau, mis à
 * jour une fois par frame. Ce qui les rend vivants : le temps, et surtout le **rayon du curseur** (uRayO, uRayD),
 * la droite qui part de la caméra et passe sous le pointeur. Tout ce qui s'écarte du curseur (poussières, herbe,
 * pierres, fil laser) mesure sa distance à ce rayon, en 3D : on peut repousser des choses lointaines comme proches.
 */
export const sceneUniforms = {
	uTime: { value: 0 },
	uRayO: { value: new Vector3() }, // origine du rayon du curseur (la caméra)
	uRayD: { value: new Vector3(0, 0, -1) }, // sa direction
	uCursor: { value: new Vector2() }, // le curseur en coordonnées écran (-1..1), lissé
	uCursorVel: { value: 0 }, // l'« énergie » du curseur : monte quand il bouge vite, retombe à l'arrêt
	uFocus: { value: 10 }, // distance de mise au point (bokeh des poussières)
	uBokeh: { value: 1 }, // force du bokeh
	uPixelRatio: { value: 1 },
	uViewH: { value: 1000 }, // hauteur du rendu, en pixels réels
	uProjScale: { value: 1000 }, // pixels par unité à distance 1 : hauteur / (2 · tan(fov / 2))
	uKeyShade: { value: 0 },
};

/** Les uniforms du brouillard de hauteur (voir `heightFog.js`) et le volume de bruit. */
export const fogUniforms = {
	uFogColor: { value: new Color(0) },
	uFogDensity: { value: 0 }, // 0 = pas de brouillard : les effets marchent sans
	uFogBase: { value: 0 },
	uFogFalloff: { value: 0.02 },
	uFogNoise: { value: 0.5 },
	uGlowPos: { value: new Vector3() }, // deux sources dont la lumière se diffuse dans le brouillard
	uGlowColor: { value: new Color(0) },
	uGlowPos2: { value: new Vector3() },
	uGlowColor2: { value: new Color(0) },
	uFogTime: sceneUniforms.uTime,
	tNoise: { value: null }, // à remplir avec bakeNoiseVolume(renderer)
};

export const SCENE_UNIFORMS_GLSL = /* glsl */ `
uniform float uTime;
uniform vec3 uRayO;
uniform vec3 uRayD;
uniform vec2 uCursor;
uniform float uCursorVel;
uniform float uFocus;
uniform float uBokeh;
uniform float uPixelRatio;
uniform float uViewH;
uniform float uProjScale;
uniform float uKeyShade;
`;

/**
 * Brouillard de hauteur : plus dense en bas, avec une densité qui dérive (bruit), et deux lueurs qui se diffusent
 * dedans (`fogScatter`, intégrale exacte d'une source ponctuelle le long du rayon). `applyFog(couleur, position)`
 * l'applique à un point ; `fogTransmittance` dit quelle part de la lumière traverse.
 */
export const FOG_GLSL = /* glsl */ `
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform float uFogBase;
uniform float uFogFalloff;
uniform float uFogNoise;
uniform vec3 uGlowPos;
uniform vec3 uGlowColor;
uniform vec3 uGlowPos2;
uniform vec3 uGlowColor2;
uniform float uFogTime;

#ifndef T_NOISE
#define T_NOISE
uniform highp sampler3D tNoise;
#endif
// densité qui dérive, 0..1 autour d'une moitié : une lecture dans le volume de bruit
float fogNoise(vec3 x){ return 0.5 + (texture(tNoise, x * 0.045).r - 0.5) * 1.4; }

float fogTransmittance(vec3 ro, vec3 p){
  vec3 rd = p - ro;
  float dist = length(rd);
  rd /= max(dist, 1e-4);
  float b = max(uFogFalloff, 1e-4);
  float e0 = exp(clamp(-(ro.y - uFogBase) * b, -30.0, 5.0));
  float k = rd.y * b;
  float kd = clamp(dist * k, -12.0, 60.0);
  float integral = abs(k) > 1e-5 ? e0 * (1.0 - exp(-kd)) / k : e0 * dist;
  float n = 1.0;
  if (uFogNoise > 0.0) {
    vec3 q = p * 0.05 + vec3(uFogTime * 0.013, -uFogTime * 0.021, uFogTime * 0.017);
    float nn = fogNoise(q) * 0.65 + fogNoise(q * 2.63 + 3.1) * 0.35;
    n = mix(1.0, 0.25 + nn * 1.5, uFogNoise * smoothstep(420.0, 40.0, dist));
  }
  return exp(-uFogDensity * max(integral, 0.0) * n);
}

vec3 fogScatter(vec3 ro, vec3 p, vec3 L, vec3 col){
  vec3 rd = p - ro;
  float dist = length(rd);
  rd /= max(dist, 1e-4);
  vec3 q = ro - L;
  float bq = dot(rd, q);
  float h2 = max(dot(q, q) - bq * bq, 0.04);
  float s = inversesqrt(h2);
  return col * (s * (atan((dist + bq) * s) - atan(bq * s))) * exp(-sqrt(h2) * 0.045);
}

vec3 applyFog(vec3 col, vec3 p){
  float T = fogTransmittance(cameraPosition, p);
  vec3 c = mix(uFogColor, col, T);
  c += fogScatter(cameraPosition, p, uGlowPos, uGlowColor);
  c += fogScatter(cameraPosition, p, uGlowPos2, uGlowColor2);
  return c;
}
`;

/** Distance d'un point au rayon du curseur : renvoie la direction pour s'en éloigner, et la distance / l'abscisse. */
export const CURSOR_GLSL = /* glsl */ `
vec3 cursorAway(vec3 wp, out float dist, out float along){
  vec3 toP = wp - uRayO;
  along = max(dot(toP, uRayD), 0.0);
  vec3 cp = uRayO + uRayD * along;
  vec3 away = wp - cp;
  dist = length(away);
  return away / max(dist, 1e-4);
}
`;

/** Perturbation de normale par une hauteur (H) ou par la pente d'un bruit (G), sans tangentes. */
export const PERTURB_NORMAL_GLSL = /* glsl */ `
vec3 perturbNormalH(vec3 surf_pos, vec3 surf_norm, float h){
  vec3 vSigmaX = dFdx(surf_pos);
  vec3 vSigmaY = dFdy(surf_pos);
  vec3 R1 = cross(vSigmaY, surf_norm);
  vec3 R2 = cross(surf_norm, vSigmaX);
  float fDet = dot(vSigmaX, R1);
  vec2 dHdxy = vec2(dFdx(h), dFdy(h));
  vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);
  return normalize(abs(fDet) * surf_norm - vGrad);
}
vec3 perturbNormalG(vec3 surf_pos, vec3 surf_norm, vec3 p, vec3 g, float extra){
  vec3 vSigmaX = dFdx(surf_pos);
  vec3 vSigmaY = dFdy(surf_pos);
  vec3 R1 = cross(vSigmaY, surf_norm);
  vec3 R2 = cross(surf_norm, vSigmaX);
  float fDet = dot(vSigmaX, R1);
  vec2 dHdxy = vec2(dot(g, dFdx(p)) + dFdx(extra), dot(g, dFdy(p)) + dFdy(extra));
  vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);
  return normalize(abs(fDet) * surf_norm - vGrad);
}
`;

// rapprochement exponentiel indépendant de la fréquence d'images
const approach = (from, to, speed, dt) => from + (to - from) * (1 - Math.exp(-speed * dt));

/**
 * Suit le pointeur et en tire ce que les effets attendent : sa position lissée (`ndc`, lente ; `fast`, vive) et
 * son « énergie », qui monte avec la vitesse du geste et retombe doucement. Au tactile, le curseur revient au
 * centre quand on ne touche plus l'écran.
 *
 *   const cursor = new CursorTracker();
 *   cursor.update(dt);                          // à chaque frame
 *   cursor.moveTo(x, y);                        // pour le piloter sans souris (démo automatique)
 */
export class CursorTracker {
	constructor(element = window) {
		this.target = new Vector2();
		this.ndc = new Vector2();
		this.fast = new Vector2();
		this.energy = 0;
		this.energyS = 0;
		this.clickPulse = 0;
		this.moved = false;
		this.lastMove = 0;
		this.coarse = matchMedia('(pointer: coarse)').matches;
		const onMove = (event) => this.moveTo(event.clientX, event.clientY);
		element.addEventListener('pointermove', onMove, { passive: true });
		element.addEventListener('pointerdown', (event) => {
			this.clickPulse = 1;
			onMove(event);
		}, { passive: true });
	}

	/** Position en pixels dans la fenêtre. */
	moveTo(x, y) {
		const nx = (x / innerWidth) * 2 - 1;
		const ny = -((y / innerHeight) * 2 - 1);
		const step = Math.hypot(nx - this.target.x, ny - this.target.y);
		this.energy = Math.min(1, this.energy + step * 2.2);
		this.target.set(nx, ny);
		this.lastMove = performance.now();
		this.moved = true;
	}

	update(dt) {
		if (this.coarse && (performance.now() - this.lastMove) / 1000 > 2.5) this.target.multiplyScalar(Math.max(0, 1 - dt * 1.5));
		this.ndc.x = approach(this.ndc.x, this.target.x, 3.2, dt);
		this.ndc.y = approach(this.ndc.y, this.target.y, 3.2, dt);
		this.fast.x = approach(this.fast.x, this.target.x, 14, dt);
		this.fast.y = approach(this.fast.y, this.target.y, 14, dt);
		this.energy = approach(this.energy, 0, 1.6, dt);
		this.energyS = approach(this.energyS, this.energy, 5, dt);
		this.clickPulse = approach(this.clickPulse, 0, 3.5, dt);
	}
}

const _raycaster = new Raycaster();

/**
 * Met à jour les uniforms partagés, une fois par frame, après avoir placé la caméra.
 *   time      secondes
 *   camera    la caméra perspective (sa matrice doit être à jour)
 *   cursor    un CursorTracker (facultatif)
 *   height    hauteur du rendu en pixels réels (renderer.getDrawingBufferSize().y)
 *   focus     distance de mise au point (facultatif)
 */
export function updateSceneUniforms({ time, camera, cursor = null, height, pixelRatio = 1, focus = null, bokeh = null }) {
	const u = sceneUniforms;
	u.uTime.value = time;
	u.uPixelRatio.value = pixelRatio;
	u.uViewH.value = height;
	u.uProjScale.value = height / (2 * Math.tan(MathUtils.degToRad(camera.fov) / 2));
	if (cursor) {
		_raycaster.setFromCamera(cursor.fast, camera);
		u.uRayO.value.copy(_raycaster.ray.origin);
		u.uRayD.value.copy(_raycaster.ray.direction);
		u.uCursor.value.copy(cursor.ndc);
		u.uCursorVel.value = cursor.energyS;
	}
	if (focus !== null) u.uFocus.value = focus;
	if (bokeh !== null) u.uBokeh.value = bokeh;
}

import { AdditiveBlending, BufferGeometry, Color, Float32BufferAttribute, Points, ShaderMaterial, Vector3 } from 'three';
import { mulberry, NOISE_GLSL } from '../../core/scene-kit/noiseVolume.js';
import { CURSOR_GLSL, FOG_GLSL, fogUniforms, SCENE_UNIFORMS_GLSL, sceneUniforms } from '../../core/scene-kit/sceneUniforms.js';

const MODES = { wrap: 0, float: 1, rise: 2, swirl: 3 };

const VERTEX = /* glsl */ `
attribute vec4 aSeed;
uniform float uMode, uBox, uSize, uAmt, uSpeed, uHeight, uRepel, uBokehAmt, uTwinkle;
uniform vec3 uCenter, uSpread, uCamPos;
varying float vA;
varying vec3 vWorld;
varying float vSeed;
${SCENE_UNIFORMS_GLSL}
${NOISE_GLSL}
${CURSOR_GLSL}
void main(){
  vec3 wp;
  float t = uTime * uSpeed;
  float fade = 1.0;
  if (uMode < 0.5) {
    // wrap : une boîte de poussière qui suit la caméra et se répète à l'infini (on ne voit jamais le bord)
    vec3 drift = vec3(0.0, t * 0.012 * (0.4 + aSeed.x), t * 0.006) + vec3(sin(t * 0.21 + aSeed.y * 6.28), cos(t * 0.17 + aSeed.z * 6.28), sin(t * 0.13 + aSeed.w * 6.28)) * 0.004;
    vec3 local = fract(position + drift - uCamPos / uBox) - 0.5;
    wp = uCamPos + local * uBox;
    vec3 al = abs(local) * 2.0;
    fade = 1.0 - smoothstep(0.75, 1.0, max(al.x, max(al.y, al.z)));
  } else if (uMode < 1.5) {
    // float : un nuage qui flotte sur place
    vec3 off = (position - 0.5) * 2.0 * uSpread;
    off += vec3(sin(t * 0.3 + aSeed.y * 6.28), sin(t * 0.23 + aSeed.z * 6.28), cos(t * 0.27 + aSeed.w * 6.28)) * (0.3 + aSeed.x * 0.6);
    wp = (modelMatrix * vec4(uCenter + off, 1.0)).xyz;
  } else if (uMode < 2.5) {
    // rise : une colonne de braises qui montent en tournant
    float h = fract(position.y + t * 0.05 * (0.5 + aSeed.x));
    float ang = position.x * 6.2831 + t * 0.2 * (aSeed.y - 0.5) + h * 2.0;
    float rad = sqrt(position.z) * uSpread.x;
    vec3 off = vec3(cos(ang) * rad, h * uHeight, sin(ang) * rad * uSpread.z / max(uSpread.x, 0.001));
    off.x += snoise(vec3(h * 3.0, aSeed.y * 10.0, t * 0.2)) * 0.6;
    off.z += snoise(vec3(h * 3.0, aSeed.z * 10.0, t * 0.2 + 3.0)) * 0.6;
    wp = (modelMatrix * vec4(uCenter + off, 1.0)).xyz;
    fade = smoothstep(0.0, 0.12, h) * smoothstep(1.0, 0.7, h);
  } else {
    // swirl : un disque qui tourne, comme une galaxie
    float ang = position.x * 6.2831 + t * (0.15 + aSeed.x * 0.35);
    float rad = mix(0.25, 1.0, position.z) * uSpread.x;
    float yy = (position.y - 0.5) * 2.0 * uSpread.y + sin(t * 0.7 + aSeed.w * 6.28) * 0.3;
    vec3 off = vec3(cos(ang) * rad, yy, sin(ang) * rad);
    wp = (modelMatrix * vec4(uCenter + off, 1.0)).xyz;
  }
  // le curseur écarte les grains (et les fait danser un peu)
  float dist, along;
  vec3 away = cursorAway(wp, dist, along);
  float infl = exp(-dist * dist / (0.9 + along * 0.02)) * smoothstep(90.0, 0.0, along);
  wp += away * infl * uRepel * (0.6 + uCursorVel * 1.8);
  wp.y += infl * uRepel * 0.25 * sin(uTime * 3.0 + aSeed.x * 20.0);

  vec4 mv = viewMatrix * vec4(wp, 1.0);
  float z = max(-mv.z, 0.01);
  // bokeh : un grain hors de la mise au point grossit et pâlit, comme dans un objectif
  float coc = abs(1.0 - uFocus / z);
  float bokeh = 1.0 + min(coc * 7.0 * uBokehAmt * uBokeh, 22.0);
  float worldSize = uSize * (0.35 + aSeed.x * aSeed.x * 1.6);
  float px = worldSize * uProjScale / z;
  gl_PointSize = clamp(px * bokeh, 1.2 * uPixelRatio, 90.0 * uPixelRatio);
  float tw = 1.0 - uTwinkle + uTwinkle * (0.5 + 0.5 * sin(uTime * (2.0 + aSeed.y * 5.0) + aSeed.z * 50.0));
  float sizeLoss = px * bokeh / max(gl_PointSize, 1e-3);
  vA = uAmt * fade * tw * smoothstep(0.25, 1.4, z) / (bokeh * bokeh * 0.55 + 0.45) * min(1.0, sizeLoss * 1.5);
  vWorld = wp;
  vSeed = aSeed.w;
  gl_Position = projectionMatrix * mv;
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uColor2;
varying float vA;
varying vec3 vWorld;
varying float vSeed;
${FOG_GLSL}
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c) * 2.0;
  float disc = smoothstep(1.0, 0.72, d);
  float rim = smoothstep(0.55, 0.95, d) * disc; // un bord un peu plus clair : l'aspect d'un vrai bokeh
  float a = disc * (0.75 + rim * 0.6);
  vec3 col = mix(uColor, uColor2, vSeed);
  col *= vA * a * fogTransmittance(cameraPosition, vWorld);
  if (col.r + col.g + col.b < 0.0005) discard;
  gl_FragColor = vec4(col, 1.0);
}
`;

/**
 * Poussières en suspension qui s'écartent du curseur. Chaque grain est un point additif, qui grossit et pâlit
 * quand il est hors de la mise au point (bokeh), scintille, et fuit le rayon du curseur, d'autant plus fort que le
 * geste est vif. Quatre façons de les disposer :
 *   wrap    une boîte qui suit la caméra et se répète : de la poussière partout, sans fin
 *   float   un nuage qui flotte autour d'un centre
 *   rise    une colonne de braises qui montent en tournant
 *   swirl   un disque qui tourne
 *
 *   const dust = new CursorDust({ mode: 'wrap', count: 3000, box: 56, size: 0.024 });
 *   scene.add(dust.points);
 *   dust.uniforms.uCamPos.value.copy(camera.position);    // à chaque frame, pour le mode wrap
 *
 * Demande les uniforms partagés à jour (updateSceneUniforms) et, pour le mode rise, le volume de bruit.
 */
export class CursorDust {
	/**
	 * Options : mode, count (2000), seed, box (taille de la boîte wrap, 60), size (taille d'un grain, 0.03),
	 * amount (opacité, 1), speed (1), height (hauteur de la colonne rise, 10), repel (fuite devant le curseur, 1.4),
	 * bokeh (1), twinkle (0.3), center ([0,0,0]), spread (demi-tailles du nuage, [10,10,10]), color, color2
	 * (couleur des grains, mélangée au hasard), intensity (> 1 pour le bloom).
	 */
	constructor(options = {}) {
		const count = options.count ?? 2000;
		const random = mulberry(options.seed ?? 11);
		const positions = new Float32Array(count * 3);
		const seeds = new Float32Array(count * 4);
		for (let i = 0; i < count; i++) {
			positions[i * 3] = random();
			positions[i * 3 + 1] = random();
			positions[i * 3 + 2] = random();
			for (let k = 0; k < 4; k++) seeds[i * 4 + k] = random();
		}
		const geometry = new BufferGeometry();
		geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
		geometry.setAttribute('aSeed', new Float32BufferAttribute(seeds, 4));
		this.uniforms = {
			uMode: { value: MODES[options.mode ?? 'float'] },
			uBox: { value: options.box ?? 60 },
			uSize: { value: options.size ?? 0.03 },
			uAmt: { value: options.amount ?? 1 },
			uSpeed: { value: options.speed ?? 1 },
			uHeight: { value: options.height ?? 10 },
			uRepel: { value: options.repel ?? 1.4 },
			uBokehAmt: { value: options.bokeh ?? 1 },
			uTwinkle: { value: options.twinkle ?? 0.3 },
			uCenter: { value: new Vector3(...(options.center ?? [0, 0, 0])) },
			uSpread: { value: new Vector3(...(options.spread ?? [10, 10, 10])) },
			uCamPos: { value: new Vector3() },
			uColor: { value: new Color(options.color ?? '#ffffff').multiplyScalar(options.intensity ?? 1) },
			uColor2: { value: new Color(options.color2 ?? options.color ?? '#ffffff').multiplyScalar(options.intensity ?? 1) },
			...sceneUniforms,
			...fogUniforms,
		};
		this.material = new ShaderMaterial({ uniforms: this.uniforms, vertexShader: VERTEX, fragmentShader: FRAGMENT, transparent: true, depthWrite: false, blending: AdditiveBlending });
		this.points = new Points(geometry, this.material);
		this.points.frustumCulled = false;
		this.points.renderOrder = 10;
	}

	/** Pour le mode wrap : la boîte suit la caméra. */
	follow(camera) {
		this.uniforms.uCamPos.value.copy(camera.position);
	}

	dispose() {
		this.points.geometry.dispose();
		this.material.dispose();
	}
}

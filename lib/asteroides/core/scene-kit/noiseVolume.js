import { Data3DTexture, LinearFilter, LinearMipmapLinearFilter, Mesh, BufferGeometry, Float32BufferAttribute, NearestFilter, OrthographicCamera, RepeatWrapping, RGBAFormat, ShaderMaterial, UnsignedByteType, WebGLRenderTarget } from 'three';

// Taille du volume : 128³ texels, 16 cellules de bruit par tuile (le volume se répète sans raccord).
const SIZE = 128;
const PERIOD = 16;
const TILES = 16; // les 128 tranches sont rangées en 16 × 8 tuiles dans une image de 2048 × 1024

// Le bruit de Perlin 3D avec sa dérivée, calculé une fois par le GPU dans une grande image (une tranche par
// tuile), puis recopié dans une texture 3D. R = la valeur, GBA = la pente.
const BAKE_FRAGMENT = /* glsl */ `
vec3 h33(vec3 p3){ p3 = fract(p3 * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yxx) * p3.zyx); }
// un vecteur unitaire à chaque coin du réseau, qui boucle toutes les PERIOD cellules
vec3 G(vec3 i){ return normalize(h33(mod(i, ${PERIOD}.0) + 0.5) * 2.0 - 1.0); }
void main(){
  vec2 px = floor(gl_FragCoord.xy);
  vec2 tile = floor(px / ${SIZE}.0);
  vec3 x = (vec3(px - tile * ${SIZE}.0, tile.y * ${TILES}.0 + tile.x) + 0.5) * (${PERIOD}.0 / ${SIZE}.0);
  vec3 i = floor(x), f = fract(x);
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec3 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  vec3 ga = G(i), gb = G(i + vec3(1, 0, 0)), gc = G(i + vec3(0, 1, 0)), gd = G(i + vec3(1, 1, 0));
  vec3 ge = G(i + vec3(0, 0, 1)), gf = G(i + vec3(1, 0, 1)), gg = G(i + vec3(0, 1, 1)), gh = G(i + vec3(1, 1, 1));
  float va = dot(ga, f), vb = dot(gb, f - vec3(1, 0, 0)), vc = dot(gc, f - vec3(0, 1, 0)), vd = dot(gd, f - vec3(1, 1, 0));
  float ve = dot(ge, f - vec3(0, 0, 1)), vf = dot(gf, f - vec3(1, 0, 1)), vg = dot(gg, f - vec3(0, 1, 1)), vh = dot(gh, f - vec3(1, 1, 1));
  float k = -va + vb + vc - vd + ve - vf - vg + vh;
  float v = va + u.x * (vb - va) + u.y * (vc - va) + u.z * (ve - va) + u.x * u.y * (va - vb - vc + vd) + u.y * u.z * (va - vc - ve + vg) + u.z * u.x * (va - vb - ve + vf) + k * u.x * u.y * u.z;
  vec3 d = ga + u.x * (gb - ga) + u.y * (gc - ga) + u.z * (ge - ga) + u.x * u.y * (ga - gb - gc + gd) + u.y * u.z * (ga - gc - ge + gg) + u.z * u.x * (ga - gb - ge + gf) + (-ga + gb + gc - gd + ge - gf - gg + gh) * u.x * u.y * u.z
         + du * (vec3(vb, vc, ve) - va + u.yzx * vec3(va - vb - vc + vd, va - vc - ve + vg, va - vb - ve + vf) + u.zxy * vec3(va - vb - ve + vf, va - vb - vc + vd, va - vc - ve + vg) + u.yzx * u.zxy * k);
  // le bruit reste dans ±0.66 et sa pente dans ±2 : chacun est étalé sur les 8 bits
  gl_FragColor = vec4(v / 1.32 + 0.5, d / 4.0 + 0.5);
}`;

/**
 * Pré-calcule un volume de bruit 3D (128³, qui se répète sans raccord) et le renvoie en texture 3D. Tous les
 * shaders de `scene-kit` lisent leur bruit dedans (`snoise`, `fbm3`, `fbm5`…) au lieu de le calculer : une
 * lecture de texture au lieu d'une centaine d'opérations par pixel, ce qui rend abordables des effets qui en
 * demandent beaucoup (ciel, pierre, brouillard). Le calcul prend quelques millisecondes, une seule fois.
 *
 *   fogUniforms.tNoise.value = bakeNoiseVolume(renderer);   // au démarrage, avant le premier rendu
 *
 * Demande WebGL2 (three ≥ r163).
 */
export function bakeNoiseVolume(renderer) {
	const width = SIZE * TILES;
	const height = (SIZE / TILES) * SIZE;
	const target = new WebGLRenderTarget(width, height, { depthBuffer: false, minFilter: NearestFilter, magFilter: NearestFilter, generateMipmaps: false });
	const geometry = new BufferGeometry();
	geometry.setAttribute('position', new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
	const material = new ShaderMaterial({ vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: BAKE_FRAGMENT, depthTest: false, depthWrite: false });
	const quad = new Mesh(geometry, material);
	quad.frustumCulled = false;
	const previous = renderer.getRenderTarget();
	renderer.setRenderTarget(target);
	renderer.render(quad, new OrthographicCamera());
	const pixels = new Uint8Array(width * height * 4);
	renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels);
	renderer.setRenderTarget(previous);
	target.dispose();
	geometry.dispose();
	material.dispose();

	// réordonne les tuiles en tranches successives
	const data = new Uint8Array(SIZE * SIZE * SIZE * 4);
	for (let slice = 0; slice < SIZE; slice++) {
		const tileX = slice % TILES;
		const tileY = (slice / TILES) | 0;
		for (let row = 0; row < SIZE; row++) {
			const from = ((tileY * SIZE + row) * width + tileX * SIZE) * 4;
			data.set(pixels.subarray(from, from + SIZE * 4), (slice * SIZE + row) * SIZE * 4);
		}
	}
	const texture = new Data3DTexture(data, SIZE, SIZE, SIZE);
	texture.format = RGBAFormat;
	texture.type = UnsignedByteType;
	texture.minFilter = LinearMipmapLinearFilter;
	texture.magFilter = LinearFilter;
	texture.wrapS = texture.wrapT = texture.wrapR = RepeatWrapping;
	texture.generateMipmaps = true;
	texture.needsUpdate = true;
	renderer.initTexture(texture);
	return texture;
}

/**
 * Le bruit côté shader : hachages, bruit de valeur, et `snoise` / `fbm` qui lisent le volume pré-calculé. Le volume
 * est tourné avant d'être lu, pour qu'une surface plane ne le coupe jamais dans le sens où il se répète.
 * Attend l'uniform `tNoise` (déclaré ici, protégé contre une double déclaration).
 */
export const NOISE_GLSL = /* glsl */ `
float hash11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float hash13(vec3 p3){ p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
vec3 hash33(vec3 p3){ p3 = fract(p3 * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yxx) * p3.zyx); }

float vnoise(vec3 p){
  vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float a = hash13(i), b = hash13(i + vec3(1,0,0)), c = hash13(i + vec3(0,1,0)), d = hash13(i + vec3(1,1,0));
  float e = hash13(i + vec3(0,0,1)), g = hash13(i + vec3(1,0,1)), h = hash13(i + vec3(0,1,1)), k = hash13(i + vec3(1,1,1));
  return mix(mix(mix(a, b, f.x), mix(c, d, f.x), f.y), mix(mix(e, g, f.x), mix(h, k, f.x), f.y), f.z);
}

#ifndef T_NOISE
#define T_NOISE
uniform highp sampler3D tNoise;
#endif
const mat3 N_ROT = mat3(0.59138, 0.70098, -0.39861,  -0.46617, 0.70053, 0.54032,  0.65799, -0.13372, 0.74106);
const float N_SCALE = 0.098231; // 1,5717 cellule du volume par unité de bruit, 16 cellules par tuile
// (lu deux niveaux plus fin que ce que choisirait le GPU : un grain plus fin que le pixel fait partie de
// l'aspect de la pierre ; un vertex shader ne peut pas demander de biais et lit la copie pleine taille)
#ifdef texture2DLodEXT
  #define N_TEX(c) texture(tNoise, c, -1.0)
#else
  #define N_TEX(c) textureLod(tNoise, c, 0.0)
#endif
float snoise(vec3 v){ return (N_TEX(N_ROT * v * N_SCALE).r - 0.5) * 2.5914; }
#ifdef texture2DLodEXT
float noiseLevel(vec3 v){ vec3 c = v * (N_SCALE * 128.0); vec3 dx = dFdx(c), dy = dFdy(c); return 0.5 * log2(max(dot(dx, dx), dot(dy, dy)) + 1e-9); }
#endif
float grainLevel(float l, float f){ l += log2(f); return max(l - 2.0 * (1.0 - smoothstep(1.5, 3.5, l)), 0.0); }
vec4 snoisedL(vec3 v, float lod){ vec4 t = textureLod(tNoise, N_ROT * v * N_SCALE, lod); return vec4((t.r - 0.5) * 2.5914, ((t.gba - 0.5) * 12.342) * N_ROT); }
// le même, avec sa pente (yzw)
vec4 snoised(vec3 v){ vec4 t = N_TEX(N_ROT * v * N_SCALE); return vec4((t.r - 0.5) * 2.5914, ((t.gba - 0.5) * 12.342) * N_ROT); }
float snoiseL(vec3 v, float lod){ return (textureLod(tNoise, N_ROT * v * N_SCALE, lod).r - 0.5) * 2.5914; }

float fbm3(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 3; i++){ s += a * snoise(p); p = p * 2.03 + vec3(17.1, 3.7, 9.2); a *= 0.5; } return s; }
float fbm5(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a * snoise(p); p = p * 2.01 + vec3(7.1, 13.7, 3.2); a *= 0.5; } return s; }
vec4 fbm3d(vec3 p){ float a = 0.5, f = 1.0; vec4 s = vec4(0.0); for (int i = 0; i < 3; i++){ vec4 n = snoised(p); s += vec4(n.x * a, n.yzw * (a * f)); p = p * 2.03 + vec3(17.1, 3.7, 9.2); a *= 0.5; f *= 2.03; } return s; }
vec4 fbm3dL(vec3 p, float l, float f0){ float a = 0.5, f = 1.0; vec4 s = vec4(0.0); for (int i = 0; i < 3; i++){ vec4 n = snoisedL(p, grainLevel(l, f0 * f)); s += vec4(n.x * a, n.yzw * (a * f)); p = p * 2.03 + vec3(17.1, 3.7, 9.2); a *= 0.5; f *= 2.03; } return s; }
float vfbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++){ s += a * vnoise(p); p = p * 2.07 + vec3(5.3, 1.7, 8.9); a *= 0.5; } return s / 0.9375; }
`;

/** Bruit de Perlin 3D côté JavaScript (pour déformer des géométries), à graine. Renvoie une fonction (x, y, z) → ±1. */
export function createPerlin(seed = 1) {
	const random = mulberry(seed * 9973 + 17);
	const permutation = new Uint8Array(256);
	for (let i = 0; i < 256; i++) permutation[i] = i;
	for (let i = 255; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[permutation[i], permutation[j]] = [permutation[j], permutation[i]];
	}
	const p = new Uint8Array(512);
	for (let i = 0; i < 512; i++) p[i] = permutation[i & 255];
	const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
	const lerp = (t, a, b) => a + t * (b - a);
	const grad = (hash, x, y, z) => {
		const h = hash & 15;
		const u = h < 8 ? x : y;
		const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
		return (h & 1 ? -u : u) + (h & 2 ? -v : v);
	};
	return (x, y, z) => {
		let X = Math.floor(x);
		let Y = Math.floor(y);
		let Z = Math.floor(z);
		x -= X;
		y -= Y;
		z -= Z;
		X &= 255;
		Y &= 255;
		Z &= 255;
		const u = fade(x);
		const v = fade(y);
		const w = fade(z);
		const A = p[X] + Y;
		const AA = p[A] + Z;
		const AB = p[A + 1] + Z;
		const B = p[X + 1] + Y;
		const BA = p[B] + Z;
		const BB = p[B + 1] + Z;
		return lerp(w,
			lerp(v, lerp(u, grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z)), lerp(u, grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z))),
			lerp(v, lerp(u, grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1)), lerp(u, grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1))));
	};
}

/** fbm d'un bruit JavaScript : `octaves` couches de plus en plus fines. */
export function fbm(noise, x, y, z, octaves = 4) {
	let amplitude = 0.5;
	let sum = 0;
	let frequency = 1;
	for (let i = 0; i < octaves; i++) {
		sum += amplitude * noise(x * frequency, y * frequency, z * frequency);
		frequency *= 2.03;
		amplitude *= 0.5;
	}
	return sum;
}

/** Générateur pseudo-aléatoire à graine (0..1). */
export function mulberry(seed) {
	return function () {
		seed |= 0;
		seed = (seed + 1831565813) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

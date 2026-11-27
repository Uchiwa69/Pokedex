import { Euler, Group, InstancedBufferAttribute, InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three';
import { mulberry } from '../../core/scene-kit/noiseVolume.js';
import { inject, patchMaterial } from '../../core/scene-kit/patchMaterial.js';
import { createRockGeometry } from './rockGeometry.js';

/**
 * Champ d'astéroïdes : des centaines de roches (quelques formes, chacune instanciée) qui tournent sur elles-mêmes,
 * flottent doucement, peuvent orbiter autour d'un centre, et que le curseur repousse — les grosses plus fort,
 * comme si elles avaient plus d'inertie à déplacer. Tout le mouvement est calculé sur la carte graphique.
 *
 *   const field = new AsteroidField({ count: 300, bounds: new Vector3(60, 20, 60), material: createStoneMaterial() });
 *   scene.add(field.group);
 *
 * Options :
 *   count       nombre de roches                              (défaut 200)
 *   material    un matériau créé par createStoneMaterial (il est cloné)
 *   bounds      taille de la boîte où elles sont réparties (Vector3), ou placer(position, random) pour les placer soi-même
 *   sizeMin, sizeMax   tailles (la plupart sont petites)      (défaut 0.3, 2.2)
 *   variants    nombre de formes différentes                  (défaut 4)
 *   detail      finesse des roches                            (défaut 3)
 *   spin        vitesse de rotation                           (défaut 0.08)
 *   push        force de la répulsion du curseur              (défaut 1)
 *   rock        options passées à createRockGeometry
 *   orbit       { center: [x, y, z], speed } pour un anneau en rotation (défaut aucun)
 */
export class AsteroidField {
	constructor({ count = 200, seed = 5, bounds = new Vector3(40, 10, 40), placer = null, sizeMin = 0.3, sizeMax = 2.2, material, variants = 4, detail = 3, spin = 0.08, push = 1, rock = {}, orbit = null } = {}) {
		const random = mulberry(seed);
		this.group = new Group();
		this.meshes = [];
		const perVariant = Math.ceil(count / variants);
		this.uniforms = {
			uSpin: { value: spin },
			uPush: { value: push },
			uOrbitC: { value: new Vector3(...(orbit ? orbit.center : [0, 0, 0])) },
			uOrbit: { value: orbit ? orbit.speed : 0 },
		};
		const orbitCode = orbit
			? `
				vec3 c0 = instanceMatrix[3].xyz;
				vec2 rel = c0.xz - uOrbitC.xz;
				float rr = length(rel);
				float oa = uTime * uOrbit * (0.45 + aSpin.w * 0.9) / (1.0 + rr * 0.05) + aSpin.z * 0.3;
				float oc = cos(oa), os = sin(oa);
				vec3 shift = vec3(rel.x * oc - rel.y * os - rel.x, sin(uTime * 0.23 + aSpin.x * 40.0) * (0.25 + aSpin.y * 0.6), rel.x * os + rel.y * oc - rel.y);`
			: 'vec3 shift = vec3(0.0);';
		this.material = material.clone();
		patchMaterial(this.material, {
			uniforms: { ...(material.userData.uniforms || {}), ...this.uniforms },
			key: orbit ? 'asteroids-orbit' : 'asteroids',
			vertex: (src) => {
				src = inject(src, '#include <common>', /* glsl */ `
					varying vec3 vObjPos;
					attribute vec4 aSpin;
					uniform float uSpin;
					uniform float uPush;
					uniform vec3 uOrbitC;
					uniform float uOrbit;
					mat3 rotAxis(vec3 a, float t){ float c = cos(t), s = sin(t), k = 1.0 - c;
						return mat3(c + a.x*a.x*k, a.y*a.x*k + a.z*s, a.z*a.x*k - a.y*s,
						            a.x*a.y*k - a.z*s, c + a.y*a.y*k, a.z*a.y*k + a.x*s,
						            a.x*a.z*k + a.y*s, a.y*a.z*k - a.x*s, c + a.z*a.z*k); }`);
				src = inject(src, '#include <beginnormal_vertex>', /* glsl */ `
					mat3 R = rotAxis(normalize(aSpin.xyz - 0.5), uTime * uSpin * (0.3 + aSpin.w));
					objectNormal = R * objectNormal;`);
				src = inject(src, '#include <begin_vertex>', /* glsl */ `
					vObjPos = position + instanceMatrix[3].xyz * 0.37;
					transformed = R * transformed;`);
				src = src.replace('#include <project_vertex>', /* glsl */ `
					${orbitCode}
					vec4 ic = modelMatrix * vec4(instanceMatrix[3].xyz + shift, 1.0);
					float dist, along;
					vec3 away = cursorAway(ic.xyz, dist, along);
					float sc = length(instanceMatrix[0].xyz);
					float push = exp(-dist * dist / (2.0 + sc * sc * 4.0 + along * 0.05)) * (0.8 + uCursorVel * 2.0) * (1.5 + sc) * uPush;
					vec3 bob = vec3(sin(uTime * 0.21 + aSpin.x * 30.0), sin(uTime * 0.17 + aSpin.y * 30.0), sin(uTime * 0.19 + aSpin.z * 30.0)) * 0.25;
					vec4 mvPosition = vec4(transformed, 1.0);
					mvPosition = instanceMatrix * mvPosition;
					mvPosition.xyz += shift;
					mvPosition = modelMatrix * mvPosition;
					mvPosition.xyz += away * push + bob;
					mvPosition = viewMatrix * mvPosition;
					gl_Position = projectionMatrix * mvPosition;`);
				return src.replace('#include <worldpos_vertex>', `
					#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
						vec4 worldPosition = inverse(viewMatrix) * mvPosition;
					#endif`);
			},
			fragment: material.userData.fragmentPatch,
		});
		const matrix = new Matrix4();
		const quaternion = new Quaternion();
		const euler = new Euler();
		const position = new Vector3();
		const scale = new Vector3();
		for (let v = 0; v < variants; v++) {
			const geometry = createRockGeometry({ seed: seed * 13 + v * 7, detail, amp: 0.25, cuts: 6 + (v % 3), scale: [1, 0.8 + random() * 0.3, 0.9 + random() * 0.2], ...rock });
			const mesh = new InstancedMesh(geometry, this.material, perVariant);
			const spins = new Float32Array(perVariant * 4);
			for (let i = 0; i < perVariant; i++) {
				if (placer) placer(position, random);
				else position.set((random() - 0.5) * bounds.x, (random() - 0.5) * bounds.y, (random() - 0.5) * bounds.z);
				euler.set(random() * 6.28, random() * 6.28, random() * 6.28);
				quaternion.setFromEuler(euler);
				const size = sizeMin + random() ** 2.2 * (sizeMax - sizeMin);
				scale.set(size, size * (0.7 + random() * 0.5), size * (0.8 + random() * 0.4));
				matrix.compose(position, quaternion, scale);
				mesh.setMatrixAt(i, matrix);
				for (let k = 0; k < 4; k++) spins[i * 4 + k] = random();
			}
			geometry.setAttribute('aSpin', new InstancedBufferAttribute(spins, 4));
			mesh.frustumCulled = false;
			this.group.add(mesh);
			this.meshes.push(mesh);
		}
	}

	dispose() {
		for (const mesh of this.meshes) mesh.geometry.dispose();
		this.material.dispose();
	}
}

import { IcosahedronGeometry, Vector3 } from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { createPerlin, fbm, mulberry } from '../../core/scene-kit/noiseVolume.js';

/**
 * Roche procédurale : une sphère bosselée par du bruit, puis taillée par des plans tirés au hasard (des faces nettes
 * comme une pierre éclatée), avec un grain fin par-dessus. Chaque graine donne une roche différente.
 *
 *   const geometry = createRockGeometry({ seed: 3, cuts: 11, cutDepth: 0.46, flat: 1 });
 *   const rock = new Mesh(geometry, createStoneMaterial());
 *
 * Options :
 *   seed       graine                                                      (défaut 1)
 *   detail     finesse de la sphère de départ (5 ≈ 10 000 triangles)       (défaut 5)
 *   amp, freq  amplitude et fréquence des bosses                           (défaut 0.22, 1.3)
 *   ridged     arêtes vives ajoutées au bruit                              (défaut 0.12)
 *   cuts       nombre de plans de coupe                                    (défaut 7)
 *   cutDepth   distance des plans au centre (plus petit = plus taillée)    (défaut 0.62)
 *   cutJitter  variation de cette distance                                 (défaut 0.25)
 *   flat       1 = faces parfaitement planes, moins = coupes adoucies      (défaut 0.93)
 *   micro      grain fin                                                   (défaut 0.025)
 *   scale      étirement [x, y, z]                                         (défaut [1, 1, 1])
 */
export function createRockGeometry({ seed = 1, detail = 5, amp = 0.22, freq = 1.3, ridged = 0.12, cuts = 7, cutDepth = 0.62, cutJitter = 0.25, scale = [1, 1, 1], micro = 0.025, flat = 0.93 } = {}) {
	let geometry = new IcosahedronGeometry(1, detail);
	geometry.deleteAttribute('normal');
	geometry.deleteAttribute('uv');
	geometry = mergeVertices(geometry); // les sommets partagés bougent ensemble : pas de fissure entre les faces
	const noise = createPerlin(seed);
	const random = mulberry(seed * 31 + 7);
	const planes = [];
	for (let i = 0; i < cuts; i++) {
		planes.push({ normal: new Vector3(random() * 2 - 1, random() * 2 - 1, random() * 2 - 1).normalize(), distance: cutDepth + random() * cutJitter });
	}
	const position = geometry.attributes.position;
	const point = new Vector3();
	const direction = new Vector3();
	for (let i = 0; i < position.count; i++) {
		direction.fromBufferAttribute(position, i).normalize();
		let radius = 1 + fbm(noise, direction.x * freq + 3.1, direction.y * freq, direction.z * freq, 4) * amp;
		radius += ridged * (0.5 - Math.abs(noise(direction.x * freq * 2.2 + 9, direction.y * freq * 2.2, direction.z * freq * 2.2)));
		point.copy(direction).multiplyScalar(radius);
		// chaque plan rabote ce qui dépasse
		for (const plane of planes) {
			const d = point.dot(plane.normal);
			if (d > plane.distance) point.addScaledVector(plane.normal, -(d - plane.distance) * flat);
		}
		point.addScaledVector(direction, noise(point.x * 6 + 1, point.y * 6, point.z * 6) * micro);
		position.setXYZ(i, point.x * scale[0], point.y * scale[1], point.z * scale[2]);
	}
	geometry.computeVertexNormals();
	geometry.computeBoundingSphere();
	return geometry;
}

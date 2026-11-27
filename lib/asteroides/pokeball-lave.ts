// La Pokéball de lave, au centre de l'anneau d'astéroïdes (code du projet).
// Deux images GÉNÉRÉES PAR IA (Gemini) à la demande de l'utilisateur, cadrées pareil : ouverte et fermée
// (public/pokeball-lave/). Elles sont posées sur un carré toujours tourné vers la caméra (un « panneau »), au centre
// de la scène 3D : les roches de devant la cachent, celles de derrière sont cachées par elle.
//
// Les images ont un fond noir. Le shader fait deux choses :
// - DANS le cercle de la boule : l'image est opaque (elle cache ce qui est derrière) ;
// - HORS du cercle : la lueur et les braises de l'image sont AJOUTÉES à la scène (fusion additive), le noir
//   n'ajoute rien. Pas besoin de détourer les images.
// Le passage d'ouverte à fermée est un fondu entre les deux images (elles se superposent exactement).

import * as THREE from "three";

// Où est la boule dans l'image (fractions de l'image) : mesuré sur les deux images.
const CENTRE_IMAGE = [0.5, 0.503];
const RAYON_IMAGE = 0.395;

const SOMMETS = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENTS = /* glsl */ `
uniform sampler2D uOuverte;
uniform sampler2D uFermee;
uniform float uOuverture;   // 1 = ouverte, 0 = fermée
uniform float uApparition;  // 0 = invisible, 1 = visible
uniform float uTemps;
uniform vec2 uCentre;
uniform float uRayon;
varying vec2 vUv;

void main() {
  vec3 couleur = mix(texture2D(uFermee, vUv).rgb, texture2D(uOuverte, vUv).rgb, uOuverture);
  // Le magma respire : les parties les plus lumineuses palpitent doucement.
  float lumiere = max(couleur.r, max(couleur.g, couleur.b));
  couleur *= 1.0 + smoothstep(0.55, 1.0, lumiere) * 0.12 * sin(uTemps * 2.2);

  float distance = length(vUv - uCentre);
  // 1 dans la boule, 0 dehors, avec un bord adouci.
  float boule = smoothstep(uRayon + 0.006, uRayon - 0.006, distance);
  // Hors de la boule : on enlève le léger gris du fond (compression de l'image) et on éteint les bords du carré.
  vec3 lueur = max(couleur - 0.035, 0.0) * smoothstep(0.5, 0.42, distance);
  vec3 rgb = mix(lueur, couleur, boule);
  // Alpha prémultiplié : rgb est AJOUTÉ à ce qui est derrière, qui est gardé à (1 - alpha).
  // Dans la boule alpha = 1 (opaque), dehors alpha = 0 (ajout pur).
  gl_FragColor = vec4(rgb * uApparition, boule * uApparition);
}
`;

export function creerPokeballLave(rayon: number) {
  const chargeur = new THREE.TextureLoader();
  const uniformes = {
    uOuverte: { value: chargeur.load("/pokeball-lave/ouverte.webp") },
    uFermee: { value: chargeur.load("/pokeball-lave/fermee.webp") },
    uOuverture: { value: 1 },
    uApparition: { value: 0 },
    uTemps: { value: 0 },
    uCentre: { value: new THREE.Vector2(CENTRE_IMAGE[0], CENTRE_IMAGE[1]) },
    uRayon: { value: RAYON_IMAGE },
  };
  const materiau = new THREE.ShaderMaterial({
    vertexShader: SOMMETS,
    fragmentShader: FRAGMENTS,
    uniforms: uniformes,
    transparent: true,
    // Fusion « alpha prémultiplié » : résultat = couleur du shader + ce qui est derrière × (1 - alpha).
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  // Le carré : la boule occupe RAYON_IMAGE de sa largeur, il est donc plus grand qu'elle (la lueur déborde).
  const cote = rayon / RAYON_IMAGE;
  const geometrie = new THREE.PlaneGeometry(cote, cote);
  const panneau = new THREE.Mesh(geometrie, materiau);
  panneau.renderOrder = 5; // après les roches, avant les poussières

  return {
    objet: panneau,

    // À chaque image : face à la caméra, flottement léger, et l'état venu du défilement.
    mettreAJour(camera: THREE.Camera, temps: number, apparition: number, ouverture: number) {
      panneau.quaternion.copy(camera.quaternion);
      // Une légère oscillation sur elle-même, pour qu'elle ne paraisse pas collée à l'écran.
      panneau.rotateZ(Math.sin(temps * 0.6) * 0.04);
      panneau.position.y = Math.sin(temps * 1.1) * 0.12;
      // Elle grandit un peu en apparaissant.
      panneau.scale.setScalar(0.8 + 0.2 * apparition);
      panneau.visible = apparition > 0.01;
      uniformes.uApparition.value = apparition;
      uniformes.uOuverture.value = ouverture;
      uniformes.uTemps.value = temps;
    },

    liberer() {
      uniformes.uOuverte.value.dispose();
      uniformes.uFermee.value.dispose();
      geometrie.dispose();
      materiau.dispose();
    },
  };
}

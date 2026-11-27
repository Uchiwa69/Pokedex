// Fond de l'écran de fin : un anneau d'astéroïdes qui tourne autour de la Pokéball, dans un ciel de nébuleuse.
// Les briques (roches, matière basalte, champ en orbite, ciel, poussières) viennent de l'effet « Astéroïdes »
// fourni par l'utilisateur (licence MIT, fichier LICENSE) : dossiers core/, environments/ et particles/, REPRIS TELS
// QUELS. Ce fichier-ci est le code du projet : il assemble la scène (reprise de la démo de l'effet). Différences avec
// la démo : pas d'« objectif cinéma » (post-traitement lourd), la tonalité est faite par three.js ; le cœur rouge et
// les huit gros blocs sont retirés : la Pokéball de lave (pokeball-lave.ts) prend la place du cœur, DANS la scène,
// donc les roches passent vraiment devant et derrière elle, et la lumière rouge part d'elle.
//
// L'anneau n'est pas au milieu de l'écran mais entre le titre et le bouton de l'écran de fin : on décale l'image de
// la caméra (setViewOffset) pour que son centre tombe à cette place.

import * as THREE from "three";
import { bakeNoiseVolume } from "./core/scene-kit/noiseVolume.js";
import { CursorTracker, fogUniforms, updateSceneUniforms } from "./core/scene-kit/sceneUniforms.js";
import { AsteroidField } from "./environments/asteroids/AsteroidField.js";
import { createStoneMaterial } from "./environments/asteroids/stoneMaterial.js";
import { NebulaSky, SKY_PRESETS, applySkyPreset } from "./environments/nebula-sky/NebulaSky.js";
import { CursorDust } from "./particles/cursor-dust/CursorDust.js";
import { creerPokeballLave } from "./pokeball-lave";
import type { EtatFondFin } from "@/lib/pokeball/pose";

export type FondAsteroides = {
  // etat : centre de l'anneau en fractions d'écran, apparition et ouverture de la Pokéball (lib/pokeball/pose.ts).
  dessiner: (etat: EtatFondFin) => void;
  redimensionner: (largeur: number, hauteur: number) => void;
  liberer: () => void;
};

// Distance de la caméra au centre de l'anneau, et sa hauteur : la vue de la démo de l'effet.
const DISTANCE = 26;
const HAUTEUR = 9;

export function creerFondAsteroides(toile: HTMLCanvasElement): FondAsteroides {
  // Téléphone : un pixel de dessin par pixel CSS (le ciel est calculé pour chaque pixel).
  const tactile = window.matchMedia("(pointer: coarse)").matches;
  const rendu = new THREE.WebGLRenderer({ canvas: toile, antialias: true, powerPreference: "high-performance" });
  rendu.setPixelRatio(tactile ? 1 : Math.min(window.devicePixelRatio, 1.5));
  // ACES : la tonalité « cinéma » que faisait l'objectif de la démo.
  rendu.toneMapping = THREE.ACESFilmicToneMapping;
  rendu.toneMappingExposure = 1.1;
  // Le volume de bruit lu par tous les shaders de l'effet (ciel, pierre), calculé une fois par la carte graphique.
  fogUniforms.tNoise.value = bakeNoiseVolume(rendu);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 6000);
  scene.add(camera);
  // Le curseur repousse les roches (il suit la souris sur toute la fenêtre : le canvas, lui, ne capte rien).
  const curseur = new CursorTracker();

  // Le ciel : la nébuleuse « espace » de l'effet.
  const ciel = new NebulaSky({ nebAmt: 0.7 });
  applySkyPreset(ciel, SKY_PRESETS.espace);
  scene.add(ciel.group);

  // La matière basalte et l'anneau : réglages de la démo, liseré rouge (la lumière qui vient de la Pokéball).
  const basalte = createStoneMaterial({
    color: "#3b3b40",
    roughness: 0.8,
    bump: 0.07,
    bumpFreq: 1.9,
    bump2: 0.016,
    bumpFreq2: 11,
    variation: 0.38,
    varFreq: 0.65,
    cavity: "#070708",
    cavityAmt: 0.55,
    cracks: 0.6,
    rim: "#3a0c08",
    rimPow: 3,
    key: "basalte",
  });
  const anneau = new AsteroidField({
    count: tactile ? 320 : 520,
    seed: 9,
    material: basalte,
    sizeMin: 0.15,
    sizeMax: 1.9,
    variants: 5,
    detail: 4,
    orbit: { center: [0, 0, 0], speed: 0.12 },
    // Réparties sur un disque épais, entre 9 et 21 du centre : le trou du milieu est pour la Pokéball.
    placer: (p: THREE.Vector3, hasard: () => number) => {
      const angle = hasard() * Math.PI * 2;
      const r = 9 + hasard() * 12 + (hasard() - 0.5) * 3;
      p.set(Math.cos(angle) * r, (hasard() - 0.5) * (1.2 + r * 0.08), Math.sin(angle) * r);
    },
  });
  scene.add(anneau.group);

  // Les lumières : une source rouge au centre (la Pokéball de lave éclaire l'intérieur de l'anneau), une lumière
  // froide en hauteur, un peu de lumière ambiante.
  const lueurCentre = new THREE.PointLight("#ff2410", 520, 24, 2);
  scene.add(lueurCentre);
  // La même lueur se diffuse dans le ciel autour du centre.
  fogUniforms.uGlowPos.value.set(0, 0, 0);
  fogUniforms.uGlowColor.value.set("#ff2412").multiplyScalar(0.16);
  scene.add(new THREE.AmbientLight("#1a2430", 0.5));
  const cle = new THREE.DirectionalLight("#c8d6ff", 1.4);
  cle.position.set(-8, 10, 6);
  scene.add(cle);

  // Des poussières rouges en disque, qui tournent avec l'anneau et fuient le curseur.
  const poussiere = new CursorDust({
    mode: "swirl",
    count: 900,
    seed: 21,
    spread: [7.5, 1.6, 7.5],
    size: 0.03,
    color: "#ff3a22",
    color2: "#ffb08a",
    intensity: 3,
    speed: 0.6,
    twinkle: 0.6,
  });
  scene.add(poussiere.points);

  // La Pokéball de lave, au centre (rayon 1,8 : le trou de l'anneau commence vers 7,5).
  const pokeball = creerPokeballLave(1.8);
  scene.add(pokeball.objet);

  const taille = new THREE.Vector2();
  const naissance = performance.now();
  let precedent = naissance;

  return {
    dessiner(etat) {
      const maintenant = performance.now();
      const temps = (maintenant - naissance) / 1000;
      const ecoule = Math.min(1 / 20, (maintenant - precedent) / 1000);
      precedent = maintenant;

      // La caméra tourne lentement autour de l'anneau en le regardant d'un peu au-dessus (comme la démo).
      // Écran en hauteur (téléphone) : la caméra recule, sinon on ne voit qu'un morceau de l'anneau.
      const recul = Math.max(1, 1 / Math.sqrt(camera.aspect));
      const angle = temps * 0.05;
      camera.position.set(
        Math.sin(angle) * DISTANCE * recul,
        (HAUTEUR + Math.sin(temps * 0.13) * 2) * recul,
        Math.cos(angle) * DISTANCE * recul,
      );
      camera.lookAt(0, 0, 0);
      // Décalage de l'image : le centre de l'anneau passe du milieu de l'écran à la place de la Pokéball.
      // (fx vers la droite → l'image glisse vers la gauche, d'où le signe moins ; fy vers le haut → vers le bas.)
      camera.setViewOffset(taille.x, taille.y, -etat.fx * taille.x, etat.fy * taille.y, taille.x, taille.y);
      camera.updateMatrixWorld();

      pokeball.mettreAJour(camera, temps, etat.apparition, etat.ouverture);
      // La lumière rouge vient de la Pokéball : plus forte quand elle est ouverte, et elle palpite comme le magma.
      lueurCentre.intensity = 520 * etat.apparition * (0.45 + 0.55 * etat.ouverture) * (1 + Math.sin(temps * 2.2) * 0.08);

      ciel.update(camera);
      curseur.update(ecoule);
      updateSceneUniforms({ time: temps, camera, cursor: curseur, height: taille.y * rendu.getPixelRatio(), pixelRatio: rendu.getPixelRatio() });
      rendu.render(scene, camera);
    },

    redimensionner(largeur, hauteur) {
      rendu.setSize(largeur, hauteur, false);
      taille.set(largeur, hauteur);
      camera.aspect = largeur / hauteur;
      camera.updateProjectionMatrix();
    },

    liberer() {
      anneau.dispose();
      basalte.dispose();
      ciel.dispose();
      poussiere.dispose();
      pokeball.liberer();
      fogUniforms.tNoise.value?.dispose();
      rendu.dispose();
    },
  };
}

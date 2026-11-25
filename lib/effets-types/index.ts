// Effets holographiques par type, pour la carte 3D de la fiche (components/Carte3D.tsx).
// Chaque type est UNE fonction GLSL `effetType(...)` rangée dans son fichier (dossier types/) ; les outils
// partagés (bruit, hachage, palette, zones calmes) sont dans commun.ts. On n'assemble et on ne compile que
// le programme du type affiché.
// L'effet est une couche À PART, posée entre la face et le reflet d'origine : le reflet de Carte3D n'est
// pas modifié, et à uForce = 0 la carte est exactement celle d'avant.

import type { NomType } from "@/lib/types";
import { GLSL_COMMUN } from "./commun";
import { GLSL_ACIER } from "./types/acier";
import { GLSL_COMBAT } from "./types/combat";
import { GLSL_DRAGON } from "./types/dragon";
import { GLSL_EAU } from "./types/eau";
import { GLSL_ELECTRIK } from "./types/electrik";
import { GLSL_FEE } from "./types/fee";
import { GLSL_FEU } from "./types/feu";
import { GLSL_GLACE } from "./types/glace";
import { GLSL_INSECTE } from "./types/insecte";
import { GLSL_NORMAL } from "./types/normal";
import { GLSL_PLANTE } from "./types/plante";
import { GLSL_POISON } from "./types/poison";
import { GLSL_PSY } from "./types/psy";
import { GLSL_ROCHE } from "./types/roche";
import { GLSL_SOL } from "./types/sol";
import { GLSL_SPECTRE } from "./types/spectre";
import { GLSL_TENEBRES } from "./types/tenebres";
import { GLSL_VOL } from "./types/vol";

// Table de correspondance : clé anglaise du type (celle de la PokéAPI) → sa fonction GLSL.
export const EFFETS_PAR_TYPE: Record<NomType, string> = {
  normal: GLSL_NORMAL,
  fire: GLSL_FEU,
  water: GLSL_EAU,
  electric: GLSL_ELECTRIK,
  grass: GLSL_PLANTE,
  ice: GLSL_GLACE,
  fighting: GLSL_COMBAT,
  poison: GLSL_POISON,
  ground: GLSL_SOL,
  flying: GLSL_VOL,
  psychic: GLSL_PSY,
  bug: GLSL_INSECTE,
  rock: GLSL_ROCHE,
  ghost: GLSL_SPECTRE,
  dragon: GLSL_DRAGON,
  dark: GLSL_TENEBRES,
  steel: GLSL_ACIER,
  fairy: GLSL_FEE,
};

// Programme des sommets : il place la surface à l'écran et transmet la position sur la carte (uv, de 0 à 1).
const SOMMETS = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Un rectangle en coordonnées de la carte : [gauche, bas, droite, haut], de 0 à 1, origine en bas à gauche.
type Rectangle = [number, number, number, number];

// Les zones où l'effet s'efface, pour laisser lire la carte. Elles sont calées sur les dessins de
// lib/carte3d.ts (720 × 1000 px ; attention, un canvas compte de haut en bas, la carte de bas en haut).
export type ZonesCarte = { textes: [Rectangle, Rectangle]; illustration: Rectangle };

export const ZONES_FACE: ZonesCarte = {
  textes: [
    [0.05, 0.87, 0.95, 0.96], // numéro et types, en haut
    [0.05, 0.05, 0.95, 0.24], // nom et mesures, en bas
  ],
  illustration: [0.14, 0.28, 0.86, 0.8],
};
export const ZONES_DOS: ZonesCarte = {
  textes: [
    [0.15, 0.09, 0.85, 0.18], // le mot « POKÉDEX »
    [0.15, 0.09, 0.85, 0.18], // (le programme attend deux zones : la même est répétée)
  ],
  illustration: [0.34, 0.43, 0.66, 0.65], // la Pokéball
};

// Les réglages lus par le programme (« uniformes »). Les valeurs sont de simples tableaux de nombres :
// three.js les accepte tels quels, ce fichier n'a donc pas besoin de charger la bibliothèque.
export function creerUniformes(teinte: [number, number, number], zones: ZonesCarte) {
  return {
    uTemps: { value: 0 }, // secondes écoulées
    uProportions: { value: 0.72 }, // largeur / hauteur de la carte
    uInclinaison: { value: [0, 0] }, // de -1 à 1 : comment la carte est tournée par rapport au regard
    uTeinte: { value: teinte }, // couleur du type
    uForce: { value: 1 }, // 0 = aucun effet (la carte d'origine)
    uQualite: { value: 1 }, // de 0 à 1 : moins de détails sur les appareils modestes
    uCalme: { value: 0 }, // 1 = animations réduites, l'effet se fige
    uZonesCalmes: { value: zones.textes.flat() },
    uZoneIllustration: { value: zones.illustration },
    uAttenuationZones: { value: 0.85 },
    // Les trois suivants servent au mode « éclat » plein écran des fonctions (prévu pour les filtres de
    // l'accueil). Sur la carte, ils gardent ces valeurs : éclat terminé, mode carte.
    uProgression: { value: 1 },
    uOrigine: { value: [0.5, 0.5] },
    uModeEclat: { value: 0 },
  };
}

// Assemble le programme complet d'un type : outils communs + fonction du type + calcul final du pixel.
export function assemblerEffet(type: NomType) {
  const fragmentShader = /* glsl */ `
varying vec2 vUv;
${GLSL_COMMUN}
${EFFETS_PAR_TYPE[type]}

void main() {
  vec4 effet = effetType(vUv, uProportions, uTemps, uInclinaison, uProgression, uOrigine, uTeinte);
  // L'effet s'efface sur les textes et s'allège sur l'illustration.
  float lisible = calculerAttenuationLisibilite(vUv, 0.0);
  // Mélange additif : l'écran reçoit couleur × alpha, AJOUTÉS à la carte. La couleur est déjà multipliée
  // par son intensité et l'alpha vaut cette intensité : elle compte donc deux fois. Les zones faibles
  // disparaissent, seuls les temps forts ressortent, et la carte n'est jamais noyée.
  gl_FragColor = vec4(effet.rgb * lisible * uForce, clamp(effet.a * lisible * uForce, 0.0, 1.0));
}
`;
  return { vertexShader: SOMMETS, fragmentShader };
}

// Même fonction du type, mais pour l'ÉCLAT plein écran des filtres de l'accueil (lib/effets-types/eclat.ts) :
// pas de zones calmes, et le pixel est écrit pour être posé PAR-DESSUS la page.
export function assemblerEclat(type: NomType) {
  const fragmentShader = /* glsl */ `
varying vec2 vUv;
${GLSL_COMMUN}
${EFFETS_PAR_TYPE[type]}

uniform float uEchelle;

void main() {
  // Les fonctions font grandir l'onde jusqu'à environ une hauteur d'écran autour de l'origine. Sur un écran
  // large, elle s'éteindrait avant les bords : on resserre donc les distances autour de l'origine (uEchelle,
  // calculée dans eclat.ts) pour que le coin le plus éloigné soit atteint lui aussi.
  vec2 position = uOrigine + (vUv - uOrigine) * uEchelle;
  vec4 effet = effetType(position, uProportions, uTemps, uInclinaison, uProgression, uOrigine, uTeinte);
  float force = clamp(effet.a * uForce, 0.0, 1.0);
  // Le navigateur pose le canvas sur la page ainsi : page × (1 − alpha) + couleur. La couleur ajoute donc
  // de la lumière, et l'alpha (volontairement faible : l'intensité au carré) assombrit à peine la page,
  // qui reste visible pendant l'éclat.
  gl_FragColor = vec4(effet.rgb * force, force * force);
}
`;
  return { vertexShader: SOMMETS, fragmentShader };
}

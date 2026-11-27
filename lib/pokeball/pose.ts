// La « pose » de la Pokéball 3D de l'accueil : un simple objet partagé.
// - components/CompagnonPokeball.tsx le fait varier avec le défilement (GSAP ScrollTrigger) ;
// - components/three/ScenePokeball.tsx le lit à chaque image pour placer la Pokéball.
// Le défilement et la 3D ne se connaissent donc pas : ils ne partagent que cet objet. Ce n'est PAS un état React
// (il change 60 fois par seconde : un état relancerait le rendu à chaque fois).
// Idée reprise du site « Rewind » d'un camarade (objet `rig`).

export type PosePokeball = {
  /** Position horizontale, en fraction de la largeur de l'écran (0 = milieu, 0,5 = bord droit). */
  fx: number;
  /** Position verticale, en fraction de la hauteur de l'écran (0 = milieu, 0,5 = bord haut). */
  fy: number;
  /** Diamètre, en fraction de la hauteur de l'écran. */
  taille: number;
  /** Rotations, en radians. */
  rx: number;
  ry: number;
  rz: number;
  /** 0 = fermée, 1 = grande ouverte (la lumière sort). */
  ouverture: number;
  /** Opacité du calque : 0 = invisible (la scène 3D est alors mise en pause). */
  fondu: number;
};

type Poses = Record<"titre" | "sortie" | "entree" | "ouverte" | "fermee", PosePokeball>;

// Une pose par moment de la page. Les positions sont des fractions d'écran : elles s'adaptent à toutes les tailles.
// Écran large : la Pokéball est à droite du titre, sans le recouvrir (du blanc derrière un texte blanc serait illisible).
export const POSES_LARGE: Poses = {
  titre: { fx: 0.37, fy: 0.27, taille: 0.22, rx: 0.25, ry: -0.55, rz: 0.18, ouverture: 0, fondu: 1 },
  // Elle roule vers le haut et s'efface quand le carrousel prend la place.
  sortie: { fx: 0.43, fy: 0.5, taille: 0.16, rx: 0.25, ry: -0.2, rz: -2.6, ouverture: 0, fondu: 0 },
  // Fin de page : elle apparaît ouverte à travers la brûlure, au milieu de l'anneau d'astéroïdes, entre le titre
  // « Attrapez-les tous ! » et le bouton…
  entree: { fx: 0, fy: 0.08, taille: 0.14, rx: 0.3, ry: 1.6, rz: 0, ouverture: 1, fondu: 0 },
  ouverte: { fx: 0, fy: 0.08, taille: 0.22, rx: 0.3, ry: 0.35, rz: 0, ouverture: 1, fondu: 1 },
  // … puis elle se referme tout en bas de la page : c'est la capture.
  fermee: { fx: 0, fy: 0.08, taille: 0.2, rx: 0.2, ry: -0.3, rz: 0.08, ouverture: 0, fondu: 1 },
};

// Téléphone : plus petite, à droite du titre (qui tient sur deux lignes).
export const POSES_ETROITE: Poses = {
  titre: { fx: 0.39, fy: 0.26, taille: 0.085, rx: 0.25, ry: -0.55, rz: 0.18, ouverture: 0, fondu: 1 },
  sortie: { fx: 0.42, fy: 0.45, taille: 0.08, rx: 0.25, ry: -0.2, rz: -2.6, ouverture: 0, fondu: 0 },
  entree: { fx: 0, fy: 0.08, taille: 0.12, rx: 0.3, ry: 1.6, rz: 0, ouverture: 1, fondu: 0 },
  ouverte: { fx: 0, fy: 0.08, taille: 0.2, rx: 0.3, ry: 0.35, rz: 0, ouverture: 1, fondu: 1 },
  fermee: { fx: 0, fy: 0.08, taille: 0.18, rx: 0.2, ry: -0.3, rz: 0.08, ouverture: 0, fondu: 1 },
};

// La pose en cours (modifiée en place par GSAP).
export const pose: PosePokeball = { ...POSES_LARGE.titre };

// Position du pointeur, de -1 à 1 : la Pokéball se tourne légèrement vers lui.
export const pointeur = { x: 0, y: 0 };

// Le fond de l'écran de fin (anneau d'astéroïdes, lib/asteroides/scene.ts), lui aussi piloté par le défilement :
// visibilite va de 0 à 1 pendant que l'écran commence à brûler ; fx et fy = le centre de l'anneau, c'est-à-dire la
// place de la Pokéball à la fin (fractions d'écran, comme la pose).
export const fondFin = { visibilite: 0, fx: 0, fy: 0 };

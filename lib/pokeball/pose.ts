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

type Poses = Record<"titre" | "sortie", PosePokeball>;

// Une pose par moment de la page. Les positions sont des fractions d'écran : elles s'adaptent à toutes les tailles.
// Écran large : la Pokéball est à droite du titre, sans le recouvrir (du blanc derrière un texte blanc serait illisible).
export const POSES_LARGE: Poses = {
  titre: { fx: 0.37, fy: 0.27, taille: 0.165, rx: 0.25, ry: -0.55, rz: 0.18, ouverture: 0, fondu: 1 },
  // Elle roule vers le haut et s'efface quand le carrousel prend la place.
  sortie: { fx: 0.43, fy: 0.5, taille: 0.12, rx: 0.25, ry: -0.2, rz: -2.6, ouverture: 0, fondu: 0 },
};

// Téléphone : plus petite, à droite du titre (qui tient sur deux lignes).
export const POSES_ETROITE: Poses = {
  titre: { fx: 0.39, fy: 0.26, taille: 0.068, rx: 0.25, ry: -0.55, rz: 0.18, ouverture: 0, fondu: 1 },
  sortie: { fx: 0.42, fy: 0.45, taille: 0.064, rx: 0.25, ry: -0.2, rz: -2.6, ouverture: 0, fondu: 0 },
};

// La pose en cours (modifiée en place par GSAP).
export const pose: PosePokeball = { ...POSES_LARGE.titre };

// Position du pointeur, de -1 à 1 : la Pokéball se tourne légèrement vers lui.
export const pointeur = { x: 0, y: 0 };

// L'écran de fin : l'anneau d'astéroïdes et, en son centre, la Pokéball de lave (lib/asteroides/scene.ts). La
// Pokéball 3D ci-dessus ne sert qu'en haut de l'accueil.
// - visibilite (0 à 1) : le fond ; apparition (0 à 1) : la Pokéball de lave ; ouverture (1 = ouverte, 0 = fermée).
//   Les trois sont écrits par SequenceFeu à chaque image, d'après la MÊME progression que la brûlure ;
// - fx, fy : le centre de l'anneau = la place de la Pokéball, en fractions d'écran (0 = milieu, 0,5 = bord) : au
//   milieu, entre le titre « Attrapez-les tous ! » et le bouton ;
// - dessiner : fourni par FondAsteroides, appelé par SequenceFeu juste après. Ainsi le fond n'a pas de boucle à lui :
//   il ne vit que pendant la séquence de feu (enVue = la séquence est à l'écran).
export type EtatFondFin = { visibilite: number; apparition: number; ouverture: number; fx: number; fy: number };
export const fondFin: EtatFondFin & { dessiner: ((enVue: boolean) => void) | null } = {
  visibilite: 0,
  apparition: 0,
  ouverture: 1,
  fx: 0,
  fy: 0.08,
  dessiner: null,
};

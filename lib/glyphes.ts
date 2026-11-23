// Un petit symbole ORIGINAL par type (formes géométriques simples, dessinées pour ce projet).
// Chaque symbole est le tracé d'un <path> SVG dans une grille de 24 × 24.
// Il sert deux fois : comme icône dans le filtre par type, et comme « particule » de l'effet
// qui jaillit sur l'écran quand on choisit un type (components/EffetType.tsx).

import type { NomType } from "@/lib/types";

// Façon dont les symboles se déplacent (une animation CSS par mouvement, dans app/globals.css) :
// jet (jaillit de la tuile), pluie (tombe vite, en biais), montee (s'élève en ondulant), flotte (descend
// lentement en se balançant), scintille (apparaît et disparaît sur place), orbite (tourne autour de la
// tuile), envol (file vers le haut en diagonale), traverse (zigzague d'un bord à l'autre), lourde (tombe et rebondit).
export type Mouvement = "jet" | "pluie" | "montee" | "flotte" | "scintille" | "orbite" | "envol" | "traverse" | "lourde";

// Grand mouvement joué derrière les symboles : vague (lueur qui monte du bas), foudre (éclairs),
// rafale (traits de lumière en diagonale), vignette (bords de l'écran teintés), reflet (bande brillante).
export type Fond = "vague" | "foudre" | "rafale" | "vignette" | "reflet";

// La « recette » de l'effet d'un type : chaque type combine différemment ces ingrédients.
type Glyphe = {
  trace: string; // le symbole
  particules: Mouvement;
  nombre: number; // nombre de symboles
  duree: number; // durée d'un symbole, en millisecondes
  fond: Fond | null;
  anneaux: number; // ondes circulaires partant de la tuile
};

export const GLYPHES: Record<NomType, Glyphe> = {
  normal: { particules: "jet", nombre: 12, duree: 900, fond: null, anneaux: 2, trace: "M12 4a8 8 0 1 0 0 16a8 8 0 0 0 0-16zm0 4a4 4 0 1 1 0 8a4 4 0 0 1 0-8z" },
  fire: { particules: "montee", nombre: 18, duree: 1000, fond: "vague", anneaux: 0, trace: "M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-4 2-7c2 1 3 3 3 5c1-2 2-5 1-10z" },
  water: { particules: "pluie", nombre: 20, duree: 620, fond: null, anneaux: 3, trace: "M12 2c4 5 7 8.5 7 12a7 7 0 0 1-14 0c0-3.5 3-7 7-12z" },
  electric: { particules: "scintille", nombre: 14, duree: 520, fond: "foudre", anneaux: 0, trace: "M13 2L4 14h6l-1 8l9-12h-6l1-8z" },
  grass: { particules: "flotte", nombre: 14, duree: 1300, fond: null, anneaux: 0, trace: "M20 4C10 4 4 9 4 16c0 1.5.3 2.8.8 4C6 14 10 10 16 8c-5 3-8 7-9 12c7 1 13-4 13-16z" },
  ice: { particules: "flotte", nombre: 18, duree: 1500, fond: "vignette", anneaux: 0, trace: "M12 2l2.5 5.7L20.7 7l-3.7 5l3.7 5l-6.2-.7L12 22l-2.5-5.7L3.3 17L7 12L3.3 7l6.2.7z" },
  fighting: { particules: "jet", nombre: 14, duree: 650, fond: null, anneaux: 3, trace: "M12 2l2 6l6-2l-4 5l4 5l-6-2l-2 6l-2-6l-6 2l4-5l-4-5l6 2z" },
  poison: { particules: "montee", nombre: 11, duree: 1300, fond: "vague", anneaux: 0, trace: "M12 3a6 6 0 0 1 6 6c0 3-2 4-2 7H8c0-3-2-4-2-7a6 6 0 0 1 6-6zM9 18h6v2a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z" },
  ground: { particules: "lourde", nombre: 12, duree: 800, fond: "vague", anneaux: 0, trace: "M3 8h18v3H3zM5 13h14v3H5zM8 18h8v3H8z" },
  flying: { particules: "envol", nombre: 14, duree: 800, fond: "rafale", anneaux: 0, trace: "M3 14c5 0 9-2 12-7c1 3 0 6-2 8c3 0 5-1 7-3c-1 6-6 9-11 9c-3 0-5-2-6-7z" },
  psychic: { particules: "orbite", nombre: 12, duree: 1300, fond: null, anneaux: 4, trace: "M12 5c5 0 9 4 10 7c-1 3-5 7-10 7S3 15 2 12c1-3 5-7 10-7zm0 3a4 4 0 1 0 0 8a4 4 0 0 0 0-8z" },
  bug: { particules: "traverse", nombre: 12, duree: 1100, fond: null, anneaux: 0, trace: "M12 3a3 3 0 0 1 3 3h2v2h-1.3c.8 1.2 1.3 2.6 1.3 4h2v2h-2.2A6 6 0 0 1 6.2 14H4v-2h2c0-1.4.5-2.8 1.3-4H6V6h3a3 3 0 0 1 3-3z" },
  rock: { particules: "lourde", nombre: 9, duree: 750, fond: null, anneaux: 1, trace: "M7 3h8l6 7l-3 10H6L3 11z" },
  ghost: { particules: "scintille", nombre: 8, duree: 1100, fond: "vignette", anneaux: 0, trace: "M12 2a7 7 0 0 1 7 7v12l-2.5-2l-2.2 2L12 19l-2.3 2l-2.2-2L5 21V9a7 7 0 0 1 7-7zM9.5 8a1.5 1.5 0 1 0 0 3a1.5 1.5 0 0 0 0-3zm5 0a1.5 1.5 0 1 0 0 3a1.5 1.5 0 0 0 0-3z" },
  dragon: { particules: "orbite", nombre: 10, duree: 1000, fond: null, anneaux: 2, trace: "M5 3c7 0 14 5 14 13c0 2-1 4-2 5c0-6-4-10-9-11l3-2C9 6 7 5 5 3z" },
  dark: { particules: "flotte", nombre: 8, duree: 1500, fond: "vignette", anneaux: 0, trace: "M15 2a10 10 0 1 0 7 15A8 8 0 0 1 15 2z" },
  steel: { particules: "jet", nombre: 10, duree: 800, fond: "reflet", anneaux: 1, trace: "M12 2l8.7 5v10L12 22l-8.7-5V7zm0 6a4 4 0 1 0 0 8a4 4 0 0 0 0-8z" },
  fairy: { particules: "scintille", nombre: 20, duree: 700, fond: null, anneaux: 1, trace: "M12 2c1 5 3 7 10 10c-7 3-9 5-10 10c-1-5-3-7-10-10c7-3 9-5 10-10z" },
};

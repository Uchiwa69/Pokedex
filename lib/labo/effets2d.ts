// PROTOTYPE (branche feature/pokemon-2d-attack-animations) — choix de l'effet visuel d'une attaque.
// Fonctions PURES : à partir du type, de la catégorie et de la puissance d'une attaque, elles renvoient
// une « recette » (couleurs, forme des particules, trajectoire, impact). Aucun dessin ici : le dessin
// est fait par lib/labo/moteur2d.ts. Cette séparation permet de tester les choix avec vitest.

import type { CategorieAttaque } from "@/lib/conversion";
import type { NomType } from "@/lib/types";

// Comment l'effet va de l'attaquant à la cible.
export type Trajectoire =
  | "projectile" // une boule avec une traînée
  | "jet" // un flux continu, légèrement en cloche
  | "rayon" // un faisceau rectiligne
  | "ciel" // frappe venue du haut de l'écran (foudre, chute de rochers)
  | "nuee" // beaucoup de petits éléments sur des trajectoires courbes
  | "spirale" // un orbe qui avance en tournant
  | "onde" // des anneaux qui se propagent
  | "sol" // éruption sous la cible
  | "contact" // l'attaquant se rue sur la cible
  | "aura"; // effet autour du lanceur (attaques de statut)

export type FormeParticule = "rond" | "feuille" | "trait" | "cristal" | "etoile" | "roche" | "bulle";
export type StyleImpact = "explosion" | "eclaboussure" | "eclats" | "anneaux" | "nuage" | "aucun";

export type Recette = {
  couleurs: string[]; // de la plus claire à la plus foncée
  forme: FormeParticule;
  trajectoire: Trajectoire;
  impact: StyleImpact;
  gravite: number; // pixels/s² : négatif = monte (flammes), positif = retombe (eau, roches)
  additif: boolean; // true : les couleurs s'additionnent (effet lumineux) ; false : matière opaque
  intensite: number; // 0,6 à 1,4 selon la puissance : nombre de particules, force de la secousse
  touche: boolean; // false pour une attaque de statut : la cible ne recule pas
};

// L'« élément » de chaque type : sa palette, sa matière, et sa trajectoire signature (attaque spéciale).
type Element = Pick<Recette, "couleurs" | "forme" | "trajectoire" | "impact" | "gravite" | "additif">;

export const ELEMENTS: Record<NomType, Element> = {
  normal: { couleurs: ["#ffffff", "#f5efd8", "#d6cfa8"], forme: "etoile", trajectoire: "projectile", impact: "eclats", gravite: 0, additif: true },
  fire: { couleurs: ["#fff7c2", "#ffb347", "#ff6a00", "#e02900"], forme: "rond", trajectoire: "projectile", impact: "explosion", gravite: -90, additif: true },
  water: { couleurs: ["#e0f7ff", "#7dd3fc", "#3b82f6"], forme: "bulle", trajectoire: "jet", impact: "eclaboussure", gravite: 420, additif: true },
  electric: { couleurs: ["#ffffff", "#fde047", "#facc15"], forme: "trait", trajectoire: "ciel", impact: "eclats", gravite: 0, additif: true },
  grass: { couleurs: ["#bbf7d0", "#4ade80", "#16a34a"], forme: "feuille", trajectoire: "nuee", impact: "eclaboussure", gravite: 200, additif: false },
  ice: { couleurs: ["#ffffff", "#cffafe", "#67e8f9"], forme: "cristal", trajectoire: "rayon", impact: "eclats", gravite: 80, additif: true },
  fighting: { couleurs: ["#ffffff", "#fdba74", "#ea580c"], forme: "trait", trajectoire: "onde", impact: "eclats", gravite: 0, additif: true },
  poison: { couleurs: ["#f0abfc", "#c026d3", "#701a75"], forme: "bulle", trajectoire: "jet", impact: "nuage", gravite: 260, additif: false },
  ground: { couleurs: ["#fde68a", "#d6a655", "#92602a"], forme: "roche", trajectoire: "sol", impact: "explosion", gravite: 700, additif: false },
  flying: { couleurs: ["#ffffff", "#dbeafe", "#93c5fd"], forme: "trait", trajectoire: "nuee", impact: "eclats", gravite: 0, additif: true },
  psychic: { couleurs: ["#ffe4f1", "#f472b6", "#db2777"], forme: "rond", trajectoire: "onde", impact: "anneaux", gravite: 0, additif: true },
  bug: { couleurs: ["#ecfccb", "#a3e635", "#65a30d"], forme: "rond", trajectoire: "nuee", impact: "eclats", gravite: 0, additif: false },
  rock: { couleurs: ["#e7e0c9", "#b6a136", "#78682a"], forme: "roche", trajectoire: "ciel", impact: "explosion", gravite: 900, additif: false },
  ghost: { couleurs: ["#e9d5ff", "#a855f7", "#581c87"], forme: "rond", trajectoire: "spirale", impact: "nuage", gravite: -30, additif: true },
  dragon: { couleurs: ["#e0e7ff", "#818cf8", "#6d28d9"], forme: "rond", trajectoire: "rayon", impact: "explosion", gravite: 0, additif: true },
  dark: { couleurs: ["#c4b5fd", "#6d28d9", "#1e1b4b"], forme: "rond", trajectoire: "spirale", impact: "nuage", gravite: 0, additif: false },
  steel: { couleurs: ["#ffffff", "#e2e8f0", "#94a3b8"], forme: "trait", trajectoire: "rayon", impact: "eclats", gravite: 0, additif: true },
  fairy: { couleurs: ["#fff1f9", "#f9a8d4", "#ec4899"], forme: "etoile", trajectoire: "nuee", impact: "anneaux", gravite: -20, additif: true },
};

// Puissance → intensité de l'effet, bornée entre 0,6 et 1,4. Une attaque sans puissance (statut) vaut 0,8.
export function calculerIntensite(puissance: number | null): number {
  if (puissance === null) return 0.8;
  return Math.min(1.4, Math.max(0.6, 0.5 + puissance / 130));
}

// La recette complète d'une attaque :
// - spéciale → la trajectoire signature du type (boule de feu, jet d'eau, foudre…) ;
// - physique → toujours « contact » (l'attaquant se rue sur la cible), dans la matière du type ;
// - statut   → une aura autour du lanceur, sans coup porté.
export function choisirRecette(type: NomType, categorie: CategorieAttaque, puissance: number | null): Recette {
  const element = ELEMENTS[type];
  const base = { ...element, intensite: calculerIntensite(puissance), touche: true };

  if (categorie === "physique") {
    // Les éclats partent du point d'impact : une matière « qui monte » (flammes) reste, une explosion aussi.
    return { ...base, trajectoire: "contact", impact: element.impact === "aucun" ? "eclats" : element.impact };
  }
  if (categorie === "statut") {
    return { ...base, trajectoire: "aura", impact: "aucun", touche: false };
  }
  return base;
}

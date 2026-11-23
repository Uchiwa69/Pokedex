// Fonctions PURES du combat : elles ne dépendent que de leurs arguments (pas de fetch, pas d'état).
// Le hasard lui-même est un ARGUMENT (un nombre entre 0 et 1 fourni par l'appelant) :
// avec le même hasard, on obtient toujours le même résultat, ce qui rend ces fonctions testables avec vitest.

import type { Attaque, Stats } from "@/lib/conversion";
import type { NomType } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Efficacité des types                                                */
/* ------------------------------------------------------------------ */

// Table d'efficacité : table[typeAttaque][typeDefenseur] = multiplicateur (2, 0.5 ou 0).
// Une case absente vaut 1 (efficacité normale).
export type TableEfficacite = Record<NomType, Partial<Record<NomType, number>>>;

// Efficacité d'une attaque contre un Pokémon : on MULTIPLIE les efficacités contre chacun de ses types.
// Exemple : Électrik contre Eau/Vol → 2 × 2 = 4 ; Sol contre Vol → 0.
export function calculerEfficacite(table: TableEfficacite, typeAttaque: NomType, typesDefenseur: NomType[]): number {
  return typesDefenseur.reduce((produit, type) => produit * (table[typeAttaque][type] ?? 1), 1);
}

// Phrase affichée dans le journal selon l'efficacité ("" si elle est normale).
export function messageEfficacite(efficacite: number): string {
  if (efficacite === 0) return "Ça n'a aucun effet…";
  if (efficacite > 1) return "C'est super efficace !";
  if (efficacite < 1) return "Ce n'est pas très efficace…";
  return "";
}

/* ------------------------------------------------------------------ */
/* Dégâts                                                              */
/* ------------------------------------------------------------------ */

export const NIVEAU = 50;
// Bonus quand l'attaque est du même type que le Pokémon qui l'utilise (« STAB » dans les jeux).
export const BONUS_MEME_TYPE = 1.5;

// Points de vie au niveau 50 (formule simplifiée des jeux).
export function calculerPvMax(pvDeBase: number): number {
  return Math.floor((2 * pvDeBase * NIVEAU) / 100) + NIVEAU + 10;
}

// L'aléa des dégâts : un hasard entre 0 et 1 devient un multiplicateur entre 0,85 et 1.
export function aleaDegats(hasard: number): number {
  return 0.85 + hasard * 0.15;
}

type DonneesDegats = {
  puissance: number;
  attaque: number; // statistique offensive de l'attaquant (attaque OU attaque spéciale)
  defense: number; // statistique défensive du défenseur (défense OU défense spéciale)
  memeType: boolean; // l'attaque est-elle d'un type de l'attaquant ?
  efficacite: number;
  alea: number; // entre 0,85 et 1
};

// Dégâts au niveau 50 :
// floor(((2 × 50 / 5 + 2) × puissance × A/D) / 50 + 2) × bonus de même type × efficacité × aléa
export function calculerDegats({ puissance, attaque, defense, memeType, efficacite, alea }: DonneesDegats): number {
  if (efficacite === 0) return 0;
  const base = Math.floor((((2 * NIVEAU) / 5 + 2) * puissance * (attaque / defense)) / 50 + 2);
  const total = base * (memeType ? BONUS_MEME_TYPE : 1) * efficacite * alea;
  // Une attaque qui touche fait toujours au moins 1 point de dégâts.
  return Math.max(1, Math.floor(total));
}

// L'attaque touche-t-elle ? precision est en % ; null = ne rate jamais.
export function attaqueTouche(precision: number | null, hasard: number): boolean {
  if (precision === null) return true;
  return hasard * 100 < precision;
}

/* ------------------------------------------------------------------ */
/* Déroulement d'un tour                                               */
/* ------------------------------------------------------------------ */

// Ce dont le moteur a besoin pour un combattant.
export type Combattant = {
  types: NomType[];
  stats: Stats;
};

export type ResultatAttaque = {
  rate: boolean;
  degats: number;
  efficacite: number;
};

// Résout une attaque complète : précision, choix des statistiques selon la catégorie, dégâts.
export function resoudreAttaque(
  attaquant: Combattant,
  defenseur: Combattant,
  attaque: Attaque,
  table: TableEfficacite,
  hasardPrecision: number,
  hasardDegats: number,
): ResultatAttaque {
  if (!attaqueTouche(attaque.precision, hasardPrecision)) {
    return { rate: true, degats: 0, efficacite: 1 };
  }

  const efficacite = calculerEfficacite(table, attaque.type, defenseur.types);
  // Attaque physique → attaque / défense ; attaque spéciale → atq. spé. / déf. spé.
  const speciale = attaque.categorie === "speciale";
  const degats = calculerDegats({
    puissance: attaque.puissance ?? 0,
    attaque: speciale ? attaquant.stats.attaqueSpe : attaquant.stats.attaque,
    defense: speciale ? defenseur.stats.defenseSpe : defenseur.stats.defense,
    memeType: attaquant.types.includes(attaque.type),
    efficacite,
    alea: aleaDegats(hasardDegats),
  });
  return { rate: false, degats, efficacite };
}

// Qui joue en premier ? Le plus rapide ; à vitesse égale, le hasard décide.
export function ordreDesTours(vitesseJoueur: number, vitesseAdversaire: number, hasard: number): "joueur" | "adversaire" {
  if (vitesseJoueur !== vitesseAdversaire) {
    return vitesseJoueur > vitesseAdversaire ? "joueur" : "adversaire";
  }
  return hasard < 0.5 ? "joueur" : "adversaire";
}

/* ------------------------------------------------------------------ */
/* Choix des attaques                                                  */
/* ------------------------------------------------------------------ */

// Attaque de secours pour un Pokémon qui n'a aucune attaque offensive (Métamorph…).
export const ATTAQUE_SECOURS: Attaque = {
  id: 165,
  nom: "struggle",
  nomFr: "Lutte",
  type: "normal",
  categorie: "physique",
  puissance: 50,
  precision: null,
  pp: 1,
  description: "Une attaque de la dernière chance.",
};

// Note d'une attaque offensive pour un Pokémon donné : puissance × bonus de type × précision.
export function noterAttaque(attaque: Attaque, typesPokemon: NomType[]): number {
  if (attaque.categorie === "statut" || attaque.puissance === null) return 0;
  const bonus = typesPokemon.includes(attaque.type) ? BONUS_MEME_TYPE : 1;
  const precision = (attaque.precision ?? 100) / 100; // null = ne rate jamais
  return attaque.puissance * bonus * precision;
}

// Choisit les 4 meilleures attaques offensives, avec au plus 2 attaques du même type
// (pour ne pas se retrouver sans solution face à un type résistant).
export function choisirMeilleuresAttaques(attaques: Attaque[], typesPokemon: NomType[]): Attaque[] {
  const offensives = attaques
    .filter((attaque) => noterAttaque(attaque, typesPokemon) > 0)
    // filter a créé un nouveau tableau : on peut le trier sans toucher à l'original. Meilleure note d'abord.
    .sort((a, b) => noterAttaque(b, typesPokemon) - noterAttaque(a, typesPokemon));

  const choisies: Attaque[] = [];
  for (const attaque of offensives) {
    if (choisies.length === 4) break;
    const duMemeType = choisies.filter((c) => c.type === attaque.type).length;
    if (duMemeType >= 2) continue;
    choisies.push(attaque);
  }
  return choisies;
}

// IA adverse simple : 7 fois sur 10 elle prend l'attaque qui ferait le plus de dégâts
// (en tenant compte des types), sinon une attaque au hasard — pour rester battable.
export function choisirAttaqueIA(
  attaques: Attaque[],
  attaquant: Combattant,
  defenseur: Combattant,
  table: TableEfficacite,
  hasard: number,
): Attaque {
  if (attaques.length === 0) return ATTAQUE_SECOURS;

  if (hasard < 0.7) {
    // Dégâts attendus de chaque attaque, sans aléa (hasards fixés) pour pouvoir les comparer.
    const degatsAttendus = (attaque: Attaque) =>
      resoudreAttaque(attaquant, defenseur, { ...attaque, precision: null }, table, 0, 0.5).degats *
      ((attaque.precision ?? 100) / 100);
    return attaques.reduce((meilleure, attaque) => (degatsAttendus(attaque) > degatsAttendus(meilleure) ? attaque : meilleure));
  }

  // hasard est entre 0,7 et 1 : on le ramène entre 0 et 1 pour tirer un indice du tableau.
  const indice = Math.min(attaques.length - 1, Math.floor(((hasard - 0.7) / 0.3) * attaques.length));
  return attaques[indice];
}

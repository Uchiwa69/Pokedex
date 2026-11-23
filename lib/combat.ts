// Fonctions PURES du combat : elles ne dépendent que de leurs arguments (pas de fetch, pas d'état,
// pas de hasard caché). Elles sont donc faciles à tester avec vitest.

import type { Attaque } from "@/lib/conversion";
import type { NomType } from "@/lib/types";

// Bonus quand l'attaque est du même type que le Pokémon qui l'utilise (« STAB » dans les jeux).
export const BONUS_MEME_TYPE = 1.5;

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

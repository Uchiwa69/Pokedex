// Table des 18 types de Pokémon.
// - La CLÉ reste en anglais, comme dans la PokéAPI ("fire").
// - Le LIBELLÉ français ne sert qu'à l'affichage.
// - Les CLASSES Tailwind sont écrites en entier : Tailwind lit le code source comme du texte,
//   il ne peut donc pas deviner une classe fabriquée à la volée (`bg-type-${type}` ne marcherait pas).

export const NOMS_TYPES = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
] as const;

// "normal" | "fire" | "water" | …
export type NomType = (typeof NOMS_TYPES)[number];

export type InfoType = {
  libelle: string;
  // Fond + couleur du texte du badge (texte foncé sur les types clairs, blanc sur les types sombres).
  classes: string;
  // Nom de la variable CSS de la couleur, pour la variable --teinte des cartes (phase 6).
  variable: string;
};

export const TYPES: Record<NomType, InfoType> = {
  normal: { libelle: "Normal", classes: "bg-type-normal text-encre", variable: "var(--color-type-normal)" },
  fire: { libelle: "Feu", classes: "bg-type-fire text-encre", variable: "var(--color-type-fire)" },
  water: { libelle: "Eau", classes: "bg-type-water text-encre", variable: "var(--color-type-water)" },
  electric: { libelle: "Électrik", classes: "bg-type-electric text-encre", variable: "var(--color-type-electric)" },
  grass: { libelle: "Plante", classes: "bg-type-grass text-encre", variable: "var(--color-type-grass)" },
  ice: { libelle: "Glace", classes: "bg-type-ice text-encre", variable: "var(--color-type-ice)" },
  fighting: { libelle: "Combat", classes: "bg-type-fighting text-white", variable: "var(--color-type-fighting)" },
  poison: { libelle: "Poison", classes: "bg-type-poison text-white", variable: "var(--color-type-poison)" },
  ground: { libelle: "Sol", classes: "bg-type-ground text-encre", variable: "var(--color-type-ground)" },
  flying: { libelle: "Vol", classes: "bg-type-flying text-encre", variable: "var(--color-type-flying)" },
  psychic: { libelle: "Psy", classes: "bg-type-psychic text-encre", variable: "var(--color-type-psychic)" },
  bug: { libelle: "Insecte", classes: "bg-type-bug text-encre", variable: "var(--color-type-bug)" },
  rock: { libelle: "Roche", classes: "bg-type-rock text-encre", variable: "var(--color-type-rock)" },
  ghost: { libelle: "Spectre", classes: "bg-type-ghost text-white", variable: "var(--color-type-ghost)" },
  dragon: { libelle: "Dragon", classes: "bg-type-dragon text-white", variable: "var(--color-type-dragon)" },
  dark: { libelle: "Ténèbres", classes: "bg-type-dark text-white", variable: "var(--color-type-dark)" },
  steel: { libelle: "Acier", classes: "bg-type-steel text-encre", variable: "var(--color-type-steel)" },
  fairy: { libelle: "Fée", classes: "bg-type-fairy text-encre", variable: "var(--color-type-fairy)" },
};

// Garde de type : vérifie qu'une chaîne quelconque (venue de l'API ou de l'adresse) est bien un type connu.
export function estUnType(valeur: string): valeur is NomType {
  return (NOMS_TYPES as readonly string[]).includes(valeur);
}

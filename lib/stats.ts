import type { Stats } from "@/lib/conversion";

// Les 6 statistiques dans l'ordre d'affichage, avec leur libellé français.
// `keyof Stats` garantit que chaque clé existe vraiment dans le type Stats.
export const LIBELLES_STATS: { cle: keyof Stats; libelle: string }[] = [
  { cle: "pv", libelle: "PV" },
  { cle: "attaque", libelle: "Attaque" },
  { cle: "defense", libelle: "Défense" },
  { cle: "attaqueSpe", libelle: "Atq. Spé." },
  { cle: "defenseSpe", libelle: "Déf. Spé." },
  { cle: "vitesse", libelle: "Vitesse" },
];

// Valeur maximale possible d'une statistique de base dans les jeux.
export const STAT_MAX = 255;

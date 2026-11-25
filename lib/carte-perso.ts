// Carte holographique PERSONNALISÉE (atelier : app/pokemon/[nom]/carte).
// Ce fichier ne contient que des données et des fonctions pures : les types, les styles de carte proposés
// et leurs réglages. Il est lu par le store (stores/cartes.ts), l'atelier (components/AtelierCarte.tsx)
// et le dessin de la carte (lib/carte3d.ts).

import type { Attaque } from "@/lib/conversion";
import type { Motif } from "@/lib/effets-types/feuille";
import type { NomType } from "@/lib/types";

export const ATTAQUES_MAX = 2; // comme sur une vraie carte : une ou deux attaques
export const LONGUEUR_MAX_SURNOM = 12;

// Les styles de carte, inspirés des raretés des cartes à collectionner.
export type StyleCarte = "classique" | "pleine" | "chromatique" | "or";

// Ce qu'on garde d'une attaque posée sur la carte (pas besoin de sa description ni de ses PP).
export type AttaqueCarte = Pick<Attaque, "nom" | "nomFr" | "type" | "puissance">;

export type CartePerso = {
  style: StyleCarte;
  surnom: string; // "" = le nom français du Pokémon
  motif: Motif | "aucun" | null; // null = le motif du style ; "aucun" = pas de feuille holographique
  typeEffet: NomType | null; // null = le type principal du Pokémon
  attaques: AttaqueCarte[]; // 0 à ATTAQUES_MAX
  // Nom français du Pokémon, noté à l'enregistrement : la liste « Mes cartes » de l'atelier peut ainsi
  // écrire « Dracaufeu » sans recharger le Pokémon (la carte est rangée sous son nom anglais).
  nomPokemon?: string;
};

// La carte de départ, tant que rien n'a été personnalisé.
export const CARTE_DE_BASE: CartePerso = { style: "classique", surnom: "", motif: null, typeEffet: null, attaques: [] };

// Table des styles : libellé, explication, et motif holographique qui va avec (null = pas de feuille, comme
// sur la fiche). Choisir un style remet ce motif ; on peut ensuite en changer.
export const STYLES: Record<StyleCarte, { libelle: string; description: string; motif: Motif | null }> = {
  classique: { libelle: "Classique", description: "La carte de la fiche : illustration encadrée, sans feuille holographique.", motif: null },
  pleine: { libelle: "Full art", description: "L'illustration occupe toute la carte, le texte passe par-dessus.", motif: "rayons" },
  chromatique: { libelle: "Chromatique", description: "Le Pokémon dans ses couleurs rares (« shiny »), sur un semis d'étoiles.", motif: "etoiles" },
  or: { libelle: "Or", description: "Carte dorée : liseré, fond et feuille en métal précieux.", motif: "or" },
};
export const NOMS_STYLES = Object.keys(STYLES) as StyleCarte[];

// Les motifs proposés dans l'atelier, avec leur libellé.
export const LIBELLES_MOTIFS: Partial<Record<Motif, string>> = {
  "arc-en-ciel": "Arc-en-ciel",
  etoiles: "Étoiles",
  rayons: "Rayons",
  cosmos: "Cosmos",
  or: "Or",
};
export const MOTIFS_PROPOSES = Object.keys(LIBELLES_MOTIFS) as Motif[];

// Le motif réellement affiché sur une carte : celui choisi, sinon celui de son style ; null = pas de feuille.
export function motifAffiche(carte: CartePerso): Motif | null {
  if (carte.motif === "aucun") return null;
  return carte.motif ?? STYLES[carte.style].motif;
}

// Couleur de la carte « Or » (à la place de la couleur du type).
export const TEINTE_OR = "#e0b64c";

// Adresse de l'illustration chromatique : la PokéAPI la range dans un sous-dossier « shiny », sous le même nom.
// ".../official-artwork/6.png" → ".../official-artwork/shiny/6.png"
export function adresseChromatique(artwork: string | null): string | null {
  return artwork ? artwork.replace("/official-artwork/", "/official-artwork/shiny/") : null;
}

// Applique les règles à une carte avant de l'enregistrer : surnom nettoyé et limité, pas d'attaque en
// double, ATTAQUES_MAX attaques au plus. Fonction pure : elle renvoie une NOUVELLE carte.
export function nettoyerCarte(carte: CartePerso): CartePerso {
  const sansDoublon = carte.attaques.filter((attaque, index) => carte.attaques.findIndex((a) => a.nom === attaque.nom) === index);
  return {
    ...carte,
    surnom: carte.surnom.slice(0, LONGUEUR_MAX_SURNOM),
    attaques: sansDoublon.slice(0, ATTAQUES_MAX),
  };
}

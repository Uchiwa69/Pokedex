// Carte holographique PERSONNALISÉE (atelier : app/pokemon/[nom]/carte).
// Ce fichier ne contient que des données et des fonctions pures : les types, les styles de carte proposés
// et leurs réglages. Il est lu par le store (stores/cartes.ts), l'atelier (components/AtelierCarte.tsx)
// et le dessin de la carte (lib/carte3d.ts).

import type { Attaque } from "@/lib/conversion";
import type { Motif } from "@/lib/effets-types/feuille";
import type { NomType } from "@/lib/types";

export const ATTAQUES_MAX = 2; // comme sur une vraie carte : une ou deux attaques
export const LONGUEUR_MAX_SURNOM = 12;
// Attaques inventées dans l'atelier : nom limité (il doit tenir sur la carte) et puissance bornée.
export const LONGUEUR_MAX_ATTAQUE = 20;
export const PUISSANCE_MAX = 250;

// Les styles de carte, inspirés des raretés des cartes à collectionner.
export type StyleCarte = "classique" | "pleine" | "chromatique" | "or";

// Ce qu'on garde d'une attaque posée sur la carte (pas besoin de sa description ni de ses PP).
// perso : attaque inventée dans l'atelier (elle n'existe que sur cette carte, jamais en combat ni dans la sacoche).
export type AttaqueCarte = Pick<Attaque, "nom" | "nomFr" | "type" | "puissance"> & { perso?: true };

// Crée une attaque inventée. Son identifiant commence par « perso- » : il ne peut pas être celui d'une vraie
// attaque de la PokéAPI (qui n'ont que des lettres et des tirets, comme « flamethrower »), ni d'une autre attaque
// inventée (l'heure en millisecondes change à chaque création).
// Les règles (nom raccourci, puissance bornée) sont appliquées par nettoyerCarte, à l'enregistrement.
export function creerAttaquePerso(nomFr: string, type: NomType, puissance: number | null): AttaqueCarte {
  return { nom: `perso-${Date.now()}`, nomFr: nomFr.trim(), type, puissance, perso: true };
}

// Une puissance acceptable : un entier entre 0 et PUISSANCE_MAX ; null (attaque de statut, « — » sur la carte)
// si la valeur n'est pas un nombre.
function bornerPuissance(puissance: number | null): number | null {
  if (puissance === null || !Number.isFinite(puissance)) return null;
  return Math.min(PUISSANCE_MAX, Math.max(0, Math.round(puissance)));
}

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
// double, ATTAQUES_MAX attaques au plus, attaques inventées avec un nom limité (et non vide) et une puissance
// bornée. Fonction pure : elle renvoie une NOUVELLE carte.
export function nettoyerCarte(carte: CartePerso): CartePerso {
  const sansDoublon = carte.attaques.filter((attaque, index) => carte.attaques.findIndex((a) => a.nom === attaque.nom) === index);
  const valides = sansDoublon
    .map((attaque) =>
      attaque.perso
        ? { ...attaque, nomFr: attaque.nomFr.trim().slice(0, LONGUEUR_MAX_ATTAQUE), puissance: bornerPuissance(attaque.puissance) }
        : attaque,
    )
    .filter((attaque) => attaque.nomFr !== "");
  return {
    ...carte,
    surnom: carte.surnom.slice(0, LONGUEUR_MAX_SURNOM),
    attaques: valides.slice(0, ATTAQUES_MAX),
  };
}

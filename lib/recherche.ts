// Recherche, type et page vivent dans l'adresse : /?q=pika&type=electric&page=2
// Ce fichier contient des fonctions PURES pour lire, valider et réécrire ces paramètres.
// Règle : on ne fait jamais confiance à l'adresse (n'importe qui peut y écrire n'importe quoi).

import { estUnType, type NomType } from "@/lib/types";

export type Filtres = {
  q: string; // texte recherché, nettoyé ("" = pas de recherche)
  type: NomType | null; // null = tous les types
  page: number; // entier ≥ 1
};

// Forme de searchParams dans Next : chaque clé peut être absente, une chaîne, ou un tableau (?q=a&q=b).
export type ParametresBruts = Record<string, string | string[] | undefined>;

function premiereValeur(valeur: string | string[] | undefined): string {
  if (Array.isArray(valeur)) return valeur[0] ?? "";
  return valeur ?? "";
}

// Transforme les paramètres bruts en filtres sûrs. Toute valeur invalide est remplacée par la valeur par défaut :
// ?type=licorne → pas de filtre, ?page=abc → page 1. Rien ne peut donc faire planter la page.
export function validerFiltres(bruts: ParametresBruts): Filtres {
  const q = premiereValeur(bruts.q).trim().toLowerCase().slice(0, 50);

  const typeBrut = premiereValeur(bruts.type);
  const type = estUnType(typeBrut) ? typeBrut : null;

  const pageBrute = Number.parseInt(premiereValeur(bruts.page), 10);
  const page = Number.isInteger(pageBrute) && pageBrute >= 1 ? pageBrute : 1;

  return { q, type, page };
}

// Fabrique l'adresse correspondant à des filtres, sans paramètre inutile (pas de ?page=1, pas de ?q= vide).
export function construireAdresse(filtres: Filtres): string {
  const parametres = new URLSearchParams();
  if (filtres.q) parametres.set("q", filtres.q);
  if (filtres.type) parametres.set("type", filtres.type);
  if (filtres.page > 1) parametres.set("page", String(filtres.page));

  const texte = parametres.toString();
  return texte ? `/?${texte}` : "/";
}

// Garde les noms qui contiennent le texte cherché. "mr mime" trouve "mr-mime".
export function filtrerNoms(noms: string[], q: string): string[] {
  if (!q) return noms;
  const cherche = q.replaceAll(" ", "-");
  return noms.filter((nom) => nom.includes(cherche));
}

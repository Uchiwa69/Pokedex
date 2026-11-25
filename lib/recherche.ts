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

// Met un texte sous une forme comparable : minuscules, sans accents, et tout ce qui n'est ni une lettre
// ni un chiffre devient un tiret. « Évoli » → "evoli", « M. Mime » → "m-mime", « mr mime » → "mr-mime".
export function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .normalize("NFD") // sépare la lettre de son accent : « é » devient « e » + accent
    .replace(/[\u0300-\u036f]/g, "") // retire les accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, ""); // pas de tiret au début ni à la fin
}

// true si le texte cherché est un numéro de Pokémon : « 25 », « #25 », « 0025 ».
export function estUnNumero(texte: string): boolean {
  return /^#?\d+$/.test(texte.trim());
}

// Garde les noms qui correspondent au texte cherché, en anglais OU en français.
// - noms : les identifiants anglais de l'API ("charizard", "mr-mime") ;
// - nomsFr : pour chaque identifiant, son nom français déjà normalisé ("dracaufeu", "m-mime").
// - tousLesNoms : la liste complète dans l'ordre du Pokédex (le 25e nom est le n° 25). Elle sert à la
//   recherche par numéro, et doit être fournie quand « noms » n'est qu'une partie de la liste (un type).
// « drac » trouve Dracaufeu, « char » trouve Charizard, « evoli » trouve Évoli.
// « 25 », « #25 » ou « 0025 » trouvent Pikachu, puis les numéros qui commencent par 25 (250, 251…).
export function filtrerNoms(noms: string[], q: string, nomsFr: Record<string, string> = {}, tousLesNoms: string[] = noms): string[] {
  const cherche = normaliser(q);
  if (!cherche) return noms;
  const parNom = noms.filter((nom) => nom.includes(cherche) || (nomsFr[nom] ?? "").includes(cherche));

  // Que des chiffres : c'est un numéro. Number retire les zéros du début ("0025" → 25).
  if (!/^\d+$/.test(cherche)) return parNom;
  const numero = String(Number(cherche));
  // Table nom → numéro (la position dans la liste complète, à partir de 1).
  const numeros = new Map(tousLesNoms.map((nom, index) => [nom, String(index + 1)]));
  const parNumero = noms.filter((nom) => numeros.get(nom)?.startsWith(numero));
  // Les numéros d'abord (le numéro exact arrive en tête : la liste est dans l'ordre), puis les rares noms
  // qui contiennent ce chiffre (« porygon2 »), sans doublon.
  return [...parNumero, ...parNom.filter((nom) => !parNumero.includes(nom))];
}

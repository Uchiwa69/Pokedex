// Accès à la PokéAPI côté SERVEUR.
// Chaque fonction commence par "use cache" : son résultat est mis en cache (la clé du cache,
// ce sont ses arguments). cacheLife("days") : la donnée est considérée fraîche pendant des jours,
// ce qui convient très bien ici car les Pokémon ne changent pas.

import { cacheLife } from "next/cache";
import { choisirMeilleuresAttaques } from "@/lib/combat";
import {
  aplatir,
  convertirAttaque,
  convertirEspece,
  convertirPokemon,
  extraireApprentissages,
  extraireId,
  type Apprentissage,
  type Attaque,
  type AttaqueBrute,
  type ChaineBrute,
  type Espece,
  type EspeceBrute,
  type Pokemon,
  type PokemonBrut,
} from "@/lib/conversion";
import { filtrerNoms } from "@/lib/recherche";
import type { NomType } from "@/lib/types";

const API = "https://pokeapi.co/api/v2";

// Le Pokédex national s'arrête au n° 1025 (au-delà, l'API liste des formes spéciales).
export const TOTAL_POKEMONS = 1025;
export const PAR_PAGE = 24;

// Lit une adresse de l'API et distingue deux situations :
// - 404 → la ressource n'existe pas → on renvoie null (la page appellera notFound()) ;
// - toute autre réponse en échec → l'API est en panne → on lève une erreur (captée par error.tsx).
async function lire<T>(url: string): Promise<T | null> {
  const reponse = await fetch(url);
  if (reponse.status === 404) return null;
  if (!reponse.ok) {
    throw new Error(`La PokéAPI a répondu ${reponse.status} pour ${url}`);
  }
  return (await reponse.json()) as T;
}

// Nom français et adresse de la chaîne d'évolution d'une espèce.
export async function recupererEspece(nom: string): Promise<Espece | null> {
  "use cache";
  cacheLife("days");

  const brute = await lire<EspeceBrute>(`${API}/pokemon-species/${encodeURIComponent(nom)}`);
  return brute ? convertirEspece(brute) : null;
}

// Un Pokémon complet, ou null s'il n'existe pas.
export async function recupererPokemon(nom: string): Promise<Pokemon | null> {
  "use cache";
  cacheLife("days");

  const brut = await lire<PokemonBrut>(`${API}/pokemon/${encodeURIComponent(nom.toLowerCase())}`);
  if (!brut) return null;

  // Le nom français n'est pas dans /pokemon mais dans /pokemon-species.
  const espece = await recupererEspece(brut.species.name);
  return convertirPokemon(brut, espece);
}

type ListeBrute = {
  results: { name: string }[];
};

// Les noms (anglais) des 1 025 Pokémon, dans l'ordre du Pokédex. Une seule requête.
export async function recupererTousLesNoms(): Promise<string[]> {
  "use cache";
  cacheLife("days");

  const brute = await lire<ListeBrute>(`${API}/pokemon?limit=${TOTAL_POKEMONS}&offset=0`);
  if (!brute) throw new Error("La liste des Pokémon est introuvable.");
  return brute.results.map((r) => r.name);
}

type TypeBrut = {
  pokemon: { pokemon: { name: string; url: string } }[];
};

// Les noms des Pokémon d'un type donné (limités au Pokédex national), dans l'ordre des numéros.
export async function recupererNomsDuType(type: NomType): Promise<string[]> {
  "use cache";
  cacheLife("days");

  const brut = await lire<TypeBrut>(`${API}/type/${type}`);
  if (!brut) return [];

  return brut.pokemon
    .map((entree) => ({ nom: entree.pokemon.name, id: extraireId(entree.pokemon.url) }))
    .filter((entree) => entree.id <= TOTAL_POKEMONS)
    .sort((a, b) => a.id - b.id)
    .map((entree) => entree.nom);
}

export type ResultatListe = {
  pokemons: Pokemon[];
  total: number; // nombre total de résultats (toutes pages confondues)
  page: number; // page réellement affichée
  totalPages: number;
};

// Les Pokémon d'une page de la grille, après recherche et filtre par type.
// Les arguments ont déjà été validés par validerFiltres (lib/recherche.ts).
export async function recupererListe(q: string, type: NomType | null, page: number): Promise<ResultatListe> {
  "use cache";
  cacheLife("days");

  // 1. Point de départ : tous les noms, ou seulement ceux du type demandé.
  const noms = type ? await recupererNomsDuType(type) : await recupererTousLesNoms();

  // 2. Recherche sur les noms (on ne charge pas encore les Pokémon).
  const trouves = filtrerNoms(noms, q);

  // 3. Pagination. Une page trop grande (?page=9999) est ramenée à la dernière page.
  const total = trouves.length;
  const totalPages = Math.max(1, Math.ceil(total / PAR_PAGE));
  const pageReelle = Math.min(page, totalPages);
  const debut = (pageReelle - 1) * PAR_PAGE;
  const nomsDeLaPage = trouves.slice(debut, debut + PAR_PAGE);

  // 4. Promise.all : les 24 requêtes partent EN PARALLÈLE (au lieu de l'une après l'autre).
  const pokemons = await Promise.all(nomsDeLaPage.map((nom) => recupererPokemon(nom)));

  return {
    // On retire les éventuels null, en l'expliquant à TypeScript avec une garde de type.
    pokemons: pokemons.filter((p): p is Pokemon => p !== null),
    total,
    page: pageReelle,
    totalPages,
  };
}

// Tous les Pokémon de la chaîne d'évolution d'une espèce, dans l'ordre (ex. Salamèche, Reptincel, Dracaufeu).
export async function recupererEvolutions(nomEspece: string): Promise<Pokemon[]> {
  "use cache";
  cacheLife("days");

  const espece = await recupererEspece(nomEspece);
  if (!espece || !espece.urlEvolutions) return [];

  const chaine = await lire<ChaineBrute>(espece.urlEvolutions);
  if (!chaine) return [];

  // L'arbre devient une liste de numéros, puis on charge chaque Pokémon en parallèle.
  const ids = aplatir(chaine.chain);
  const pokemons = await Promise.all(ids.map((id) => recupererPokemon(String(id))));
  return pokemons.filter((p): p is Pokemon => p !== null);
}

// Une attaque (par son nom anglais ou son numéro), ou null si elle n'existe pas.
export async function recupererAttaque(id: string): Promise<Attaque | null> {
  "use cache";
  cacheLife("days");

  const brute = await lire<AttaqueBrute>(`${API}/move/${encodeURIComponent(id)}`);
  return brute ? convertirAttaque(brute) : null;
}

// Les attaques qu'un Pokémon apprend par montée de niveau : noms et niveaux seulement.
export async function recupererApprentissages(nom: string): Promise<Apprentissage[]> {
  "use cache";
  cacheLife("days");

  const brut = await lire<PokemonBrut>(`${API}/pokemon/${encodeURIComponent(nom.toLowerCase())}`);
  return brut ? extraireApprentissages(brut) : [];
}

export type AttaqueApprise = {
  niveau: number;
  attaque: Attaque;
};

// Les mêmes attaques, complètes (nom FR, type, puissance…), triées par niveau.
export async function recupererAttaquesParNiveau(nom: string): Promise<AttaqueApprise[]> {
  "use cache";
  cacheLife("days");

  const apprentissages = await recupererApprentissages(nom);
  // Une requête par attaque, toutes lancées en parallèle.
  const attaques = await Promise.all(apprentissages.map((a) => recupererAttaque(a.nom)));

  const resultat: AttaqueApprise[] = [];
  attaques.forEach((attaque, index) => {
    if (attaque) resultat.push({ niveau: apprentissages[index].niveau, attaque });
  });
  return resultat;
}

// Les 4 meilleures attaques offensives d'un Pokémon : celles que reçoit par défaut un membre de la sacoche.
export async function recupererMeilleuresAttaques(nom: string): Promise<Attaque[]> {
  "use cache";
  cacheLife("days");

  const pokemon = await recupererPokemon(nom);
  if (!pokemon) return [];
  const apprises = await recupererAttaquesParNiveau(nom);
  return choisirMeilleuresAttaques(
    apprises.map((a) => a.attaque),
    pokemon.types,
  );
}

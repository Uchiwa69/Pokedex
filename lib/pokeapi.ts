// Accès à la PokéAPI côté SERVEUR.
// Chaque fonction commence par "use cache" : son résultat est mis en cache (la clé du cache,
// ce sont ses arguments). cacheLife("days") : la donnée est considérée fraîche pendant des jours,
// ce qui convient très bien ici car les Pokémon ne changent pas.

import { cacheLife } from "next/cache";
import {
  convertirEspece,
  convertirPokemon,
  type Espece,
  type EspeceBrute,
  type Pokemon,
  type PokemonBrut,
} from "@/lib/conversion";

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

// Les Pokémon d'une page de la grille (page 1 = les 24 premiers).
export async function recupererListe(page: number): Promise<Pokemon[]> {
  "use cache";
  cacheLife("days");

  const tous = await recupererTousLesNoms();
  const debut = (page - 1) * PAR_PAGE;
  const noms = tous.slice(debut, debut + PAR_PAGE);

  // Promise.all : les 24 requêtes partent EN PARALLÈLE (au lieu de l'une après l'autre).
  const pokemons = await Promise.all(noms.map((nom) => recupererPokemon(nom)));

  // On retire les éventuels null, en l'expliquant à TypeScript avec une garde de type.
  return pokemons.filter((p): p is Pokemon => p !== null);
}

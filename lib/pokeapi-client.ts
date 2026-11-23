// Version NAVIGATEUR de l'accès à la PokéAPI, pour la page Favoris.
// Les favoris sont dans le localStorage : le serveur ne les connaît pas, c'est donc le navigateur
// qui va chercher les données. Pas de "use cache" ici (c'est une fonctionnalité serveur) :
// on garde simplement les réponses dans une Map, le temps de la visite.

import {
  convertirEspece,
  convertirPokemon,
  type EspeceBrute,
  type Pokemon,
  type PokemonBrut,
} from "@/lib/conversion";

const API = "https://pokeapi.co/api/v2";

async function lire<T>(url: string): Promise<T | null> {
  const reponse = await fetch(url);
  if (reponse.status === 404) return null;
  if (!reponse.ok) throw new Error(`La PokéAPI a répondu ${reponse.status}`);
  return (await reponse.json()) as T;
}

async function charger(nom: string): Promise<Pokemon | null> {
  const brut = await lire<PokemonBrut>(`${API}/pokemon/${encodeURIComponent(nom)}`);
  if (!brut) return null;
  const especeBrute = await lire<EspeceBrute>(`${API}/pokemon-species/${brut.species.name}`);
  // On réutilise les MÊMES fonctions de conversion que côté serveur.
  return convertirPokemon(brut, especeBrute ? convertirEspece(especeBrute) : null);
}

// Mémoire : nom → promesse du Pokémon. Un Pokémon déjà demandé n'est pas redemandé.
const memoire = new Map<string, Promise<Pokemon | null>>();

export function recupererPokemonClient(nom: string): Promise<Pokemon | null> {
  const connue = memoire.get(nom);
  if (connue) return connue;

  const promesse = charger(nom).catch((erreur) => {
    memoire.delete(nom); // en cas d'échec on oublie, pour pouvoir réessayer
    throw erreur;
  });
  memoire.set(nom, promesse);
  return promesse;
}

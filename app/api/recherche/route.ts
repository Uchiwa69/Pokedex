import { recupererNomsFrancais, recupererPokemon, recupererTousLesNoms } from "@/lib/pokeapi";
import { filtrerNoms } from "@/lib/recherche";

const NOMBRE_MAX = 6;

// GET /api/recherche?q=drac → les 6 premiers Pokémon dont le nom (français ou anglais) contient le texte.
// Sert au choix des adversaires sur la page Combat. La lecture de l'adresse de la requête rend cette
// route dynamique ; les fonctions de données qu'elle appelle, elles, restent en cache.
export async function GET(requete: Request) {
  // Paramètre validé : nettoyé et limité à 30 caractères. Moins de 2 lettres : aucune suggestion.
  const q = (new URL(requete.url).searchParams.get("q") ?? "").trim().slice(0, 30);
  if (q.length < 2) return Response.json([]);

  const [noms, nomsFr] = await Promise.all([recupererTousLesNoms(), recupererNomsFrancais()]);
  const trouves = filtrerNoms(noms, q, nomsFr).slice(0, NOMBRE_MAX);
  const pokemons = await Promise.all(trouves.map((nom) => recupererPokemon(nom)));
  return Response.json(pokemons.filter((pokemon) => pokemon !== null));
}

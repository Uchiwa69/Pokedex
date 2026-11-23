import { connection } from "next/server";
import { recupererMeilleuresAttaques, recupererPokemon, TOTAL_POKEMONS } from "@/lib/pokeapi";

const NOMBRE_MAX = 6;

// GET /api/aleatoire?nombre=3 → une équipe de Pokémon tirés au hasard, chacun avec ses 4 attaques.
// Sert à fabriquer l'équipe adverse du mode combat.
export async function GET(requete: Request) {
  // connection() attend une vraie requête : Next sait alors que cette réponse ne doit JAMAIS être
  // préparée au build ni mise en cache. Sans cela, le « hasard » serait tiré une seule fois pour tout le monde.
  await connection();

  // Paramètre validé : un entier entre 1 et 6 (1 par défaut).
  const demande = Number.parseInt(new URL(requete.url).searchParams.get("nombre") ?? "1", 10);
  const nombre = Number.isInteger(demande) ? Math.min(Math.max(demande, 1), NOMBRE_MAX) : 1;

  // Des numéros de Pokédex tous différents : un Set refuse les doublons.
  const numeros = new Set<number>();
  while (numeros.size < nombre) {
    numeros.add(1 + Math.floor(Math.random() * TOTAL_POKEMONS));
  }

  // Les fonctions de données, elles, restent en cache : seul le tirage est refait à chaque requête.
  const equipe = await Promise.all(
    [...numeros].map(async (numero) => {
      const pokemon = await recupererPokemon(String(numero));
      if (!pokemon) return null;
      const attaques = await recupererMeilleuresAttaques(pokemon.nom);
      return { pokemon, attaques };
    }),
  );

  return Response.json(equipe.filter((membre) => membre !== null));
}

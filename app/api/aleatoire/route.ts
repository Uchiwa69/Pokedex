import { connection } from "next/server";
import { recupererMeilleuresAttaques, recupererPokemon, TOTAL_POKEMONS } from "@/lib/pokeapi";

const NOMBRE_MAX = 6;

// GET /api/aleatoire?nombre=3 → une équipe de Pokémon tirés au hasard, chacun avec ses 4 attaques.
// Sert à fabriquer l'équipe adverse du mode combat, et les propositions du quiz
// (avec &attaques=non : le quiz n'a pas besoin des attaques, la réponse est plus rapide).
// &choisis=pikachu,mew : ces Pokémon-là sont placés en premier (adversaires choisis par le joueur),
// et seules les places restantes sont tirées au hasard.
export async function GET(requete: Request) {
  // connection() attend une vraie requête : Next sait alors que cette réponse ne doit JAMAIS être
  // préparée au build ni mise en cache. Sans cela, le « hasard » serait tiré une seule fois pour tout le monde.
  await connection();

  // Paramètre validé : un entier entre 1 et 6 (1 par défaut).
  const parametres = new URL(requete.url).searchParams;
  const avecAttaques = parametres.get("attaques") !== "non";
  const demande = Number.parseInt(parametres.get("nombre") ?? "1", 10);
  const nombre = Number.isInteger(demande) ? Math.min(Math.max(demande, 1), NOMBRE_MAX) : 1;

  // Adversaires choisis : on ne fait pas confiance à l'adresse. Chaque nom est nettoyé, la liste est limitée
  // à `nombre`, et un nom inconnu est simplement ignoré (recupererPokemon renvoie null).
  const nomsChoisis = (parametres.get("choisis") ?? "")
    .split(",")
    .map((nom) => nom.trim().toLowerCase().slice(0, 40))
    .filter((nom) => /^[a-z0-9-]+$/.test(nom))
    .slice(0, nombre);
  const choisis = (await Promise.all(nomsChoisis.map((nom) => recupererPokemon(nom)))).filter((pokemon) => pokemon !== null);

  // Des numéros de Pokédex tous différents : un Set refuse les doublons. On y met d'abord les numéros
  // des Pokémon choisis, puis on complète au hasard jusqu'à `nombre`.
  const numeros = new Set<number>(choisis.map((pokemon) => pokemon.id));
  while (numeros.size < nombre) {
    numeros.add(1 + Math.floor(Math.random() * TOTAL_POKEMONS));
  }

  // Les fonctions de données, elles, restent en cache : seul le tirage est refait à chaque requête.
  // Un Set garde l'ordre d'insertion : les Pokémon choisis restent donc en tête de l'équipe.
  const equipe = await Promise.all(
    [...numeros].map(async (numero) => {
      const pokemon = await recupererPokemon(String(numero));
      if (!pokemon) return null;
      const attaques = avecAttaques ? await recupererMeilleuresAttaques(pokemon.nom) : [];
      return { pokemon, attaques };
    }),
  );

  return Response.json(equipe.filter((membre) => membre !== null));
}

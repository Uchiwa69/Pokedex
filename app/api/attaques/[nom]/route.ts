import { recupererMeilleuresAttaques, recupererPokemon } from "@/lib/pokeapi";

// Route Handler : une adresse qui renvoie du JSON au lieu d'une page.
// GET /api/attaques/pikachu → les 4 meilleures attaques offensives de Pikachu.
// Elle est appelée par le navigateur (hook useChargementAttaques) quand un Pokémon entre dans la sacoche.
export async function GET(_requete: Request, { params }: RouteContext<"/api/attaques/[nom]">) {
  const { nom } = await params;

  // Pokémon inconnu → réponse 404, comme notFound() pour une page.
  const pokemon = await recupererPokemon(nom);
  if (!pokemon) {
    return Response.json({ erreur: "Pokémon introuvable" }, { status: 404 });
  }

  // Les fonctions appelées sont en cache ("use cache") : la réponse est rapide dès la 2e demande.
  const attaques = await recupererMeilleuresAttaques(pokemon.nom);
  return Response.json(attaques);
}

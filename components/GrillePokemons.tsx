import CartePokemon from "@/components/CartePokemon";
import { recupererListe } from "@/lib/pokeapi";

// Composant serveur ASYNCHRONE : il attend les données directement avec await, sans useEffect ni useState.
// Pendant l'attente, c'est le fallback du <Suspense> placé autour de lui qui s'affiche.
export default async function GrillePokemons({ page }: { page: number }) {
  const pokemons = await recupererListe(page);

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {pokemons.map((pokemon, index) => (
        <li key={pokemon.id}>
          {/* Les 4 premières cartes sont visibles dès l'arrivée : image chargée tout de suite. */}
          <CartePokemon pokemon={pokemon} prioritaire={index < 4} />
        </li>
      ))}
    </ul>
  );
}

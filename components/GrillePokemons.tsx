import CartePokemon from "@/components/CartePokemon";
import type { Pokemon } from "@/lib/conversion";

// Affiche une liste de Pokémon en grille. Composant « bête » : il reçoit ses données en props.
export default function GrillePokemons({ pokemons }: { pokemons: Pokemon[] }) {
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

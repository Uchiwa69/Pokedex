import CartePokemon from "@/components/CartePokemon";
import type { Pokemon } from "@/lib/conversion";

// Affiche une liste de Pokémon en grille. Composant « bête » : il reçoit ses données en props.
// auto-rows-fr : toutes les rangées de la grille ont la même hauteur (celle de la plus haute).
export default function GrillePokemons({ pokemons }: { pokemons: Pokemon[] }) {
  return (
    <ul className="grid auto-rows-fr grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {pokemons.map((pokemon, index) => (
        <li key={pokemon.id} className="min-w-0">
          {/* Les 4 premières cartes sont visibles dès l'arrivée : image chargée tout de suite. */}
          <CartePokemon pokemon={pokemon} prioritaire={index < 4} />
        </li>
      ))}
    </ul>
  );
}

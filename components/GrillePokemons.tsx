import CartePokemon from "@/components/CartePokemon";
import type { Pokemon } from "@/lib/conversion";

// Affiche une liste de Pokémon en grille. Composant « bête » : il reçoit ses données en props.
// auto-rows-fr : toutes les rangées de la grille ont la même hauteur (celle de la plus haute).
// Apparition en cascade : la même animation CSS pour chaque carte, avec un délai qui grandit
// avec la position (25 ms de plus par carte). Aucun JavaScript : cela marche dès le HTML du serveur.
export default function GrillePokemons({ pokemons }: { pokemons: Pokemon[] }) {
  return (
    <ul className="grid auto-rows-fr grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {pokemons.map((pokemon, index) => (
        <li
          key={pokemon.id}
          // relative + hover:z-10 : la carte survolée passe au-dessus de ses voisines (son artwork dépasse du cadre).
          className="relative min-w-0 animate-apparition hover:z-10 motion-reduce:animate-fondu"
          style={{ animationDelay: `${index * 25}ms` }}
        >
          {/* Les 4 premières cartes sont visibles dès l'arrivée : image chargée tout de suite. */}
          <CartePokemon pokemon={pokemon} prioritaire={index < 4} />
        </li>
      ))}
    </ul>
  );
}

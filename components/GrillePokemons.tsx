import CartePokemon from "@/components/CartePokemon";
import type { Pokemon } from "@/lib/conversion";

// Affiche une liste de Pokémon en grille. Composant « bête » : il reçoit ses données en props.
// auto-rows-fr : toutes les rangées de la grille ont la même hauteur (celle de la plus haute).
// Colonnes : 2 sur téléphone, 4 à partir de 768 px (md), 5 à partir de 1280 px (xl, quand le site atteint sa
// largeur maximale). Une page contient 20 Pokémon (PAR_PAGE) : 20 se divise par 2, 4 et 5, donc la dernière
// rangée est toujours complète.
// Apparition en cascade : la même animation CSS pour chaque carte, avec un délai qui grandit avec la
// position. Le délai est PLAFONNÉ : seules les 6 premières cartes sont décalées (15 ms chacune), les
// suivantes arrivent ensemble. Avec 25 ms par carte sur les 24, la dernière n'apparaissait qu'au bout
// d'une seconde, ce qui donnait une impression de lenteur à chaque changement de filtre.
// Aucun JavaScript : cela marche dès le HTML du serveur.
const CARTES_DECALEES = 6;
const DECALAGE = 15; // millisecondes
export default function GrillePokemons({ pokemons }: { pokemons: Pokemon[] }) {
  return (
    <ul className="grid auto-rows-fr grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-5">
      {pokemons.map((pokemon, index) => (
        <li
          key={pokemon.id}
          // relative + hover:z-10 : la carte survolée passe au-dessus de ses voisines (son artwork dépasse du cadre).
          className="relative min-w-0 animate-apparition hover:z-10 motion-reduce:animate-fondu"
          style={{ animationDelay: `${Math.min(index, CARTES_DECALEES) * DECALAGE}ms` }}
        >
          {/* Les 4 premières cartes sont visibles dès l'arrivée : image chargée tout de suite. */}
          <CartePokemon pokemon={pokemon} prioritaire={index < 4} />
        </li>
      ))}
    </ul>
  );
}

import Link from "next/link";
import BoutonFavori from "@/components/BoutonFavori";
import BoutonSacoche from "@/components/BoutonSacoche";
import CarteInclinable from "@/components/CarteInclinable";
import CorpsCartePokemon from "@/components/CorpsCartePokemon";
import type { Pokemon } from "@/lib/conversion";
import { styleTeinte } from "@/lib/teinte";

type Props = {
  pokemon: Pokemon;
  // true pour les premières cartes visibles : leur image est chargée en priorité.
  prioritaire?: boolean;
};

// Carte d'un Pokémon dans la grille : composant serveur. Seuls les boutons et l'inclinaison 3D
// sont des composants client. La variable --teinte (couleur du type principal) colore le dégradé,
// les halos et la lueur de survol. Le contenu de la carte est dans CorpsCartePokemon, partagé avec la sacoche.
export default function CartePokemon({ pokemon, prioritaire = false }: Props) {
  return (
    <article
      style={styleTeinte(pokemon.types[0])}
      // "group" : les enfants peuvent réagir au survol de la carte entière (group-hover:…).
      className="group relative h-full transition-transform duration-200 hover:-translate-y-1.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      {/* Inclinaison 3D qui suit la souris (petit composant client autour du contenu de la carte). */}
      {/* angle={16} : inclinaison bien marquée. reflet : une tache de lumière suit la souris (effet verre).
          coinCalme : la carte penche beaucoup moins près des boutons du coin haut droit. */}
      <CarteInclinable angle={16} reflet coinCalme>
        {/* Lueur de survol : un contour et une ombre de la teinte, déjà dessinés mais invisibles.
            On n'anime que leur opacité (on n'anime jamais box-shadow directement). */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 shadow-[0_0_0_1px_var(--teinte),0_22px_44px_-14px_var(--teinte)] transition-opacity duration-200 group-hover:opacity-100 motion-reduce:transition-none"
        />

        <Link href={`/pokemon/${pokemon.nom}`} className="verre relative flex h-full flex-col gap-2 p-3 sm:p-4">
          <CorpsCartePokemon pokemon={pokemon} titre={pokemon.nomFr} prioritaire={prioritaire} transitionPartagee />
        </Link>

        {/* Les boutons sont HORS du <Link> (un bouton dans un lien est du HTML invalide, et un clic
            dessus ouvrirait la fiche). Ils sont posés par-dessus la carte en position absolute. */}
        <div className="absolute right-1 top-1 flex">
          <BoutonSacoche pokemon={pokemon} variante="rapide" />
          <BoutonFavori nom={pokemon.nom} nomFr={pokemon.nomFr} />
        </div>
      </CarteInclinable>
    </article>
  );
}

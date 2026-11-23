import Image from "next/image";
import Link from "next/link";
import BadgeType from "@/components/BadgeType";
import BoutonFavori from "@/components/BoutonFavori";
import BoutonSacoche from "@/components/BoutonSacoche";
import { formaterNumero, type Pokemon } from "@/lib/conversion";

type Props = {
  pokemon: Pokemon;
  // true pour les premières cartes visibles : leur image est chargée en priorité.
  prioritaire?: boolean;
};

// Carte d'un Pokémon dans la grille : composant serveur. Seuls les deux boutons sont des composants client.
export default function CartePokemon({ pokemon, prioritaire = false }: Props) {
  return (
    <article className="relative h-full">
      <Link
        href={`/pokemon/${pokemon.nom}`}
        className="flex h-full flex-col gap-2 rounded-2xl border border-bordure bg-surface p-4 hover:border-accent"
      >
        <p className="flex min-h-8 items-center text-xs font-semibold text-texte-doux">{formaterNumero(pokemon.id)}</p>

        <div className="relative mx-auto aspect-square w-full max-w-40">
          {pokemon.artwork ? (
            <Image
              src={pokemon.artwork}
              alt={`Illustration de ${pokemon.nomFr}`}
              fill
              // sizes dit au navigateur quelle largeur occupera l'image → il télécharge la bonne taille.
              sizes="160px"
              // Par défaut les images sont chargées « paresseusement » (lazy), à l'approche de l'écran.
              loading={prioritaire ? "eager" : "lazy"}
              className="object-contain"
            />
          ) : (
            <div className="h-full w-full rounded-full bg-piste" aria-hidden="true" />
          )}
        </div>

        <h2 className="font-titre text-xl font-semibold">{pokemon.nomFr}</h2>

        <ul className="flex flex-wrap gap-2">
          {pokemon.types.map((type) => (
            <li key={type}>
              <BadgeType type={type} />
            </li>
          ))}
        </ul>
      </Link>

      {/* Les boutons sont HORS du <Link> (un bouton dans un lien est du HTML invalide, et un clic
          dessus ouvrirait la fiche). Ils sont posés par-dessus la carte en position absolute. */}
      <div className="absolute right-1 top-1 flex">
        <BoutonSacoche pokemon={pokemon} variante="rapide" />
        <BoutonFavori nom={pokemon.nom} nomFr={pokemon.nomFr} />
      </div>
    </article>
  );
}

import Image from "next/image";
import Link from "next/link";
import BadgeType from "@/components/BadgeType";
import { formaterNumero, type Pokemon } from "@/lib/conversion";

type Props = {
  pokemon: Pokemon;
  // true pour les premières cartes visibles : leur image est chargée en priorité.
  prioritaire?: boolean;
};

// Carte d'un Pokémon dans la grille : composant serveur (aucune interactivité, juste un lien).
export default function CartePokemon({ pokemon, prioritaire = false }: Props) {
  return (
    <article className="relative h-full">
      <Link
        href={`/pokemon/${pokemon.nom}`}
        className="flex h-full flex-col gap-2 rounded-2xl border border-bordure bg-surface p-4 hover:border-accent"
      >
        <p className="text-xs font-semibold text-texte-doux">{formaterNumero(pokemon.id)}</p>

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
    </article>
  );
}

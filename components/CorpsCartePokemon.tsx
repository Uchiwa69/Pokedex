import { ViewTransition } from "react";
import Image from "next/image";
import BadgeType from "@/components/BadgeType";
import type { Pokemon } from "@/lib/conversion";

type Props = {
  pokemon: Pokemon;
  // Texte du titre : le nom du Pokémon dans la grille, le surnom dans la sacoche.
  titre: string;
  // Petite ligne au-dessus de l'illustration. Par défaut : « N° 0006 ».
  etiquette?: string;
  // true pour les premières cartes visibles : leur image est chargée en priorité.
  prioritaire?: boolean;
  // true : l'illustration porte un nom de transition partagé avec la fiche (voir la grille de l'accueil).
  transitionPartagee?: boolean;
};

// Le CONTENU d'une carte de Pokémon : décor en verre teinté, numéro, illustration sur son halo, titre, types.
// Il est partagé par la grille de l'accueil (CartePokemon, où la carte est un lien) et par la sacoche
// (AreneEquipe, où la carte se sélectionne) : les deux pages montrent exactement la même carte.
// Sans hook ni état : utilisable dans un composant serveur comme dans un composant client.
// À placer dans un parent qui porte la classe « group » (réactions au survol) et la variable --teinte.
export default function CorpsCartePokemon({ pokemon, titre, etiquette, prioritaire = false, transitionPartagee = false }: Props) {
  const numero = String(pokemon.id).padStart(4, "0");

  const illustration = pokemon.artwork ? (
    <Image
      src={pokemon.artwork}
      alt={`Illustration de ${pokemon.nomFr}`}
      fill
      // sizes dit au navigateur quelle largeur occupera l'image → il télécharge la bonne taille.
      sizes="144px"
      // Par défaut les images sont chargées « paresseusement » (lazy), à l'approche de l'écran.
      loading={prioritaire ? "eager" : "lazy"}
      // Au survol l'artwork grossit et monte : il dépasse du cadre de la carte.
      className="object-contain drop-shadow-[0_10px_12px_rgb(15_23_42/0.25)] transition-transform duration-200 group-hover:-translate-y-2 group-hover:scale-[1.18] motion-reduce:transition-none motion-reduce:group-hover:translate-y-0 motion-reduce:group-hover:scale-100"
    />
  ) : (
    <div className="h-full w-full rounded-full bg-piste" aria-hidden="true" />
  );

  return (
    <>
      {/* Décor découpé aux arrondis de la carte (l'artwork, lui, n'est pas découpé et peut « sortir »). */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
        {/* Dégradé de la teinte */}
        <span className="absolute inset-0 bg-[linear-gradient(145deg,var(--teinte),transparent_60%)] opacity-30 transition-opacity duration-200 group-hover:opacity-50 motion-reduce:transition-none dark:opacity-25 dark:group-hover:opacity-45" />
        {/* Effet verre : un reflet fixe en biais dans le coin haut gauche, comme sur une vitre… */}
        <span className="absolute inset-0 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-texte)_10%,transparent)_0%,transparent_32%)]" />
        {/* … et un liseré de lumière sur l'arête du haut (ombre intérieure d'un pixel). */}
        <span className="absolute inset-0 rounded-3xl shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--color-texte)_40%,transparent),inset_0_-1px_0_0_color-mix(in_srgb,var(--color-texte)_8%,transparent)]" />
        {/* Numéro en filigrane : petit, calé à droite à l'intérieur, très discret */}
        <span className="absolute right-3 top-12 font-titre text-4xl font-bold leading-none text-texte opacity-[0.06] sm:right-4 sm:text-5xl">
          {numero}
        </span>
      </span>

      <p className="etiquette relative flex min-h-8 items-center">{etiquette ?? `N° ${numero}`}</p>

      <div className="relative mx-auto aspect-square w-full max-w-36">
        {/* Halo diffus derrière l'artwork */}
        <span aria-hidden="true" className="absolute inset-2 rounded-full bg-[var(--teinte)] opacity-30 blur-2xl dark:opacity-40" />
        {/* Halo net au sol, comme une ombre portée de la couleur du type ; il s'élargit au survol */}
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-1/2 h-3 w-3/5 -translate-x-1/2 rounded-[100%] bg-[var(--teinte)] opacity-70 blur-xs transition-transform duration-200 group-hover:scale-x-125 motion-reduce:transition-none dark:opacity-60"
        />
        {pokemon.artwork && transitionPartagee ? (
          // Transition partagée : la fiche porte le même nom → le navigateur anime l'image
          // de la carte vers la fiche (et inversement) pendant la navigation.
          <ViewTransition name={`artwork-${pokemon.id}`} share="morph" default="none">
            {illustration}
          </ViewTransition>
        ) : (
          illustration
        )}
      </div>

      {/* truncate + une seule ligne de badges : toutes les cartes ont exactement la même hauteur. */}
      <h2 className="relative truncate font-titre text-xl font-semibold">{titre}</h2>

      <ul className="relative flex flex-nowrap gap-1">
        {pokemon.types.map((type) => (
          <li key={type} className="flex min-w-0">
            <BadgeType type={type} petit />
          </li>
        ))}
      </ul>
    </>
  );
}

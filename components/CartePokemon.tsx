import { ViewTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import BadgeType from "@/components/BadgeType";
import BoutonFavori from "@/components/BoutonFavori";
import BoutonSacoche from "@/components/BoutonSacoche";
import CarteInclinable from "@/components/CarteInclinable";
import type { Pokemon } from "@/lib/conversion";
import { styleTeinte } from "@/lib/teinte";

type Props = {
  pokemon: Pokemon;
  // true pour les premières cartes visibles : leur image est chargée en priorité.
  prioritaire?: boolean;
};

// Carte d'un Pokémon dans la grille : composant serveur. Seuls les boutons et l'inclinaison 3D
// sont des composants client. La variable --teinte (couleur du type principal) colore le dégradé,
// les halos et la lueur de survol.
export default function CartePokemon({ pokemon, prioritaire = false }: Props) {
  const numero = String(pokemon.id).padStart(4, "0");

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
          className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 shadow-[0_0_0_1px_var(--teinte),0_18px_36px_-20px_var(--teinte)] transition-opacity duration-200 group-hover:opacity-100 motion-reduce:transition-none"
        />

        <Link href={`/pokemon/${pokemon.nom}`} className="verre relative flex h-full flex-col gap-2 p-3 sm:p-4">
          {/* Décor découpé aux arrondis de la carte (l'artwork, lui, n'est pas découpé et peut « sortir »). */}
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
            {/* Dégradé de la teinte */}
            <span className="absolute inset-0 bg-[linear-gradient(145deg,var(--teinte),transparent_60%)] opacity-20 transition-opacity duration-200 group-hover:opacity-35 motion-reduce:transition-none dark:opacity-15 dark:group-hover:opacity-30" />
            {/* Effet verre : un reflet fixe en biais dans le coin haut gauche, comme sur une vitre… */}
            <span className="absolute inset-0 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-texte)_10%,transparent)_0%,transparent_32%)]" />
            {/* … et un liseré de lumière sur l'arête du haut (ombre intérieure d'un pixel). */}
            <span className="absolute inset-0 rounded-3xl shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--color-texte)_40%,transparent),inset_0_-1px_0_0_color-mix(in_srgb,var(--color-texte)_8%,transparent)]" />
            {/* Numéro en filigrane : petit, calé à droite à l'intérieur, très discret */}
            <span className="absolute right-3 top-12 font-titre text-4xl font-bold leading-none text-texte opacity-[0.06] sm:right-4 sm:text-5xl">
              {numero}
            </span>
          </span>

          <p className="etiquette relative flex min-h-8 items-center">N° {numero}</p>

          <div className="relative mx-auto aspect-square w-full max-w-36">
            {/* Halo diffus derrière l'artwork (volontairement doux : il doit rester lisible dans les deux thèmes) */}
            <span aria-hidden="true" className="absolute inset-2 rounded-full bg-[var(--teinte)] opacity-20 blur-2xl dark:opacity-25" />
            {/* Halo net au sol, comme une ombre portée de la couleur du type ; il s'élargit au survol */}
            <span
              aria-hidden="true"
              className="absolute bottom-0 left-1/2 h-3 w-3/5 -translate-x-1/2 rounded-[100%] bg-[var(--teinte)] opacity-45 blur-xs transition-transform duration-200 group-hover:scale-x-125 motion-reduce:transition-none dark:opacity-40"
            />
            {pokemon.artwork ? (
              // Transition partagée : la fiche porte le même nom → le navigateur anime l'image
              // de la carte vers la fiche (et inversement) pendant la navigation.
              <ViewTransition name={`artwork-${pokemon.id}`} share="morph" default="none">
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
              </ViewTransition>
            ) : (
              <div className="h-full w-full rounded-full bg-piste" aria-hidden="true" />
            )}
          </div>

          {/* truncate + une seule ligne de badges : toutes les cartes ont exactement la même hauteur. */}
          <h2 className="relative truncate font-titre text-xl font-semibold">{pokemon.nomFr}</h2>

          <ul className="relative flex flex-nowrap gap-1">
            {pokemon.types.map((type) => (
              <li key={type} className="flex min-w-0">
                <BadgeType type={type} petit />
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
      </CarteInclinable>
    </article>
  );
}

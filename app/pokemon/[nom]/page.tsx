import { Suspense, ViewTransition } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import BadgeType from "@/components/BadgeType";
import BarreStat from "@/components/BarreStat";
import BoutonCri from "@/components/BoutonCri";
import BoutonFavori from "@/components/BoutonFavori";
import BoutonSacoche from "@/components/BoutonSacoche";
import OngletsFiche from "@/components/OngletsFiche";
import SqueletteFiche from "@/components/SqueletteFiche";
import VitrineFiche from "@/components/VitrineFiche";
import { formaterMesure } from "@/lib/conversion";
import { recupererPokemon, recupererTousLesNoms } from "@/lib/pokeapi";
import { LIBELLES_STATS } from "@/lib/stats";
import { styleTeinte } from "@/lib/teinte";

// Route dynamique : le dossier [nom] capte /pokemon/pikachu, /pokemon/mew…
// PageProps est un type généré par Next : ici params est une PROMESSE de { nom: string }.
type Props = PageProps<"/pokemon/[nom]">;

// Au build, Next prépare à l'avance les fiches des 151 premiers Pokémon (pages statiques).
// Les autres sont générées à la première visite, puis mises en cache.
export async function generateStaticParams() {
  const noms = await recupererTousLesNoms();
  return noms.slice(0, 151).map((nom) => ({ nom }));
}

// Titre de l'onglet calculé à partir des données : « Pikachu · Pokédex ».
// recupererPokemon est en cache : l'appeler ici ET dans la page ne fait qu'une seule requête.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { nom } = await params;
  const pokemon = await recupererPokemon(nom);
  if (!pokemon) return { title: "Pokémon introuvable" };
  return {
    title: pokemon.nomFr,
    description: `Fiche de ${pokemon.nomFr} : types, taille, poids, statistiques et évolutions.`,
  };
}

// La page elle-même ne lit pas params : elle le transmet à Fiche, placée sous <Suspense>.
// Ainsi, pour un Pokémon non préparé au build, le squelette s'affiche tout de suite.
export default function PagePokemon({ params, searchParams }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/" className="etiquette flex min-h-11 items-center self-start hover:text-texte">
        ← Tous les Pokémon
      </Link>
      <Suspense fallback={<SqueletteFiche />}>
        <Fiche params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

// Fiche lit params (avec await) mais se contente de TRANSMETTRE searchParams sans le lire :
// le haut de la fiche reste donc préparé à l'avance, seul le bloc des onglets dépend de la requête.
async function Fiche({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const { nom } = await params;
  const pokemon = await recupererPokemon(nom);

  // null = ce Pokémon n'existe pas → page 404 (app/not-found.tsx).
  if (!pokemon) notFound();

  const numero = String(pokemon.id).padStart(4, "0");
  // Somme des six statistiques (reduce additionne les valeurs une à une, en partant de 0).
  const total = LIBELLES_STATS.reduce((somme, stat) => somme + pokemon.stats[stat.cle], 0);

  return (
    // --teinte : couleur du type principal, utilisée par le décor de l'illustration et par les statistiques.
    <div className="flex flex-col gap-8" style={styleTeinte(pokemon.types[0])}>
      <div className="grid items-start gap-6 md:grid-cols-2">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
          {/* Vitrine : la carte holographique 3D remplace l'illustration dès qu'elle est prête.
              L'écran d'illustration ci-dessous reste l'affichage d'attente et le repli sans 3D. */}
          <VitrineFiche pokemon={pokemon}>
            {/* Écran de l'illustration */}
            <div className="verre relative aspect-square w-full overflow-hidden">
              <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(145deg,var(--teinte),transparent_65%)] opacity-35 dark:opacity-30" />
              {/* Numéro en filigrane */}
              <span aria-hidden="true" className="absolute right-6 top-6 font-titre text-6xl font-bold leading-none text-texte opacity-[0.07]">
                {numero}
              </span>
              {/* Halo diffus + halo net au sol, de la teinte du type */}
              <span aria-hidden="true" className="absolute inset-1/4 rounded-full bg-[var(--teinte)] opacity-35 blur-3xl dark:opacity-45" />
              <span aria-hidden="true" className="absolute bottom-8 left-1/2 h-5 w-1/2 -translate-x-1/2 rounded-[100%] bg-[var(--teinte)] opacity-70 blur-xs dark:opacity-60" />
              {pokemon.artwork ? (
                // Lévitation douce (CSS), coupée si l'utilisateur a demandé moins d'animations.
                <div className="absolute inset-8 animate-levitation motion-reduce:animate-none">
                  {/* Même nom que sur la carte de la grille → transition partagée de l'image. */}
                  <ViewTransition name={`artwork-${pokemon.id}`} share="morph" default="none">
                    <Image
                      src={pokemon.artwork}
                      alt={`Illustration de ${pokemon.nomFr}`}
                      fill
                      sizes="(min-width: 768px) 320px, 80vw"
                      loading="eager"
                      className="object-contain drop-shadow-[0_16px_18px_rgb(15_23_42/0.3)]"
                    />
                  </ViewTransition>
                </div>
              ) : (
                <p className="relative flex h-full items-center justify-center text-sm text-texte-doux">Pas d&apos;illustration</p>
              )}
            </div>
          </VitrineFiche>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <p className="etiquette">N° {numero}</p>
            <h1 className="font-titre text-3xl font-bold sm:text-4xl">{pokemon.nomFr}</h1>
            <ul className="flex flex-wrap gap-2" aria-label="Types">
              {pokemon.types.map((type) => (
                <li key={type}>
                  <BadgeType type={type} />
                </li>
              ))}
            </ul>
          </div>

          {/* dl = liste de paires « terme / valeur ». Deux petites gélules : ces mesures sont déjà
              écrites sur la carte, elles n'ont pas besoin de deux grands panneaux. */}
          <dl className="flex flex-wrap gap-2">
            <div className="flex items-baseline gap-2 rounded-full border border-bordure-verre bg-surface px-4 py-2">
              <dt className="etiquette">Taille</dt>
              <dd className="font-titre text-sm font-semibold">{formaterMesure(pokemon.taille, "m")}</dd>
            </div>
            <div className="flex items-baseline gap-2 rounded-full border border-bordure-verre bg-surface px-4 py-2">
              <dt className="etiquette">Poids</dt>
              <dd className="font-titre text-sm font-semibold">{formaterMesure(pokemon.poids, "kg")}</dd>
            </div>
          </dl>

          <div className="flex flex-wrap items-center gap-2">
            <BoutonSacoche pokemon={pokemon} />
            <BoutonFavori nom={pokemon.nom} nomFr={pokemon.nomFr} variante="fiche" />
            <BoutonCri url={pokemon.cri} nomFr={pokemon.nomFr} />
          </div>

          {/* Panneau des statistiques, assorti à la carte : même verre teinté de la couleur du type. */}
          <section aria-labelledby="titre-stats" className="verre relative flex flex-col gap-4 overflow-hidden p-4 sm:p-6">
            {/* Décor (comme sur les cartes de la grille) : dégradé de la teinte, reflet en biais, liseré de lumière en haut. */}
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,var(--teinte),transparent_60%)] opacity-20" />
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-texte)_10%,transparent)_0%,transparent_32%)]" />
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-3xl shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--color-texte)_40%,transparent)]" />

            <div className="relative flex items-baseline justify-between gap-4">
              <h2 id="titre-stats" className="font-titre text-xl font-semibold">
                Statistiques
              </h2>
              {/* Total des six statistiques : donne tout de suite une idée de la puissance du Pokémon. */}
              <p className="flex items-baseline gap-2">
                <span className="etiquette">Total</span>
                <span className="font-titre text-xl font-semibold tabular-nums">{total}</span>
              </p>
            </div>
            <ul className="relative flex flex-col gap-2">
              {LIBELLES_STATS.map((stat, index) => (
                <BarreStat key={stat.cle} libelle={stat.libelle} valeur={pokemon.stats[stat.cle]} index={index} teinte />
              ))}
            </ul>
          </section>
        </div>
      </div>

      {/* Onglets « Évolutions » / « Attaques ». L'onglet actif est dans l'adresse (?onglet=attaques),
          lue sous Suspense : en attendant, on affiche un squelette. */}
      <Suspense fallback={<div role="status" aria-label="Chargement" className="h-48 animate-pulse rounded-3xl bg-piste motion-reduce:animate-none" />}>
        <OngletsFiche pokemon={pokemon} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

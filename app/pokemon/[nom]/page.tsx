import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import BadgeType from "@/components/BadgeType";
import BarreStat from "@/components/BarreStat";
import BoutonFavori from "@/components/BoutonFavori";
import BoutonSacoche from "@/components/BoutonSacoche";
import ChaineEvolution from "@/components/ChaineEvolution";
import SqueletteFiche from "@/components/SqueletteFiche";
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
export default function PagePokemon({ params }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/" className="etiquette flex min-h-11 items-center self-start hover:text-texte">
        ← Tous les Pokémon
      </Link>
      <Suspense fallback={<SqueletteFiche />}>
        <Fiche params={params} />
      </Suspense>
    </div>
  );
}

async function Fiche({ params }: { params: Props["params"] }) {
  const { nom } = await params;
  const pokemon = await recupererPokemon(nom);

  // null = ce Pokémon n'existe pas → page 404 (app/not-found.tsx).
  if (!pokemon) notFound();

  const numero = String(pokemon.id).padStart(4, "0");

  return (
    // --teinte : couleur du type principal, utilisée par le décor de l'illustration.
    <div className="flex flex-col gap-8" style={styleTeinte(pokemon.types[0])}>
      <div className="grid items-start gap-6 md:grid-cols-2">
        {/* Écran de l'illustration */}
        <div className="verre relative mx-auto aspect-square w-full max-w-sm overflow-hidden">
          <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(145deg,var(--teinte),transparent_65%)] opacity-35 dark:opacity-30" />
          {/* Numéro en filigrane */}
          <span aria-hidden="true" className="absolute right-6 top-6 font-titre text-6xl font-bold leading-none text-texte opacity-[0.07]">
            {numero}
          </span>
          {/* Halo diffus + halo net au sol, de la teinte du type */}
          <span aria-hidden="true" className="absolute inset-1/4 rounded-full bg-[var(--teinte)] opacity-35 blur-3xl dark:opacity-45" />
          <span aria-hidden="true" className="absolute bottom-8 left-1/2 h-5 w-1/2 -translate-x-1/2 rounded-[100%] bg-[var(--teinte)] opacity-70 blur-xs dark:opacity-60" />
          {pokemon.artwork ? (
            <Image
              src={pokemon.artwork}
              alt={`Illustration de ${pokemon.nomFr}`}
              fill
              sizes="(min-width: 768px) 384px, 90vw"
              loading="eager"
              className="object-contain p-8 drop-shadow-[0_16px_18px_rgb(15_23_42/0.3)]"
            />
          ) : (
            <p className="relative flex h-full items-center justify-center text-sm text-texte-doux">Pas d&apos;illustration</p>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <p className="etiquette">N° {numero}</p>
            <h1 className="font-titre text-3xl font-bold">{pokemon.nomFr}</h1>
            <ul className="flex flex-wrap gap-2" aria-label="Types">
              {pokemon.types.map((type) => (
                <li key={type}>
                  <BadgeType type={type} />
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <BoutonSacoche pokemon={pokemon} />
            <BoutonFavori nom={pokemon.nom} nomFr={pokemon.nomFr} variante="fiche" />
          </div>

          {/* dl = liste de paires « terme / valeur ». */}
          <dl className="grid grid-cols-2 gap-4">
            <div className="verre flex flex-col gap-2 p-4">
              <dt className="etiquette">Taille</dt>
              <dd className="font-titre text-xl font-semibold">{formaterMesure(pokemon.taille, "m")}</dd>
            </div>
            <div className="verre flex flex-col gap-2 p-4">
              <dt className="etiquette">Poids</dt>
              <dd className="font-titre text-xl font-semibold">{formaterMesure(pokemon.poids, "kg")}</dd>
            </div>
          </dl>

          <section aria-labelledby="titre-stats" className="verre flex flex-col gap-4 p-4 sm:p-6">
            <h2 id="titre-stats" className="font-titre text-xl font-semibold">
              Statistiques
            </h2>
            <ul className="flex flex-col gap-2">
              {LIBELLES_STATS.map((stat) => (
                <BarreStat key={stat.cle} libelle={stat.libelle} valeur={pokemon.stats[stat.cle]} />
              ))}
            </ul>
          </section>
        </div>
      </div>

      <section aria-labelledby="titre-evolutions" className="flex flex-col gap-4">
        <h2 id="titre-evolutions" className="font-titre text-xl font-semibold">
          Chaîne d&apos;évolution
        </h2>
        {/* Suspense imbriqué : la chaîne arrive après le reste, sans bloquer la fiche. */}
        <Suspense fallback={<p className="etiquette">Chargement des évolutions…</p>}>
          <ChaineEvolution nomEspece={pokemon.espece} nomActuel={pokemon.nom} />
        </Suspense>
      </section>
    </div>
  );
}

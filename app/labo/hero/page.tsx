// PROTOTYPE — quatre propositions pour le haut de la page d'accueil (titre, recherche, filtres), à comparer
// avant d'en choisir une. On y accède par l'adresse /labo/hero ; un onglet par proposition (?v=colonnes…)
// et « Actuel » pour revoir le haut de page d'aujourd'hui.
// La grille de cartes dessous est la vraie, INCHANGÉE : elle sert à juger l'ensemble.

import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import BarreRecherche from "@/components/BarreRecherche";
import FiltreTypes from "@/components/FiltreTypes";
import GrillePokemons from "@/components/GrillePokemons";
import HeroAccueil from "@/components/labo/HerosAccueil";
import SqueletteGrille from "@/components/SqueletteGrille";
import { recupererListe, recupererPokemonDuJour } from "@/lib/pokeapi";

export const metadata: Metadata = {
  title: "Labo · Haut de l'accueil",
  robots: { index: false },
};

const VARIANTES = [
  { cle: "colonnes", libelle: "A · Deux colonnes" },
  { cle: "centre", libelle: "B · Centré" },
  { cle: "console", libelle: "C · Console" },
  { cle: "affiche", libelle: "D · Affiche" },
  { cle: "actuel", libelle: "Actuel" },
] as const;

type Props = PageProps<"/labo/hero">;

export default function PageLaboHero({ searchParams }: Props) {
  return (
    // searchParams est une donnée de la requête : on la lit dans un composant sous <Suspense>.
    <Suspense fallback={<SqueletteGrille />}>
      <Contenu searchParams={searchParams} />
    </Suspense>
  );
}

async function Contenu({ searchParams }: { searchParams: Props["searchParams"] }) {
  const { v } = await searchParams;
  // Validation : toute valeur inconnue (?v=nimporte) retombe sur la première proposition.
  const active = VARIANTES.find((variante) => variante.cle === v)?.cle ?? "colonnes";

  // La liste et le Pokémon du jour (deux fonctions en cache), demandés en parallèle.
  const [liste, vedette] = await Promise.all([recupererListe("", null, 1), recupererPokemonDuJour()]);

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Propositions" className="flex flex-wrap items-center gap-2 rounded-3xl border border-dashed border-bordure bg-fond/60 p-2 backdrop-blur-md">
        <p className="etiquette px-2">Labo · haut de l&apos;accueil</p>
        <ul className="flex flex-wrap gap-1">
          {VARIANTES.map((variante) => (
            <li key={variante.cle}>
              <Link
                href={`/labo/hero?v=${variante.cle}`}
                scroll={false}
                aria-current={active === variante.cle ? "page" : undefined}
                className={
                  active === variante.cle
                    ? "flex min-h-9 items-center rounded-full bg-accent-plein px-4 text-sm font-semibold text-sur-accent shadow-lueur"
                    : "flex min-h-9 items-center rounded-full px-4 text-sm font-medium text-texte-doux hover:bg-piste hover:text-texte"
                }
              >
                {variante.libelle}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {active === "actuel" || !vedette ? (
        // Le haut de page d'aujourd'hui, recopié de app/page.tsx.
        <>
          <header className="flex flex-col gap-2">
            <p className="etiquette">Pokédex national</p>
            <h1 className="font-titre text-3xl font-bold">Tous les Pokémon</h1>
          </header>
          <Suspense fallback={<div className="h-28" />}>
            <BarreRecherche />
          </Suspense>
          <FiltreTypes q="" typeActif={null} />
        </>
      ) : (
        <HeroAccueil variante={active} vedette={vedette} />
      )}

      <p className="etiquette">
        {liste.total.toLocaleString("fr-FR")} Pokémon trouvés
      </p>
      <GrillePokemons pokemons={liste.pokemons} />
    </div>
  );
}

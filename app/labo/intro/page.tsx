// PROTOTYPE — deux introductions pour l'accueil, jouées au défilement : une Pokéball géante qui s'ouvre,
// ou un Pokédex géant dont le volet se relève. Elle n'est liée depuis aucun menu : adresse /labo/intro.
// Le choix vit dans l'adresse (?v=pokeball ou ?v=pokedex), comme les onglets de la fiche.
// Sous l'introduction, c'est la vraie grille de cartes, pour juger l'enchaînement avec le contenu.

import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import GrillePokemons from "@/components/GrillePokemons";
import SqueletteGrille from "@/components/SqueletteGrille";
import IntroPokeball from "@/components/labo/IntroPokeball";
import IntroPokedex from "@/components/labo/IntroPokedex";
import { recupererListe } from "@/lib/pokeapi";

export const metadata: Metadata = {
  title: "Labo · Introduction",
  robots: { index: false },
};

const VARIANTES = [
  { cle: "pokeball", libelle: "A · Pokéball" },
  { cle: "pokedex", libelle: "B · Pokédex" },
] as const;

type Props = PageProps<"/labo/intro">;

export default function PageLaboIntro({ searchParams }: Props) {
  return (
    // searchParams est une donnée de la requête : on la lit dans un composant sous <Suspense>.
    <Suspense fallback={<SqueletteGrille />}>
      <Contenu searchParams={searchParams} />
    </Suspense>
  );
}

async function Contenu({ searchParams }: { searchParams: Props["searchParams"] }) {
  const { v } = await searchParams;
  // Validation : toute valeur inconnue retombe sur le Pokédex (la version en cours de travail).
  const active = v === "pokeball" ? "pokeball" : "pokedex";
  const liste = await recupererListe("", null, 1);

  const page = (
    <>
      <header className="flex flex-col gap-2">
        <p className="etiquette">Pokédex national</p>
        <h1 className="font-titre text-3xl font-bold">Tous les Pokémon</h1>
      </header>
      <GrillePokemons pokemons={liste.pokemons} />
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Onglets du labo, fixés en bas à gauche pour rester accessibles pendant le défilement. */}
      <nav aria-label="Propositions" className="fixed bottom-4 left-4 z-30 flex gap-1 rounded-full border border-dashed border-bordure bg-surface-pleine p-1">
        {VARIANTES.map((variante) => (
          <Link
            key={variante.cle}
            href={`/labo/intro?v=${variante.cle}`}
            aria-current={active === variante.cle ? "page" : undefined}
            className={
              active === variante.cle
                ? "flex min-h-9 items-center rounded-full bg-accent px-4 text-sm font-semibold text-sur-accent"
                : "flex min-h-9 items-center rounded-full px-4 text-sm font-medium text-texte-doux hover:bg-piste hover:text-texte"
            }
          >
            {variante.libelle}
          </Link>
        ))}
      </nav>

      {/* La vraie page (titre + grille) : pour le Pokédex, elle est confiée à l'introduction, qui la fait surgir
          de l'écran ; pour la Pokéball, elle suit simplement l'introduction.
          -mt-6 : annule la marge haute de la page, pour que l'objet soit centré dans l'écran dès l'arrivée.
          key : changer d'onglet recrée l'introduction, qui repart du début. */}
      <div className="-mt-6 flex flex-col gap-6" key={active}>
        {active === "pokedex" ? (
          <IntroPokedex>
            {page}
          </IntroPokedex>
        ) : (
          <>
            <IntroPokeball total={liste.total} />
            {page}
          </>
        )}
      </div>
    </div>
  );
}

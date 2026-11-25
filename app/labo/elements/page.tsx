// PROTOTYPE — séquence de FIN de page « l'écran brûle » : après la liste, Dracaufeu crache son feu, l'écran se
// consume et l'écran de fin (« Attrapez-les tous ! », retour à la liste) apparaît à travers. On y accède par /labo/elements ;
// un onglet par variante du shader (?v=…). La grille au-dessus est la vraie.

import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import CarrouselVedettes from "@/components/CarrouselVedettes";
import GrillePokemons from "@/components/GrillePokemons";
import ScenesElements from "@/components/ScenesElements";
import SqueletteGrille from "@/components/SqueletteGrille";
import { recupererListe } from "@/lib/pokeapi";
import type { VarianteFeu } from "@/lib/scenes-feu";

export const metadata: Metadata = {
  title: "Labo · La page brûle",
  robots: { index: false },
};

const VARIANTES: { cle: VarianteFeu; libelle: string }[] = [
  { cle: "plaques", libelle: "V2 · Plaques" },
  { cle: "erosion", libelle: "V2 · Érosion" },
  { cle: "cinema", libelle: "1 · Cinéma" },
  { cle: "pyroclastique", libelle: "2 · Pyroclastique" },
  { cle: "leger", libelle: "3 · Ultra-léger" },
];

type Props = PageProps<"/labo/elements">;

export default function PageLaboElements({ searchParams }: Props) {
  return (
    // searchParams est une donnée de la requête : on la lit dans un composant sous <Suspense>.
    <Suspense fallback={<SqueletteGrille />}>
      <Contenu searchParams={searchParams} />
    </Suspense>
  );
}

async function Contenu({ searchParams }: { searchParams: Props["searchParams"] }) {
  const { v } = await searchParams;
  // Validation : toute valeur inconnue (?v=nimporte) retombe sur la première variante.
  const active = VARIANTES.find((variante) => variante.cle === v)?.cle ?? "erosion";
  const liste = await recupererListe("", null, 1);

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Variantes" className="flex flex-wrap items-center gap-2 rounded-3xl border border-dashed border-bordure p-2">
        <p className="etiquette px-2">Labo · la page brûle</p>
        <ul className="flex flex-wrap gap-1">
          {VARIANTES.map((variante) => (
            <li key={variante.cle}>
              <Link
                href={`/labo/elements?v=${variante.cle}`}
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

      {/* Le haut de l'accueil : titre en très gros, puis le carrousel des vedettes. */}
      <header className="flex flex-col items-center gap-2 pt-6 text-center">
        <h1 className="font-titre text-5xl font-bold tracking-tight sm:text-7xl lg:text-8xl">Pokédex National</h1>
        <p className="text-sm text-texte-doux sm:text-base">{liste.total.toLocaleString("fr-FR")} Pokémon à découvrir</p>
      </header>
      <CarrouselVedettes />

      {/* La liste (id : cible du lien « Retour à la liste » de l'écran de fin). */}
      <div id="haut-liste" className="scroll-mt-28" />
      <GrillePokemons pokemons={liste.pokemons} />

      {/* Fin de page : Dracaufeu brûle l'écran et révèle l'écran de fin (les enfants du composant).
          key : changer de variante recrée le composant (nouveau canvas, nouveau shader). */}
      <ScenesElements key={active} variante={active}>
        <section aria-labelledby="titre-fin" className="flex h-[72svh] flex-col items-center justify-center gap-8 text-center">
          <h2 id="titre-fin" className="font-titre text-5xl font-bold tracking-tight sm:text-7xl lg:text-8xl">
            Attrapez-les tous !
          </h2>
          {/* Une navigation dans la page : un lien (ancre vers le haut de la liste). */}
          <a href="#haut-liste" className="bouton bouton-principal">
            Retour à la liste des Pokémon
          </a>
        </section>
      </ScenesElements>
    </div>
  );
}

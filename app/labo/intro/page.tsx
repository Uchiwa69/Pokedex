// PROTOTYPE — introduction de l'accueil : une Pokéball géante qui s'ouvre quand on fait défiler.
// Elle n'est liée depuis aucun menu : on y accède par l'adresse /labo/intro.
// Sous l'introduction, c'est la vraie grille de cartes, pour juger l'enchaînement avec le contenu.

import type { Metadata } from "next";
import GrillePokemons from "@/components/GrillePokemons";
import IntroPokeball from "@/components/labo/IntroPokeball";
import { recupererListe } from "@/lib/pokeapi";

export const metadata: Metadata = {
  title: "Labo · Introduction",
  robots: { index: false },
};

export default async function PageLaboIntro() {
  const liste = await recupererListe("", null, 1);

  return (
    <div className="flex flex-col gap-6">
      {/* -mt-6 : annule la marge haute de la page, pour que la balle soit centrée dans l'écran dès l'arrivée. */}
      <div className="-mt-6">
        <IntroPokeball total={liste.total} />
      </div>
      <header className="flex flex-col gap-2">
        <p className="etiquette">Pokédex national</p>
        <h1 className="font-titre text-3xl font-bold">Tous les Pokémon</h1>
      </header>
      <GrillePokemons pokemons={liste.pokemons} />
    </div>
  );
}

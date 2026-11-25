// PROTOTYPE — séquence « feu contre eau » à faire défiler avant la liste des Pokémon. On y accède par
// l'adresse /labo/elements. La grille dessous est la vraie : elle sert à juger l'arrivée sur la liste.

import type { Metadata } from "next";
import GrillePokemons from "@/components/GrillePokemons";
import ScenesElements from "@/components/ScenesElements";
import { recupererListe } from "@/lib/pokeapi";

export const metadata: Metadata = {
  title: "Labo · Feu contre eau",
  robots: { index: false },
};

export default async function PageLaboElements() {
  // Fonction en cache ("use cache") : pas besoin de <Suspense> ici.
  const liste = await recupererListe("", null, 1);

  return (
    <div className="flex flex-col gap-6">
      <ScenesElements />
      <header className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-titre text-3xl font-bold tracking-tight sm:text-4xl">Pokédex National</h1>
        <p className="text-sm text-texte-doux">{liste.total.toLocaleString("fr-FR")} Pokémon</p>
      </header>
      <GrillePokemons pokemons={liste.pokemons} />
    </div>
  );
}

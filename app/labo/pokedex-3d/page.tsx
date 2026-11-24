// PROTOTYPE — le modèle 3D du Pokédex, seul, pour juger son rendu face aux photos de l'accueil.
// Elle n'est liée depuis aucun menu : on y accède par l'adresse /labo/pokedex-3d.

import type { Metadata } from "next";
import Pokedex3D from "@/components/labo/Pokedex3D";

export const metadata: Metadata = {
  title: "Labo · Pokédex 3D",
  robots: { index: false },
};

export default function PageLaboPokedex3D() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="etiquette">Laboratoire · prototype non intégré</p>
        <h1 className="font-titre text-3xl font-bold">Pokédex en 3D</h1>
        <p className="max-w-3xl text-sm text-texte-doux">
          Un vrai modèle en volume, à comparer avec les photos de l&apos;introduction de l&apos;accueil. Fais-le tourner, ouvre
          et ferme le volet, allume l&apos;écran.
        </p>
      </header>
      <Pokedex3D />
    </div>
  );
}

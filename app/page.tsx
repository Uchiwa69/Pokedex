import { Suspense } from "react";
import GrillePokemons from "@/components/GrillePokemons";
import SqueletteGrille from "@/components/SqueletteGrille";

export default function PageAccueil() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-titre text-3xl font-bold">Tous les Pokémon</h1>

      {/* Le titre s'affiche tout de suite ; la grille arrive quand ses données sont prêtes.
          En attendant, React montre le squelette. */}
      <Suspense fallback={<SqueletteGrille />}>
        <GrillePokemons page={1} />
      </Suspense>
    </div>
  );
}

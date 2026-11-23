import SqueletteGrille from "@/components/SqueletteGrille";

// loading.tsx : Next enveloppe automatiquement la page dans un <Suspense> dont voici le fallback.
// Il s'affiche pendant une navigation, tant que la page n'est pas prête.
export default function Chargement() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-titre text-3xl font-bold">Tous les Pokémon</h1>
      <SqueletteGrille />
    </div>
  );
}

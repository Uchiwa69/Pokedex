"use client";

import EtatVide from "@/components/EtatVide";
import GrillePokemons from "@/components/GrillePokemons";
import SqueletteGrille from "@/components/SqueletteGrille";
import { usePokemons } from "@/hooks/usePokemons";
import { useFavoris, useFavorisPrets } from "@/stores/favoris";

// Les favoris vivent dans le localStorage : seul le navigateur les connaît.
// Cette liste est donc un composant client qui charge ses données lui-même (hook usePokemons).
export default function ListeFavoris() {
  const noms = useFavoris((etat) => etat.noms);
  const prets = useFavorisPrets();
  const { pokemons, chargement, erreur, reessayer } = usePokemons(noms);

  // 1. Le localStorage n'a pas encore été relu : on ne sait pas s'il y a des favoris.
  if (!prets) return <SqueletteGrille nombre={4} />;

  // 2. Liste vide.
  if (noms.length === 0) {
    return (
      <EtatVide
        titre="Aucun favori pour le moment"
        message="Clique sur l'étoile d'un Pokémon pour le retrouver ici."
        lien={{ href: "/", libelle: "Voir tous les Pokémon" }}
      />
    );
  }

  // 3. Erreur de chargement.
  if (erreur) {
    return (
      <div role="alert" className="flex flex-col items-center gap-4 rounded-2xl border border-bordure bg-surface px-6 py-8 text-center">
        <p className="text-sm text-texte-doux">Impossible de charger tes favoris. Vérifie ta connexion.</p>
        <button
          type="button"
          onClick={reessayer}
          className="flex min-h-11 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-sur-accent"
        >
          Réessayer
        </button>
      </div>
    );
  }

  // 4. Chargement (premier affichage : rien à montrer encore).
  if (chargement && pokemons.length === 0) return <SqueletteGrille nombre={noms.length} />;

  // 5. Les données.
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-texte-doux">
        {noms.length} {noms.length > 1 ? "favoris" : "favori"}
      </p>
      <GrillePokemons pokemons={pokemons} />
    </div>
  );
}

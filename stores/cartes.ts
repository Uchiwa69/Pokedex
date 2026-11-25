import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nettoyerCarte, type CartePerso } from "@/lib/carte-perso";

type EtatCartes = {
  // Une carte personnalisée par Pokémon, rangée sous son nom anglais ("charizard").
  cartes: Record<string, CartePerso>;
  enregistrer: (nom: string, carte: CartePerso) => void;
  supprimer: (nom: string) => void;
};

// Les cartes créées dans l'atelier (app/pokemon/[nom]/carte). Même fonctionnement que les favoris et la
// sacoche : persist les range dans le localStorage, skipHydration évite une erreur d'hydratation (la
// relecture est lancée par components/HydratationStores.tsx, après le premier affichage).
// Les règles (2 attaques au plus, pas de doublon, surnom limité) sont appliquées ICI, par nettoyerCarte :
// quel que soit le composant qui enregistre, il est impossible de les contourner.
export const useCartes = create<EtatCartes>()(
  persist(
    (set) => ({
      cartes: {},

      enregistrer: (nom, carte) => set((etat) => ({ cartes: { ...etat.cartes, [nom]: nettoyerCarte(carte) } })),

      supprimer: (nom) =>
        set((etat) => {
          // Copie de l'objet sans la carte de ce Pokémon.
          const cartes = { ...etat.cartes };
          delete cartes[nom];
          return { cartes };
        }),
    }),
    {
      name: "pokedex-cartes",
      skipHydration: true,
    },
  ),
);

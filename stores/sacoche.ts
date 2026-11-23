import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Pokemon } from "@/lib/conversion";

export const TAILLE_MAX_SACOCHE = 6;
export const LONGUEUR_MAX_SURNOM = 12;

export type Membre = {
  pokemon: Pokemon;
  surnom: string;
};

type EtatSacoche = {
  membres: Membre[];
  // Nom du dernier Pokémon ajouté : la page Sacoche joue son effet d'entrée « Poké Ball », puis l'efface.
  dernierAjout: string | null;
  ajouter: (pokemon: Pokemon) => void;
  retirer: (nom: string) => void;
  renommer: (nom: string, surnom: string) => void;
  vider: () => void;
  // Réordonne l'équipe : reçoit les noms dans le nouvel ordre (glisser-déposer).
  reordonner: (noms: string[]) => void;
  // Déplace un membre d'un cran (-1 = vers le début, +1 = vers la fin) : équivalent clavier du glisser-déposer.
  deplacer: (nom: string, sens: -1 | 1) => void;
  accuserAjout: () => void;
};

// Les RÈGLES MÉTIER sont appliquées ICI, dans le store, et pas dans les boutons :
// quel que soit le composant qui appelle ajouter(), il est impossible de tricher.
export const useSacoche = create<EtatSacoche>()(
  persist(
    (set) => ({
      membres: [],
      dernierAjout: null,

      ajouter: (pokemon) =>
        set((etat) => {
          // Règle 1 : 6 Pokémon maximum.
          if (etat.membres.length >= TAILLE_MAX_SACOCHE) return etat;
          // Règle 2 : pas de doublon.
          if (etat.membres.some((m) => m.pokemon.nom === pokemon.nom)) return etat;
          // Renvoyer `etat` tel quel = aucun changement, donc aucun nouveau rendu.

          // Règle 3 : chaque membre a un surnom (par défaut, son nom français).
          return {
            membres: [...etat.membres, { pokemon, surnom: pokemon.nomFr }],
            dernierAjout: pokemon.nom,
          };
        }),

      retirer: (nom) =>
        set((etat) => ({
          membres: etat.membres.filter((m) => m.pokemon.nom !== nom),
        })),

      renommer: (nom, surnom) =>
        set((etat) => ({
          membres: etat.membres.map((m) => {
            if (m.pokemon.nom !== nom) return m;
            // Surnom nettoyé et limité ; s'il est vide, on revient au nom français.
            const propre = surnom.trim().slice(0, LONGUEUR_MAX_SURNOM);
            return { ...m, surnom: propre || m.pokemon.nomFr };
          }),
        })),

      vider: () => set({ membres: [], dernierAjout: null }),

      reordonner: (noms) =>
        set((etat) => {
          // On reconstruit la liste dans l'ordre demandé, en ignorant tout nom inconnu.
          const dansLOrdre = noms
            .map((nom) => etat.membres.find((m) => m.pokemon.nom === nom))
            .filter((m): m is Membre => m !== undefined);
          // Sécurité : si la liste reçue est incomplète, on ne change rien (aucun membre ne peut disparaître).
          if (dansLOrdre.length !== etat.membres.length) return etat;
          return { membres: dansLOrdre };
        }),

      deplacer: (nom, sens) =>
        set((etat) => {
          const depart = etat.membres.findIndex((m) => m.pokemon.nom === nom);
          const arrivee = depart + sens;
          if (depart === -1 || arrivee < 0 || arrivee >= etat.membres.length) return etat;
          // Copie du tableau, puis échange des deux cases.
          const membres = [...etat.membres];
          [membres[depart], membres[arrivee]] = [membres[arrivee], membres[depart]];
          return { membres };
        }),

      accuserAjout: () => set({ dernierAjout: null }),
    }),
    {
      name: "pokedex-sacoche",
      skipHydration: true, // même raison que pour les favoris (voir stores/favoris.ts)
    },
  ),
);

// S'abonne à la fin de la relecture du localStorage.
// Sur le serveur il n'y a pas de localStorage : Zustand n'y crée pas l'outil `persist`, d'où le « ?. ».
function abonnerFinHydratation(rappel: () => void) {
  return useSacoche.persist?.onFinishHydration(rappel) ?? (() => {});
}

// true une fois le localStorage relu. Sert à ne pas afficher un état « vide » trop tôt.
export function useSacochePrete(): boolean {
  return useSyncExternalStore(
    abonnerFinHydratation,
    () => useSacoche.persist?.hasHydrated() ?? false, // valeur dans le navigateur
    () => false, // valeur sur le serveur
  );
}

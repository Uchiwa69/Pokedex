import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

// Store Zustand des favoris : un état global, partagé par tous les composants, sans Provider.
type EtatFavoris = {
  noms: string[]; // noms anglais des Pokémon favoris ("pikachu")
  basculer: (nom: string) => void; // ajoute s'il est absent, retire s'il est présent
};

export const useFavoris = create<EtatFavoris>()(
  // persist : recopie l'état dans le localStorage, pour le retrouver à la prochaine visite.
  persist(
    (set) => ({
      noms: [],
      basculer: (nom) =>
        set((etat) => ({
          // On crée toujours un NOUVEAU tableau (on ne modifie jamais l'ancien) : c'est ce
          // changement de référence qui prévient React qu'il faut refaire le rendu.
          noms: etat.noms.includes(nom) ? etat.noms.filter((n) => n !== nom) : [...etat.noms, nom],
        })),
    }),
    {
      name: "pokedex-favoris", // clé dans le localStorage
      // Le serveur n'a pas accès au localStorage : il rend toujours « aucun favori ».
      // Si le navigateur lisait le localStorage dès le premier rendu, son HTML serait différent
      // de celui du serveur → erreur d'hydratation. On attend donc, et c'est le composant
      // HydratationStores qui lance la lecture après l'hydratation.
      skipHydration: true,
    },
  ),
);

// S'abonne à la fin de la relecture du localStorage.
// Sur le serveur il n'y a pas de localStorage : Zustand n'y crée pas l'outil `persist`, d'où le « ?. ».
function abonnerFinHydratation(rappel: () => void) {
  return useFavoris.persist?.onFinishHydration(rappel) ?? (() => {});
}

// true une fois le localStorage relu. Sert à ne pas afficher un état « vide » trop tôt.
export function useFavorisPrets(): boolean {
  return useSyncExternalStore(
    abonnerFinHydratation,
    () => useFavoris.persist?.hasHydrated() ?? false, // valeur dans le navigateur
    () => false, // valeur sur le serveur
  );
}

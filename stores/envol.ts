import { create } from "zustand";

// Petit store Zustand, NON enregistré (pas de persist) : il décrit la Pokéball en train de voler
// du bouton « sacoche » vers l'indicateur de l'en-tête. Il relie trois composants qui ne se
// connaissent pas : BoutonSacoche (lance), EnvolPokeball (dessine) et IndicateurSacoche (reçoit).

type Point = { x: number; y: number }; // position dans la fenêtre, en pixels

export type Envol = {
  depart: Point; // centre du bouton cliqué
  arrivee: Point; // centre de l'emplacement libre dans l'en-tête
  emplacement: number; // numéro de cet emplacement (0 à 5)
  numero: number; // change à chaque envol : React recrée l'animation
};

type EtatEnvol = {
  envol: Envol | null; // null = aucune Pokéball en vol
  // Emplacement où la dernière Pokéball vient d'arriver : l'indicateur y joue un petit rebond.
  dernierArrive: number | null;
  lancer: (depart: Point, arrivee: Point, emplacement: number) => void;
  terminer: () => void;
};

export const useEnvol = create<EtatEnvol>()((set) => ({
  envol: null,
  dernierArrive: null,
  lancer: (depart, arrivee, emplacement) => set({ envol: { depart, arrivee, emplacement, numero: Date.now() }, dernierArrive: null }),
  terminer: () => set((etat) => ({ envol: null, dernierArrive: etat.envol?.emplacement ?? null })),
}));

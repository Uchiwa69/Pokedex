"use client";

import { useEffect } from "react";
import { useCartes } from "@/stores/cartes";
import { useFavoris } from "@/stores/favoris";
import { useSacoche } from "@/stores/sacoche";

// Monté une seule fois dans le layout. Il n'affiche rien : son rôle est de relire le localStorage
// APRÈS l'hydratation (useEffect ne s'exécute que dans le navigateur, une fois la page affichée).
// Le premier rendu du navigateur est donc identique à celui du serveur : pas d'erreur d'hydratation.
export default function HydratationStores() {
  useEffect(() => {
    useFavoris.persist.rehydrate();
    useSacoche.persist.rehydrate();
    useCartes.persist.rehydrate();
  }, []);

  return null;
}

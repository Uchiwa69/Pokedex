"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { formaterMesure, type Pokemon } from "@/lib/conversion";
import { TYPES } from "@/lib/types";

// dynamic() : le code de la carte 3D (et la bibliothèque three) n'est téléchargé qu'au moment où
// la carte est demandée. ssr: false : ce composant a besoin du navigateur (WebGL), jamais du serveur.
const Carte3D = dynamic(() => import("@/components/Carte3D"), {
  ssr: false,
  loading: () => (
    <p role="status" className="etiquette flex h-[26rem] items-center justify-center">
      Chargement de la carte…
    </p>
  ),
});

// Panneau de la fiche qui propose la carte holographique. Tant que l'on n'a pas cliqué,
// rien de la 3D n'est chargé : la fiche reste aussi rapide qu'avant.
export default function PanneauCarte3D({ pokemon }: { pokemon: Pokemon }) {
  const [ouverte, setOuverte] = useState(false);

  return (
    <section aria-labelledby="titre-carte" className="verre flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="titre-carte" className="etiquette">
          Carte holographique 3D
        </h2>
        <button
          type="button"
          onClick={() => setOuverte((valeur) => !valeur)}
          aria-expanded={ouverte}
          className={`bouton ${ouverte ? "bouton-secondaire" : "bouton-principal"}`}
        >
          {ouverte ? "Fermer la carte" : "Afficher la carte"}
        </button>
      </div>

      {ouverte && (
        <Carte3D
          illustration={pokemon.artwork}
          numero={String(pokemon.id).padStart(4, "0")}
          nom={pokemon.nomFr}
          types={pokemon.types.map((type) => TYPES[type].libelle)}
          typePrincipal={pokemon.types[0] ?? "normal"}
          mesures={`${formaterMesure(pokemon.taille, "m")} · ${formaterMesure(pokemon.poids, "kg")}`}
        />
      )}
    </section>
  );
}

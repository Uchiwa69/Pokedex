"use client";

import { useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { formaterMesure, type Pokemon } from "@/lib/conversion";
import { TYPES } from "@/lib/types";

// La carte 3D (et la bibliothèque three) est téléchargée à part, après l'affichage de la fiche.
// ssr: false : elle a besoin du navigateur (WebGL), jamais du serveur.
const Carte3D = dynamic(() => import("@/components/Carte3D"), { ssr: false });

type Props = {
  pokemon: Pokemon;
  // L'écran d'illustration classique, rendu par le serveur. Il sert d'affichage d'attente pendant
  // le chargement de la carte, et de repli si la 3D n'est pas disponible sur l'appareil.
  children: ReactNode;
};

// Vitrine de la fiche : la carte holographique 3D prend la place de l'illustration.
// Tant qu'elle n'est pas prête, on voit l'illustration (la page s'affiche donc aussi vite qu'avant) ;
// dès qu'elle l'est, l'illustration est masquée et la carte apparaît au même endroit.
export default function VitrineFiche({ pokemon, children }: Props) {
  const [prete, setPrete] = useState(false);
  const [echec, setEchec] = useState(false);

  return (
    <div className="relative">
      {!prete && children}

      {!echec && (
        // Pendant le chargement, la carte est déjà montée mais invisible, posée par-dessus l'illustration.
        // inert : ses boutons ne sont alors ni cliquables ni atteignables au clavier.
        <div className={prete ? "animate-fondu" : "pointer-events-none absolute inset-0 overflow-hidden opacity-0"} inert={!prete}>
          <Carte3D
            illustration={pokemon.artwork}
            numero={String(pokemon.id).padStart(4, "0")}
            nom={pokemon.nomFr}
            types={pokemon.types.map((type) => TYPES[type].libelle)}
            typePrincipal={pokemon.types[0] ?? "normal"}
            mesures={`${formaterMesure(pokemon.taille, "m")} · ${formaterMesure(pokemon.poids, "kg")}`}
            surPret={() => setPrete(true)}
            surEchec={() => setEchec(true)}
          />
        </div>
      )}
    </div>
  );
}

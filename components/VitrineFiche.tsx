"use client";

import { useState, type ReactNode } from "react";
import Carte3D from "@/components/Carte3D";
import { formaterMesure, type Pokemon } from "@/lib/conversion";
import { TYPES } from "@/lib/types";

type Props = {
  pokemon: Pokemon;
  // L'écran d'illustration classique, rendu par le serveur. Il sert d'affichage d'attente pendant
  // la préparation de la carte, et de repli si la 3D n'est pas disponible sur l'appareil.
  children: ReactNode;
};

// Vitrine de la fiche : la carte holographique 3D prend la place de l'illustration.
// Le cadre de la carte (sa zone et ses boutons) est rendu dès le départ, invisible : il réserve la place.
// L'illustration est posée par-dessus en attendant. Quand la carte est prête, on échange simplement ce qui
// est visible : rien ne bouge dans la page (pas de décalage de mise en page).
export default function VitrineFiche({ pokemon, children }: Props) {
  const [prete, setPrete] = useState(false);
  const [echec, setEchec] = useState(false);

  // Sans 3D sur cet appareil : on revient à l'illustration seule, à sa place habituelle.
  if (echec) return <>{children}</>;

  return (
    <div className="relative">
      {/* inert : tant que la carte n'est pas prête, ses boutons ne sont ni cliquables ni atteignables au clavier. */}
      <div className={prete ? "animate-fondu" : "opacity-0"} inert={!prete}>
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

      {/* L'illustration d'attente, centrée dans la zone de la carte (mêmes hauteurs que dans Carte3D). */}
      {!prete && <div className="absolute inset-x-0 top-0 flex h-[30rem] items-center sm:h-[34rem]">{children}</div>}
    </div>
  );
}

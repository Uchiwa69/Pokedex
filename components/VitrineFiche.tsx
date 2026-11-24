"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Carte3D from "@/components/Carte3D";
import { formaterMesure, type Pokemon } from "@/lib/conversion";
import { TYPES } from "@/lib/types";

type Props = {
  pokemon: Pokemon;
  // La copie à plat de la carte (CarteStatique), rendue par le serveur. Elle sert d'affichage d'attente
  // pendant la préparation de la 3D, et de repli si la 3D n'est pas disponible sur l'appareil.
  children: ReactNode;
};

// Durée pendant laquelle la copie à plat reste sous la carte 3D qui apparaît (un peu plus que le fondu).
const DUREE_RELAIS = 350; // millisecondes

// Vitrine de la fiche : la carte holographique 3D prend le relais de sa copie à plat.
// Le cadre de la carte (sa zone et ses boutons) est rendu dès le départ, invisible : il réserve la place.
// La copie à plat est posée au même endroit en attendant. Quand la 3D est prête, elle apparaît en fondu
// PAR-DESSUS la copie (même image, même position), puis la copie est retirée : on ne voit aucun changement,
// seulement la carte qui se met à bouger. Rien ne se décale dans la page.
export default function VitrineFiche({ pokemon, children }: Props) {
  const [prete, setPrete] = useState(false);
  const [echec, setEchec] = useState(false);
  // true tant que la copie à plat doit rester affichée.
  const [copieVisible, setCopieVisible] = useState(true);

  // Minuterie du relais, gardée dans un ref pour pouvoir l'annuler si l'on quitte la page entre-temps.
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (minuterie.current) clearTimeout(minuterie.current);
    };
  }, []);

  function surPret() {
    setPrete(true);
    minuterie.current = setTimeout(() => setCopieVisible(false), DUREE_RELAIS);
  }

  // Sans 3D sur cet appareil : on garde la copie à plat seule, dans une zone de la même hauteur.
  if (echec) return <div className="flex h-[26rem] items-center sm:h-[30rem]">{children}</div>;

  return (
    <div className="relative">
      {/* La copie à plat, centrée dans la zone de la carte (mêmes hauteurs que dans Carte3D). */}
      {copieVisible && <div className="absolute inset-x-0 top-0 flex h-[26rem] items-center sm:h-[30rem]">{children}</div>}

      {/* relative : la carte 3D se dessine au-dessus de la copie.
          inert : tant que la carte n'est pas prête, ses boutons ne sont ni cliquables ni atteignables au clavier. */}
      <div className={prete ? "relative animate-fondu" : "relative opacity-0"} inert={!prete}>
        <Carte3D
          illustration={pokemon.artwork}
          numero={String(pokemon.id).padStart(4, "0")}
          nom={pokemon.nomFr}
          types={pokemon.types.map((type) => TYPES[type].libelle)}
          typePrincipal={pokemon.types[0] ?? "normal"}
          mesures={`${formaterMesure(pokemon.taille, "m")} · ${formaterMesure(pokemon.poids, "kg")}`}
          surPret={surPret}
          surEchec={() => setEchec(true)}
        />
      </div>
    </div>
  );
}

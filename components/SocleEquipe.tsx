"use client";

import { useState } from "react";
import Image from "next/image";
import type { Pokemon } from "@/lib/conversion";
import { styleTeinte } from "@/lib/teinte";

type Props = {
  pokemon: Pokemon;
  vue?: "face" | "dos"; // de dos pour mon Pokémon en combat (phase 10)
  // Rang du membre : décale la phase des animations pour que les Pokémon ne bougent pas tous en même temps.
  decalage?: number;
  selectionne?: boolean;
};

// Positions horizontales et délais des 4 particules.
const PARTICULES = [
  { gauche: "22%", delai: 0 },
  { gauche: "40%", delai: 1.1 },
  { gauche: "60%", delai: 0.5 },
  { gauche: "78%", delai: 1.7 },
];

// Un Pokémon sur son socle : disque en perspective, ombre au sol, sprite qui lévite, halo et particules.
// Toutes les animations sont en CSS (transform et opacity seulement) et coupées avec motion-reduce.
export default function SocleEquipe({ pokemon, vue = "face", decalage = 0, selectionne = false }: Props) {
  const [enEchec, setEnEchec] = useState(false);

  const sprite = vue === "dos" ? pokemon.spriteDos : pokemon.spriteFace;
  const spriteValide = sprite !== null && !enEchec;
  // Repli sur l'illustration officielle si le GIF manque ou ne se charge pas.
  const source = spriteValide ? sprite : pokemon.artwork;

  // Délai NÉGATIF : l'animation démarre « déjà commencée », à un moment différent pour chaque membre.
  const phase = { animationDelay: `${-decalage * 0.65}s` };

  return (
    <div className="relative mx-auto aspect-square w-full max-w-40" style={styleTeinte(pokemon.types[0])}>
      {/* Halo qui respire, derrière le Pokémon */}
      <span
        aria-hidden="true"
        style={phase}
        className="absolute bottom-[20%] left-1/2 h-3/5 w-3/5 -translate-x-1/2 animate-respiration rounded-full bg-[var(--teinte)] opacity-40 blur-2xl motion-reduce:animate-none"
      />

      {/* Anneau en pointillés qui tourne sous le socle sélectionné.
          Astuce : un CERCLE qui tourne, couché par rotateX → on voit une ellipse dont les pointillés défilent. */}
      {selectionne && (
        <span aria-hidden="true" className="absolute bottom-[17.5%] left-0 aspect-square w-full translate-y-1/2 [transform:rotateX(69.5deg)]">
          <span className="block h-full w-full scale-[1.14] animate-rotation-lente rounded-full border-2 border-dashed border-[var(--teinte)] motion-reduce:animate-none" />
        </span>
      )}

      {/* Disque du socle : une ellipse (= un disque vu en perspective) au bord de la couleur du type.
          Clair : disque nacré et ombre portée douce. Sombre : disque sombre et lueur forte. */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[35%] rounded-[100%] border-2 border-[var(--teinte)] bg-linear-to-b from-socle-haut to-socle-bas shadow-[0_14px_22px_-10px_rgb(67_56_202/0.5)] dark:shadow-[0_0_26px_-2px_var(--teinte)]"
      />
      <span aria-hidden="true" className="absolute inset-x-[10%] bottom-[5%] h-[25%] rounded-[100%] border border-[var(--teinte)] opacity-40" />

      {/* Ombre au sol : elle rétrécit quand le Pokémon monte (même durée et même phase que la lévitation) */}
      <span
        aria-hidden="true"
        style={phase}
        className="absolute bottom-[14%] left-1/2 h-[7%] w-2/5 -translate-x-1/2 animate-ombre-sol rounded-[100%] bg-encre opacity-35 blur-xs motion-reduce:animate-none"
      />

      {/* Le Pokémon, qui lévite au-dessus du disque.
          data-lutin="x" et data-lutin="y" : deux repères utilisés en combat par les animations d'attaques
          (lib/showdown/scene.ts) pour déplacer le Pokémon : l'un horizontalement, l'autre verticalement. */}
      <div data-lutin="x" style={phase} className="absolute bottom-[19%] left-1/2 h-3/5 w-3/5 -translate-x-1/2 animate-levitation motion-reduce:animate-none">
        <div data-lutin="y" className="relative h-full w-full">
        {source ? (
          <Image
            src={source}
            alt={`${pokemon.nomFr}${vue === "dos" ? " de dos" : ""}`}
            fill
            sizes="96px"
            unoptimized // un GIF optimisé par Next deviendrait une image fixe
            onError={() => setEnEchec(true)}
            // object-bottom : les pieds du Pokémon restent près du socle, quelle que soit la taille du sprite.
            className={spriteValide ? "object-contain object-bottom [image-rendering:pixelated]" : "object-contain object-bottom"}
          />
        ) : (
          <span className="block h-full w-full rounded-full bg-piste" aria-hidden="true" />
        )}
        </div>
      </div>

      {/* Particules de la couleur du type qui s'élèvent (absentes en animations réduites) */}
      {PARTICULES.map((particule) => (
        <span
          key={particule.gauche}
          aria-hidden="true"
          style={{ left: particule.gauche, animationDelay: `${particule.delai - decalage * 0.4}s` }}
          className="absolute bottom-[22%] h-1.5 w-1.5 animate-particule rounded-full bg-[var(--teinte)] motion-reduce:hidden"
        />
      ))}
    </div>
  );
}

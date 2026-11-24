"use client";

// LOCAL UNIQUEMENT (branche local/vitrine-3d-fiche) — « 2D améliorée » pour les Pokémon sans modèle 3D.
// Même carré que la vitrine 3D, mais avec l'illustration mise en scène : elle lévite au-dessus d'un socle,
// avec un halo, une ombre, des particules, et toute la scène s'incline quand on la survole à la souris.
// Aucune nouvelle animation : on réutilise celles du socle d'équipe (globals.css) et CarteInclinable.

import Image from "next/image";
import CarteInclinable from "@/components/CarteInclinable";
import type { Pokemon } from "@/lib/conversion";

// Positions horizontales et délais des particules (en secondes).
const PARTICULES = [
  { gauche: "18%", delai: 0 },
  { gauche: "30%", delai: 1.4 },
  { gauche: "42%", delai: 0.6 },
  { gauche: "54%", delai: 2 },
  { gauche: "66%", delai: 0.3 },
  { gauche: "78%", delai: 1.1 },
];

export default function Scene2D({ pokemon }: { pokemon: Pokemon }) {
  return (
    // --teinte est posée par le panneau de détail (couleur du type principal).
    <div className="verre relative aspect-square max-h-[70svh] w-full overflow-hidden">
      {/* Même lueur de fond que la vitrine 3D */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_70%,var(--teinte),transparent_62%)] opacity-25" />

      <CarteInclinable>
        {/* Numéro géant en filigrane, derrière le Pokémon */}
        <span aria-hidden="true" className="absolute inset-x-0 top-[6%] text-center font-titre text-8xl font-bold text-texte opacity-5">
          {String(pokemon.id).padStart(4, "0")}
        </span>

        {/* Halo qui respire */}
        <span aria-hidden="true" className="absolute bottom-[24%] left-1/2 h-1/2 w-1/2 -translate-x-1/2 animate-respiration rounded-full bg-[var(--teinte)] opacity-40 blur-3xl motion-reduce:animate-none" />

        {/* Anneau en pointillés qui tourne au sol : un cercle couché par rotateX, vu comme une ellipse. */}
        <span aria-hidden="true" className="absolute bottom-[14%] left-[15%] aspect-square w-[70%] translate-y-1/2 [transform:rotateX(72deg)]">
          <span className="block h-full w-full animate-rotation-lente rounded-full border-2 border-dashed border-[var(--teinte)] opacity-70 motion-reduce:animate-none" />
        </span>

        {/* Disque du socle */}
        <span aria-hidden="true" className="absolute bottom-[8%] left-[22%] h-[12%] w-[56%] rounded-[100%] border-2 border-[var(--teinte)] bg-linear-to-b from-socle-haut to-socle-bas shadow-[0_0_30px_-2px_var(--teinte)]" />

        {/* Ombre au sol : elle rétrécit quand le Pokémon monte (même rythme que la lévitation) */}
        <span aria-hidden="true" className="absolute bottom-[13%] left-1/2 h-[4%] w-1/3 -translate-x-1/2 animate-ombre-sol rounded-[100%] bg-encre opacity-40 blur-xs motion-reduce:animate-none" />

        {/* L'illustration, qui lévite au-dessus du socle */}
        <div className="absolute inset-x-[14%] bottom-[16%] top-[8%] animate-levitation motion-reduce:animate-none">
          {pokemon.artwork && (
            <Image
              src={pokemon.artwork}
              alt={`Illustration de ${pokemon.nomFr}`}
              fill
              sizes="(min-width: 768px) 420px, 80vw"
              className="object-contain object-bottom drop-shadow-[0_18px_20px_rgb(15_23_42/0.45)]"
            />
          )}
        </div>

        {/* Particules de la couleur du type qui s'élèvent (absentes en animations réduites) */}
        {PARTICULES.map((particule) => (
          <span
            key={particule.gauche}
            aria-hidden="true"
            style={{ left: particule.gauche, animationDelay: `${particule.delai}s` }}
            className="absolute bottom-[18%] h-2 w-2 animate-particule rounded-full bg-[var(--teinte)] motion-reduce:hidden"
          />
        ))}
      </CarteInclinable>
    </div>
  );
}

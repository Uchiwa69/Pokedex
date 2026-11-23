"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Pokemon } from "@/lib/conversion";

// Sprite animé du Pokémon (GIF du jeu Pokémon Showdown), de face ou de dos.
// Repli sur l'illustration officielle si le GIF n'existe pas ou ne se charge pas.
export default function SpriteAnime({ pokemon }: { pokemon: Pokemon }) {
  const [deDos, setDeDos] = useState(false);
  // Liste des adresses qui ont échoué au chargement (pour basculer sur le repli).
  const [enEchec, setEnEchec] = useState<string[]>([]);
  const animationsReduites = useReducedMotion();

  const sprite = deDos ? pokemon.spriteDos : pokemon.spriteFace;
  const spriteValide = sprite !== null && !enEchec.includes(sprite);
  const source = spriteValide ? sprite : pokemon.artwork;
  const peutRetourner = pokemon.spriteDos !== null && !enEchec.includes(pokemon.spriteDos);

  return (
    <section aria-labelledby="titre-sprite" className="verre flex items-center gap-4 p-4">
      <div className="relative h-24 w-24 shrink-0">
        {/* AnimatePresence garde l'ancien sprite le temps de son animation de sortie (exit).
            mode="wait" : le nouveau n'entre qu'après. La `key` change quand on retourne le Pokémon. */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={deDos ? "dos" : "face"}
            className="absolute inset-0"
            // Animations réduites : simple fondu. Sinon : demi-tour (rotation autour de l'axe vertical).
            initial={animationsReduites ? { opacity: 0 } : { opacity: 0, rotateY: 90 }}
            animate={animationsReduites ? { opacity: 1 } : { opacity: 1, rotateY: 0 }}
            exit={animationsReduites ? { opacity: 0 } : { opacity: 0, rotateY: -90 }}
            transition={{ duration: 0.18 }}
          >
            {source ? (
              <Image
                src={source}
                alt={`${pokemon.nomFr} ${deDos ? "de dos" : "de face"}`}
                fill
                sizes="96px"
                // unoptimized : l'optimiseur d'images de Next transformerait le GIF en image fixe.
                unoptimized
                onError={() => {
                  if (sprite) setEnEchec((liste) => [...liste, sprite]);
                }}
                // pixelated : les sprites sont du pixel art, on garde des pixels nets.
                className={spriteValide ? "object-contain [image-rendering:pixelated]" : "object-contain"}
              />
            ) : (
              <span className="block h-full w-full rounded-full bg-piste" aria-hidden="true" />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex flex-col items-start gap-2">
        <h2 id="titre-sprite" className="etiquette">
          Sprite animé · {deDos ? "dos" : "face"}
        </h2>
        {peutRetourner ? (
          <button type="button" onClick={() => setDeDos((valeur) => !valeur)} className="bouton bouton-secondaire">
            {deDos ? "Voir de face" : "Voir de dos"}
          </button>
        ) : (
          <p className="text-sm text-texte-doux">Pas de vue de dos disponible.</p>
        )}
      </div>
    </section>
  );
}

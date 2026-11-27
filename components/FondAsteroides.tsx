"use client";

// Le fond de l'écran de fin : un anneau d'astéroïdes autour de la Pokéball (lib/asteroides/scene.ts). Il remplace
// le fond noir et ses braises : la brûlure de Dracaufeu (SequenceFeu) le révèle en consumant l'écran.
// Monté par CompagnonPokeball, sur un calque fixe posé DERRIÈRE celui de la Pokéball (-z-20 contre -z-10).
//
// Pas de boucle d'animation ici : c'est SequenceFeu qui appelle fondFin.dessiner() à chaque image (seulement quand
// la séquence de feu est à l'écran), après avoir écrit fondFin.visibilite. Le fond suit donc exactement la brûlure.
// La scène (roches, volume de bruit) est préparée quand on arrive sur la séquence, puis gardée.

import { useEffect, useRef } from "react";
import { fondFin } from "@/lib/pokeball/pose";
import type { FondAsteroides as Scene } from "@/lib/asteroides/scene";

export default function FondAsteroides() {
  const calque = useRef<HTMLDivElement>(null);
  const toile = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const elementCalque = calque.current;
    const elementToile = toile.current;
    if (!elementCalque || !elementToile) return;
    let scene: Scene | null = null;
    let chargement = false; // l'import est lancé (une seule fois)
    let annule = false;

    function ajuster() {
      scene?.redimensionner(window.innerWidth, window.innerHeight);
    }

    fondFin.dessiner = (enVue) => {
      // Opacité écrite directement (pas d'état React : elle change à chaque image). Invisible = caché pour de bon.
      elementCalque.style.opacity = String(fondFin.visibilite);
      elementCalque.style.visibility = fondFin.visibilite > 0.01 ? "visible" : "hidden";
      // Préparée dès que la séquence est à l'écran (pendant Dracaufeu) : elle est prête quand l'écran brûle.
      if (enVue && !chargement) {
        chargement = true;
        import("@/lib/asteroides/scene")
          .then((module) => {
            if (annule) return;
            scene = module.creerFondAsteroides(elementToile);
            ajuster();
          })
          // Pas de WebGL 2 : pas de fond, l'écran de fin reste simplement sombre.
          .catch(() => {});
      }
      // Rien à calculer tant que le fond est invisible.
      if (fondFin.visibilite > 0.01) scene?.dessiner(fondFin);
    };
    window.addEventListener("resize", ajuster);

    return () => {
      annule = true;
      fondFin.dessiner = null;
      window.removeEventListener("resize", ajuster);
      scene?.liberer();
    };
  }, []);

  return (
    <div
      ref={calque}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-20 motion-reduce:hidden"
      style={{ opacity: 0, visibility: "hidden" }}
    >
      <canvas ref={toile} className="h-full w-full" />
    </div>
  );
}

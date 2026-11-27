"use client";

// Le fond de l'écran de fin : un anneau d'astéroïdes autour de la Pokéball (lib/asteroides/scene.ts). Il remplace
// le fond noir et ses braises : la brûlure de Dracaufeu (SequenceFeu) le révèle en consumant l'écran.
// Monté par CompagnonPokeball, sur un calque fixe posé DERRIÈRE celui de la Pokéball (-z-20 contre -z-10).
//
// Pas de boucle d'animation ici : c'est SequenceFeu qui appelle fondFin.dessiner() à chaque image (seulement quand
// la séquence de feu est à l'écran), après avoir écrit fondFin.visibilite. Le fond suit donc exactement la brûlure.
// La scène (roches, volume de bruit, shaders) est préparée À L'AVANCE : quand la séquence de feu approche (à moins
// d'un écran et demi) et que le navigateur est inoccupé. Préparée au dernier moment, elle faisait sauter une image
// en plein défilement. Elle est ensuite gardée.

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

    function charger() {
      if (chargement) return;
      chargement = true;
      import("@/lib/asteroides/scene")
        .then(async (module) => {
          if (annule) return;
          const nouvelle = module.creerFondAsteroides(elementToile!);
          nouvelle.redimensionner(window.innerWidth, window.innerHeight);
          await nouvelle.preparer(); // shaders compilés en arrière-plan avant le premier dessin
          if (annule) {
            nouvelle.liberer();
            return;
          }
          scene = nouvelle;
        })
        // Pas de WebGL 2 : pas de fond, l'écran de fin reste simplement sombre.
        .catch(() => {});
    }
    // Préparation anticipée : la séquence approche, et on attend un moment calme (pas de Safari : simple délai).
    const sequence = document.querySelector("[data-sequence]");
    const guetteur = new IntersectionObserver(
      ([entree]) => {
        if (!entree.isIntersecting) return;
        guetteur.disconnect();
        if ("requestIdleCallback" in window) requestIdleCallback(charger, { timeout: 1500 });
        else setTimeout(charger, 200);
      },
      { rootMargin: "150% 0px 150% 0px" },
    );
    if (sequence) guetteur.observe(sequence);
    // Le code de la scène (roches, ciel, shaders) est téléchargé et lu dès un moment calme après l'arrivée : le lire
    // pendant le défilement coûtait ~150 ms d'un coup. La scène, elle, n'est créée que lorsque la séquence approche.
    const lireLeCode = () => void import("@/lib/asteroides/scene").catch(() => {});
    const inoccupe = typeof requestIdleCallback === "function";
    const attente = inoccupe ? requestIdleCallback(lireLeCode, { timeout: 4000 }) : setTimeout(lireLeCode, 2000);

    function ajuster() {
      scene?.redimensionner(window.innerWidth, window.innerHeight);
    }

    fondFin.dessiner = (enVue) => {
      // Opacité écrite directement (pas d'état React : elle change à chaque image). Invisible = caché pour de bon.
      elementCalque.style.opacity = String(fondFin.visibilite);
      elementCalque.style.visibility = fondFin.visibilite > 0.01 ? "visible" : "hidden";
      // Filet de sécurité : si la préparation anticipée n'a pas eu lieu, elle part dès que la séquence est là.
      if (enVue) charger();
      // Rien à calculer tant que le fond est invisible.
      if (fondFin.visibilite > 0.01) scene?.dessiner(fondFin);
    };
    window.addEventListener("resize", ajuster);

    return () => {
      annule = true;
      guetteur.disconnect();
      if (inoccupe) cancelIdleCallback(attente as number);
      else clearTimeout(attente);
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

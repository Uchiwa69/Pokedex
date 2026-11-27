"use client";

// Le fond de l'écran de fin : un anneau d'astéroïdes autour de la Pokéball (lib/asteroides/scene.ts). Il remplace
// le fond noir et ses braises : la brûlure de Dracaufeu (SequenceFeu) le révèle en consumant l'écran.
// Monté par CompagnonPokeball, sur un calque fixe posé DERRIÈRE celui de la Pokéball (-z-20 contre -z-10).
// `actif` vaut faux tant que le fond est invisible : rien n'est dessiné (aucune image calculée).

import { useEffect, useRef } from "react";
import { fondFin } from "@/lib/pokeball/pose";

export default function FondAsteroides({ actif }: { actif: boolean }) {
  const toile = useRef<HTMLCanvasElement>(null);
  // La scène, créée une fois puis gardée (elle est coûteuse à préparer : roches, volume de bruit).
  const scene = useRef<import("@/lib/asteroides/scene").FondAsteroides | null>(null);

  // 1. Création de la scène (three.js et l'effet ne sont téléchargés qu'à ce moment-là).
  useEffect(() => {
    const element = toile.current;
    if (!element) return;
    let annule = false;
    function ajuster() {
      scene.current?.redimensionner(window.innerWidth, window.innerHeight);
    }
    import("@/lib/asteroides/scene")
      .then((module) => {
        if (annule) return;
        scene.current = module.creerFondAsteroides(element);
        ajuster();
      })
      // Pas de WebGL 2 : pas de fond, l'écran de fin reste simplement sombre.
      .catch(() => {});
    window.addEventListener("resize", ajuster);
    return () => {
      annule = true;
      window.removeEventListener("resize", ajuster);
      scene.current?.liberer();
      scene.current = null;
    };
  }, []);

  // 2. La boucle d'animation, seulement quand le fond est visible.
  useEffect(() => {
    if (!actif) return;
    let image = 0;
    function boucle() {
      scene.current?.dessiner(fondFin);
      image = requestAnimationFrame(boucle);
    }
    image = requestAnimationFrame(boucle);
    return () => cancelAnimationFrame(image);
  }, [actif]);

  return <canvas ref={toile} aria-hidden="true" className="h-full w-full" />;
}

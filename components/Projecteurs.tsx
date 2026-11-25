"use client";

// Deux projecteurs très doux, en haut à gauche et en haut à droite, qui balaient lentement la scène de
// l'introduction, derrière le Pokédex (voir ScenePokedex dans IntroPokedex.tsx).
// Adapté du composant « Spotlight New » d'Aceternity UI (ui.aceternity.com) : mêmes formes, mêmes tailles et
// même rythme ; les couleurs viennent de nos jetons, et le mouvement s'arrête en animations réduites.
// Purement décoratif : il ne capte aucun clic et il est caché aux lecteurs d'écran.

import { motion, useReducedMotion } from "motion/react";

// Couleur de l'accent du site, plus ou moins transparente (le pourcentage est son opacité).
const accent = (opacite: number) => `color-mix(in srgb, var(--color-accent) ${opacite}%, transparent)`;

// Les trois faisceaux d'un projecteur : un large, puis deux étroits de plus en plus faibles.
// Opacités un peu plus de deux fois celles du composant d'origine (8, 6 et 4 %) : sur notre fond bleu nuit,
// les faisceaux étaient presque invisibles.
const FAISCEAU_LARGE = `radial-gradient(68.54% 68.72% at 55.02% 31.46%, ${accent(18)} 0, ${accent(5)} 50%, transparent 80%)`;
const FAISCEAU_MOYEN = `radial-gradient(50% 50% at 50% 50%, ${accent(13)} 0, ${accent(5)} 80%, transparent 100%)`;
const FAISCEAU_FIN = `radial-gradient(50% 50% at 50% 50%, ${accent(9)} 0, ${accent(4)} 80%, transparent 100%)`;

const HAUTEUR = 1380; // longueur des faisceaux, en pixels
const DUREE = 7; // secondes pour un aller du balancement
const BALANCEMENT = 100; // amplitude du balancement, en pixels

export default function Projecteurs() {
  const animationsReduites = useReducedMotion();
  // Va-et-vient horizontal sans fin (on n'anime que transform). En animations réduites : immobile.
  const balancer = (sens: 1 | -1) => (animationsReduites ? undefined : { x: [0, sens * BALANCEMENT, 0] });
  const rythme = { duration: DUREE, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" } as const;

  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5 }}
      className="pointer-events-none absolute inset-0"
    >
      {/* Projecteur de gauche : ses faisceaux penchent de 45° vers la droite. */}
      <motion.div animate={balancer(1)} transition={rythme} className="absolute left-0 top-0 h-screen w-screen">
        <div
          className="absolute left-0 top-0"
          style={{ transform: "translateY(-350px) rotate(-45deg)", background: FAISCEAU_LARGE, width: 560, height: HAUTEUR }}
        />
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ transform: "rotate(-45deg) translate(5%, -50%)", background: FAISCEAU_MOYEN, width: 240, height: HAUTEUR }}
        />
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ transform: "rotate(-45deg) translate(-180%, -70%)", background: FAISCEAU_FIN, width: 240, height: HAUTEUR }}
        />
      </motion.div>

      {/* Projecteur de droite : le même, en miroir. */}
      <motion.div animate={balancer(-1)} transition={rythme} className="absolute right-0 top-0 h-screen w-screen">
        <div
          className="absolute right-0 top-0"
          style={{ transform: "translateY(-350px) rotate(45deg)", background: FAISCEAU_LARGE, width: 560, height: HAUTEUR }}
        />
        <div
          className="absolute right-0 top-0 origin-top-right"
          style={{ transform: "rotate(45deg) translate(-5%, -50%)", background: FAISCEAU_MOYEN, width: 240, height: HAUTEUR }}
        />
        <div
          className="absolute right-0 top-0 origin-top-right"
          style={{ transform: "rotate(45deg) translate(180%, -70%)", background: FAISCEAU_FIN, width: 240, height: HAUTEUR }}
        />
      </motion.div>
    </motion.div>
  );
}

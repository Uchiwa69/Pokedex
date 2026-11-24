"use client";

// PROTOTYPE (/labo/intro) — une Pokéball géante, fermée à l'arrivée sur la page, qui s'ouvre quand on fait défiler.
// La technique vient d'un composant « MacBook qui s'ouvre au défilement » (Aceternity UI) : on n'en reprend
// que l'idée, pas le dessin. Tout repose sur deux fonctions de la bibliothèque motion (déjà utilisée sur le site) :
//   - useScroll     → donne l'avancement du défilement dans une zone, de 0 (début) à 1 (fin) ;
//   - useTransform  → convertit cet avancement en une valeur d'animation (déplacement, opacité, taille…).
// Comme pour les cartes inclinables, ces « motion values » modifient le style directement, sans re-rendu React,
// et on n'anime que transform et opacity.

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import Pokeball from "@/components/Pokeball";

export default function IntroPokeball({ total }: { total: number }) {
  const zone = useRef<HTMLDivElement>(null);
  const animationsReduites = useReducedMotion();

  // Avancement du défilement dans la zone : 0 quand son haut touche le haut de l'écran, 1 quand son bas touche le bas.
  const { scrollYProgress } = useScroll({ target: zone, offset: ["start start", "end end"] });

  // Les deux moitiés s'écartent entre 10 % et 75 % du défilement (en % de leur propre hauteur).
  const hautY = useTransform(scrollYProgress, [0.1, 0.75], ["0%", "-115%"]);
  const basY = useTransform(scrollYProgress, [0.1, 0.75], ["0%", "115%"]);
  // Léger pivot des moitiés, comme une balle qui s'ouvre sur sa charnière.
  const hautRotation = useTransform(scrollYProgress, [0.1, 0.75], [0, -8]);
  const basRotation = useTransform(scrollYProgress, [0.1, 0.75], [0, 6]);
  // Éclat de lumière au moment de l'ouverture : il apparaît, grossit, puis s'efface.
  const eclatOpacite = useTransform(scrollYProgress, [0.08, 0.3, 0.7], [0, 0.9, 0]);
  const eclatTaille = useTransform(scrollYProgress, [0.08, 0.7], [0.2, 2.6]);
  // Le texte caché dans la balle se révèle pendant l'ouverture.
  const texteOpacite = useTransform(scrollYProgress, [0.25, 0.55], [0, 1]);
  const texteTaille = useTransform(scrollYProgress, [0.25, 0.6], [0.7, 1]);
  // La lueur derrière la balle fermée s'efface quand elle s'ouvre.
  const lueurOpacite = useTransform(scrollYProgress, [0, 0.3], [0.35, 0]);
  // L'invitation « Fais défiler » disparaît dès qu'on commence.
  const invitationOpacite = useTransform(scrollYProgress, [0, 0.08], [1, 0]);

  // Animations réduites : pas d'introduction, la page commence directement par son contenu.
  if (animationsReduites) return null;

  return (
    // Zone haute de 2,2 écrans : c'est la « course » du défilement pendant laquelle la balle s'ouvre.
    <div ref={zone} aria-hidden="true" className="relative h-[220svh]">
      {/* sticky top-0 : ce bloc reste collé en haut de l'écran tant qu'on défile dans la zone. */}
      <div className="sticky top-0 flex h-svh items-center justify-center overflow-hidden">
        {/* Éclat de lumière derrière la balle */}
        <motion.span
          className="absolute size-[min(60svh,70vw)] rounded-full bg-[radial-gradient(circle,var(--color-accent-bis),transparent_65%)]"
          style={{ opacity: eclatOpacite, scale: eclatTaille }}
        />

        {/* Ce que la balle renferme */}
        <motion.div className="absolute flex flex-col items-center gap-2 text-center" style={{ opacity: texteOpacite, scale: texteTaille }}>
          <p className="etiquette">Pokédex national</p>
          <p className="bg-linear-to-r from-accent to-accent-bis bg-clip-text font-titre text-6xl font-bold text-transparent sm:text-8xl">
            {total.toLocaleString("fr-FR")}
          </p>
          <p className="font-titre text-xl font-semibold text-texte">Pokémon à découvrir</p>
        </motion.div>

        {/* La balle : --t est sa taille. Chaque moitié est une fenêtre (overflow-hidden) haute d'une demi-balle,
            qui ne laisse voir que le haut ou le bas du même dessin. */}
        <div className="relative size-(--t) [--t:min(62svh,78vw)]">
          {/* Lueur ronde derrière la balle fermée. Elle est à part (et non une ombre sur les moitiés) : une ombre
              serait coupée par les fenêtres des moitiés et dessinerait un carré autour de la balle. */}
          <motion.span className="absolute inset-0 rounded-full bg-accent blur-3xl" style={{ opacity: lueurOpacite }} />
          <motion.div className="absolute inset-x-0 top-0 h-1/2 origin-bottom overflow-hidden" style={{ y: hautY, rotate: hautRotation }}>
            <Pokeball className="absolute left-0 top-0 size-(--t)" />
          </motion.div>
          <motion.div className="absolute inset-x-0 bottom-0 h-1/2 origin-top overflow-hidden" style={{ y: basY, rotate: basRotation }}>
            <Pokeball className="absolute bottom-0 left-0 size-(--t)" />
          </motion.div>
        </div>

        <motion.p className="etiquette absolute bottom-8 flex flex-col items-center gap-1" style={{ opacity: invitationOpacite }}>
          Fais défiler pour ouvrir
          <span className="text-base motion-safe:animate-bounce">↓</span>
        </motion.p>
      </div>
    </div>
  );
}

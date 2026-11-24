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

export default function IntroPokeball({ total }: { total: number }) {
  const zone = useRef<HTMLDivElement>(null);
  const animationsReduites = useReducedMotion();

  // Avancement du défilement dans la zone : 0 quand son haut touche le haut de l'écran, 1 quand son bas touche le bas.
  const { scrollYProgress } = useScroll({ target: zone, offset: ["start start", "end end"] });

  // La balle avance légèrement vers nous au début, comme si on s'en approchait.
  const balleTaille = useTransform(scrollYProgress, [0, 0.25], [0.92, 1]);
  // Les deux moitiés s'écartent entre 12 % et 78 % du défilement (en % de leur propre hauteur).
  const hautY = useTransform(scrollYProgress, [0.12, 0.78], ["0%", "-125%"]);
  const basY = useTransform(scrollYProgress, [0.12, 0.78], ["0%", "125%"]);
  // Un filet de lumière blanche sort de la jointure : il s'allume, s'étire, puis s'éteint.
  const filetOpacite = useTransform(scrollYProgress, [0.08, 0.16, 0.45], [0, 1, 0]);
  const filetLargeur = useTransform(scrollYProgress, [0.08, 0.45], [0.4, 1.5]);
  // Halo doux et neutre (blanc) derrière le texte, pendant l'ouverture.
  const haloOpacite = useTransform(scrollYProgress, [0.12, 0.35, 0.8], [0, 0.22, 0.08]);
  // Le texte caché dans la balle se révèle pendant l'ouverture.
  const texteOpacite = useTransform(scrollYProgress, [0.28, 0.55], [0, 1]);
  const texteY = useTransform(scrollYProgress, [0.28, 0.6], [16, 0]);
  // L'invitation « Fais défiler » disparaît dès qu'on commence.
  const invitationOpacite = useTransform(scrollYProgress, [0, 0.08], [1, 0]);

  // Animations réduites : pas d'introduction, la page commence directement par son contenu.
  if (animationsReduites) return null;

  return (
    // Zone haute de 2,2 écrans : c'est la « course » du défilement pendant laquelle la balle s'ouvre.
    <div ref={zone} aria-hidden="true" className="relative h-[220svh]">
      {/* sticky top-0 : ce bloc reste collé en haut de l'écran tant qu'on défile dans la zone. */}
      <div className="sticky top-0 flex h-svh items-center justify-center overflow-hidden">
        {/* Halo neutre derrière le texte */}
        <motion.span
          className="absolute size-[min(90svh,110vw)] rounded-full bg-[radial-gradient(circle,var(--color-texte),transparent_62%)]"
          style={{ opacity: haloOpacite }}
        />

        {/* Ce que la balle renferme : un grand chiffre sobre, entre deux filets fins. */}
        <motion.div className="absolute flex flex-col items-center gap-4 text-center" style={{ opacity: texteOpacite, y: texteY }}>
          <p className="etiquette flex items-center gap-4">
            <span className="h-px w-10 bg-bordure" />
            Pokédex national
            <span className="h-px w-10 bg-bordure" />
          </p>
          <p className="font-titre text-7xl font-bold leading-none tracking-tight text-texte sm:text-9xl">{total.toLocaleString("fr-FR")}</p>
          <p className="text-sm text-texte-doux sm:text-base">Pokémon à découvrir</p>
        </motion.div>

        {/* La balle : --t est sa taille. Chaque moitié est une fenêtre (overflow-hidden) haute d'une demi-balle,
            qui ne laisse voir que le haut ou le bas du même dessin. */}
        <motion.div className="relative size-(--t) [--t:min(60svh,76vw)]" style={{ scale: balleTaille }}>
          {/* Ombre portée au sol, sous la balle fermée */}
          <span className="absolute -bottom-[7%] left-[14%] h-[7%] w-[72%] rounded-[100%] bg-encre opacity-80 blur-xl" />
          <motion.div className="absolute inset-x-0 top-0 h-1/2 overflow-hidden" style={{ y: hautY }}>
            <BalleRealiste className="absolute left-0 top-0 size-(--t)" />
          </motion.div>
          <motion.div className="absolute inset-x-0 bottom-0 h-1/2 overflow-hidden" style={{ y: basY }}>
            <BalleRealiste className="absolute bottom-0 left-0 size-(--t)" />
          </motion.div>
          {/* Le filet de lumière sur la jointure : un trait fin et son voile flou. */}
          <motion.span className="absolute inset-x-0 top-1/2 -mt-px h-0.5 bg-texte" style={{ opacity: filetOpacite, scaleX: filetLargeur }} />
          <motion.span className="absolute inset-x-0 top-1/2 -mt-3 h-6 bg-texte blur-xl" style={{ opacity: filetOpacite, scaleX: filetLargeur }} />
        </motion.div>

        <motion.p className="etiquette absolute bottom-8 flex flex-col items-center gap-2" style={{ opacity: invitationOpacite }}>
          Fais défiler
          {/* Petite « souris » dont le point descend : l'indication classique de défilement. */}
          <span className="flex h-8 w-5 justify-center rounded-full border border-texte-doux pt-1.5">
            <span className="size-1 rounded-full bg-texte-doux motion-safe:animate-bounce" />
          </span>
        </motion.p>
      </div>
    </div>
  );
}

// Une Pokéball dessinée avec du volume : des dégradés imitent une sphère éclairée par le haut à gauche
// (reflet clair, ombre vers le bord), la ceinture est biseautée et le bouton a une bague métallique.
// Les couleurs partent des jetons du thème (--color-balle-haut, --color-balle-bas, --color-encre) : color-mix
// les éclaircit ou les assombrit pour fabriquer les nuances, sans couleur écrite en dur.
function BalleRealiste({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className}>
      <defs>
        {/* Calotte rouge : claire près de la lumière, sombre vers le bord. */}
        <radialGradient id="balle-rouge" cx="36%" cy="24%" r="85%">
          <stop offset="0%" className="[stop-color:color-mix(in_srgb,var(--color-balle-haut)_62%,white)]" />
          <stop offset="38%" className="[stop-color:var(--color-balle-haut)]" />
          <stop offset="100%" className="[stop-color:color-mix(in_srgb,var(--color-balle-haut)_38%,black)]" />
        </radialGradient>
        {/* Base blanche : nacrée en haut, grisée vers le bas. */}
        <radialGradient id="balle-blanc" cx="38%" cy="10%" r="100%">
          <stop offset="0%" className="[stop-color:var(--color-balle-bas)]" />
          <stop offset="55%" className="[stop-color:color-mix(in_srgb,var(--color-balle-bas)_84%,var(--color-encre))]" />
          <stop offset="100%" className="[stop-color:color-mix(in_srgb,var(--color-balle-bas)_48%,var(--color-encre))]" />
        </radialGradient>
        {/* Ceinture : un biseau (clair au milieu, sombre sur les arêtes). */}
        <linearGradient id="balle-ceinture" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" className="[stop-color:var(--color-encre)]" />
          <stop offset="50%" className="[stop-color:color-mix(in_srgb,var(--color-encre)_70%,white)]" />
          <stop offset="100%" className="[stop-color:var(--color-encre)]" />
        </linearGradient>
        {/* Bague métallique du bouton. */}
        <linearGradient id="balle-metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" className="[stop-color:var(--color-balle-bas)]" />
          <stop offset="55%" className="[stop-color:color-mix(in_srgb,var(--color-balle-bas)_45%,var(--color-encre))]" />
          <stop offset="100%" className="[stop-color:color-mix(in_srgb,var(--color-balle-bas)_80%,var(--color-encre))]" />
        </linearGradient>
        {/* Reflet : une tache blanche qui s'efface. */}
        <radialGradient id="balle-reflet">
          <stop offset="0%" stopColor="white" stopOpacity="0.75" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        {/* Ombre propre de la sphère : transparente côté lumière, sombre côté opposé. */}
        <radialGradient id="balle-ombre" cx="36%" cy="26%" r="78%">
          <stop offset="55%" stopColor="black" stopOpacity="0" />
          <stop offset="100%" stopColor="black" stopOpacity="0.45" />
        </radialGradient>
        <clipPath id="balle-rond">
          <circle cx="100" cy="100" r="96" />
        </clipPath>
      </defs>

      <g clipPath="url(#balle-rond)">
        <path d="M0 0h200v100H0z" fill="url(#balle-rouge)" />
        <path d="M0 100h200v100H0z" fill="url(#balle-blanc)" />
        <rect x="0" y="91" width="200" height="18" fill="url(#balle-ceinture)" />
        <circle cx="100" cy="100" r="96" fill="url(#balle-ombre)" />
        {/* Reflet principal sur la calotte, et un petit éclat net plus haut */}
        <ellipse cx="66" cy="46" rx="40" ry="20" transform="rotate(-32 66 46)" fill="url(#balle-reflet)" />
        <ellipse cx="54" cy="36" rx="9" ry="4" transform="rotate(-32 54 36)" fill="white" opacity="0.55" />
      </g>
      {/* Contour fin de la sphère */}
      <circle cx="100" cy="100" r="96" fill="none" strokeWidth="2" className="stroke-encre" />

      {/* Bouton : socle sombre, bague métallique, pastille blanche bombée avec son petit reflet */}
      <circle cx="100" cy="100" r="31" className="fill-encre" />
      <circle cx="100" cy="100" r="25" fill="url(#balle-metal)" />
      <circle cx="100" cy="100" r="18" className="fill-encre" />
      <circle cx="100" cy="100" r="15.5" fill="url(#balle-blanc)" />
      <ellipse cx="95" cy="94" rx="6" ry="3.5" transform="rotate(-30 95 94)" fill="white" opacity="0.7" />
    </svg>
  );
}

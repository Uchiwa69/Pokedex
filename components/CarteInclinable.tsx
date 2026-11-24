"use client";

import type { PointerEvent, ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";

// Ressort doux : la carte suit la souris avec un peu d'élasticité, puis revient à plat.
const RESSORT = { stiffness: 220, damping: 20 };

type Props = {
  children: ReactNode;
  // Angle maximal d'inclinaison, en degrés. 8 = léger ; les cartes de la grille demandent plus.
  angle?: number;
  // true : un reflet de lumière suit la souris, comme sur une plaque de verre.
  reflet?: boolean;
};

// Incline son contenu en 3D selon la position de la souris.
// Les « motion values » de la bibliothèque motion changent le style directement dans le DOM,
// SANS refaire le rendu React à chaque mouvement de souris (contrairement à useState).
export default function CarteInclinable({ children, angle = 8, reflet = false }: Props) {
  // true si l'utilisateur a demandé moins d'animations dans son système.
  const animationsReduites = useReducedMotion();

  // Position de la souris dans la carte, de -0.5 (bord gauche/haut) à 0.5 (bord droit/bas).
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // useTransform convertit la position en angle ; useSpring adoucit le mouvement.
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-angle, angle]), RESSORT);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [angle, -angle]), RESSORT);

  // Le reflet : une tache de lumière de la taille de la carte, centrée, que l'on DÉPLACE avec transform
  // (de -50 % à +50 % de sa taille) pour amener son centre sous la souris. Son opacité passe de 0 à 1
  // au survol. On n'anime donc que transform et opacity, jamais le dégradé lui-même.
  const refletX = useTransform(x, [-0.5, 0.5], ["-50%", "50%"]);
  const refletY = useTransform(y, [-0.5, 0.5], ["-50%", "50%"]);
  const opaciteReflet = useSpring(0, RESSORT);

  function surDeplacement(evenement: PointerEvent<HTMLDivElement>) {
    // Pas d'inclinaison au doigt (pas de survol sur un écran tactile) ni en animations réduites.
    if (animationsReduites || evenement.pointerType !== "mouse") return;
    const cadre = evenement.currentTarget.getBoundingClientRect();
    x.set((evenement.clientX - cadre.left) / cadre.width - 0.5);
    y.set((evenement.clientY - cadre.top) / cadre.height - 0.5);
    opaciteReflet.set(1);
  }

  function surSortie() {
    x.set(0);
    y.set(0);
    opaciteReflet.set(0);
  }

  return (
    <motion.div
      className="relative h-full"
      // transformPerspective donne la profondeur : plus elle est petite, plus l'inclinaison se voit.
      style={{ rotateX, rotateY, transformPerspective: 700 }}
      onPointerMove={surDeplacement}
      onPointerLeave={surSortie}
    >
      {children}

      {reflet && (
        // Cadre découpé aux arrondis de la carte : le reflet ne déborde pas. pointer-events-none :
        // il est posé par-dessus le contenu mais ne gêne ni les clics ni le survol.
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
          <motion.span
            className="absolute inset-0 bg-[radial-gradient(circle_at_center,color-mix(in_srgb,var(--color-texte)_22%,transparent),transparent_60%)]"
            style={{ x: refletX, y: refletY, opacity: opaciteReflet }}
          />
        </span>
      )}
    </motion.div>
  );
}

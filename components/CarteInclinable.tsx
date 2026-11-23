"use client";

import type { PointerEvent, ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";

// Angle maximal d'inclinaison, en degrés (léger : la carte reste lisible).
const ANGLE_MAX = 8;
// Ressort doux : la carte suit la souris avec un peu d'élasticité, puis revient à plat.
const RESSORT = { stiffness: 220, damping: 20 };

// Incline son contenu en 3D selon la position de la souris.
// Les « motion values » de la bibliothèque motion changent le style directement dans le DOM,
// SANS refaire le rendu React à chaque mouvement de souris (contrairement à useState).
export default function CarteInclinable({ children }: { children: ReactNode }) {
  // true si l'utilisateur a demandé moins d'animations dans son système.
  const animationsReduites = useReducedMotion();

  // Position de la souris dans la carte, de -0.5 (bord gauche/haut) à 0.5 (bord droit/bas).
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // useTransform convertit la position en angle ; useSpring adoucit le mouvement.
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-ANGLE_MAX, ANGLE_MAX]), RESSORT);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [ANGLE_MAX, -ANGLE_MAX]), RESSORT);

  function surDeplacement(evenement: PointerEvent<HTMLDivElement>) {
    // Pas d'inclinaison au doigt (pas de survol sur un écran tactile) ni en animations réduites.
    if (animationsReduites || evenement.pointerType !== "mouse") return;
    const cadre = evenement.currentTarget.getBoundingClientRect();
    x.set((evenement.clientX - cadre.left) / cadre.width - 0.5);
    y.set((evenement.clientY - cadre.top) / cadre.height - 0.5);
  }

  function surSortie() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      className="relative h-full"
      // transformPerspective donne la profondeur : sans elle, la rotation paraîtrait plate.
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      onPointerMove={surDeplacement}
      onPointerLeave={surSortie}
    >
      {children}
    </motion.div>
  );
}

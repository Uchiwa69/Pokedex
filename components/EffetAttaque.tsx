"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { styleTeinte } from "@/lib/teinte";
import type { NomType } from "@/lib/types";

// Les 13 familles d'effets visuels.
type Famille =
  | "flammes"
  | "vague"
  | "eclairs"
  | "feuilles"
  | "cristaux"
  | "ondes"
  | "brume"
  | "choc"
  | "impact"
  | "bulles"
  | "rafale"
  | "secousse"
  | "flash";

// Table de correspondance : type de l'attaque → famille d'effet.
// Les 5 types sans effet dédié réutilisent l'effet le plus proche.
const EFFETS: Record<NomType, Famille> = {
  fire: "flammes",
  water: "vague",
  electric: "eclairs",
  grass: "feuilles",
  ice: "cristaux",
  psychic: "ondes",
  ghost: "brume",
  dragon: "choc",
  fighting: "impact",
  poison: "bulles",
  flying: "rafale",
  ground: "secousse",
  normal: "flash",
  bug: "feuilles",
  rock: "secousse",
  dark: "brume",
  steel: "impact",
  fairy: "ondes",
};

// Durée d'un effet : entre 0,8 et 1,5 s (règle du projet).
export const DUREE_EFFET = 0.95;

type Props = {
  type: NomType;
  // 1 : l'attaque va vers la droite (du joueur vers l'adversaire) ; -1 : vers la gauche.
  sens: 1 | -1;
};

// Positions réparties régulièrement, pour les effets à plusieurs éléments (pas de hasard :
// le rendu doit être identique à chaque fois).
const SIX = [0, 1, 2, 3, 4, 5];

// Effet visuel joué par-dessus le défenseur. Uniquement transform et opacity, en CSS/SVG + motion.
// Le composant est monté au début de l'effet et démonté à la fin par ArenaCombat.
export default function EffetAttaque({ type, sens }: Props) {
  const animationsReduites = useReducedMotion();
  const famille = EFFETS[type];

  // Animations réduites : un simple fondu de la couleur du type, sans particules ni mouvement.
  if (animationsReduites) {
    return (
      <Cadre type={type}>
        <motion.span
          className="absolute inset-[15%] rounded-full bg-[var(--teinte)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.5, 0] }}
          transition={{ duration: 0.4 }}
        />
      </Cadre>
    );
  }

  return <Cadre type={type}>{dessiner(famille, sens)}</Cadre>;
}

// Zone de l'effet : recouvre le défenseur, ne capte pas les clics, invisible pour les lecteurs d'écran.
function Cadre({ type, children }: { type: NomType; children: ReactNode }) {
  return (
    <div aria-hidden="true" style={styleTeinte(type)} className="pointer-events-none absolute inset-0 z-10">
      {children}
    </div>
  );
}

function dessiner(famille: Famille, sens: 1 | -1): ReactNode {
  const d = DUREE_EFFET;

  switch (famille) {
    // Feu : des flammes montent du sol, plus des braises.
    case "flammes":
      return SIX.map((i) => (
        <motion.span
          key={i}
          className="absolute bottom-[18%] h-10 w-6 rounded-[50%_50%_50%_50%/60%_60%_40%_40%] bg-[var(--teinte)]"
          style={{ left: `${18 + i * 12}%` }}
          initial={{ opacity: 0, y: 0, scale: 0.4 }}
          animate={{ opacity: [0, 1, 0.8, 0], y: -70 - (i % 3) * 18, scale: [0.4, 1.3, 0.6] }}
          transition={{ duration: d * 0.8, delay: i * 0.06, ease: "easeOut" }}
        />
      ));

    // Eau : une grande vague traverse la zone.
    case "vague":
      return [0, 1].map((i) => (
        <motion.span
          key={i}
          className="absolute bottom-[15%] left-0 h-2/5 w-full rounded-[100%_100%_0_0] bg-[var(--teinte)]"
          initial={{ opacity: 0, x: `${-90 * sens}%`, scaleY: 0.5 }}
          animate={{ opacity: [0, 0.8, 0.8, 0], x: `${90 * sens}%`, scaleY: [0.5, 1.1, 0.7] }}
          transition={{ duration: d * 0.85, delay: i * 0.15, ease: "easeInOut" }}
        />
      ));

    // Électrik : trois éclairs en zigzag (SVG) clignotent.
    case "eclairs":
      return [0, 1, 2].map((i) => (
        <motion.svg
          key={i}
          viewBox="0 0 40 100"
          className="absolute top-0 h-4/5 w-1/4 text-[var(--teinte)]"
          style={{ left: `${12 + i * 26}%` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0, 1, 0] }}
          transition={{ duration: d * 0.6, delay: i * 0.12 }}
        >
          <polyline points="24,0 8,40 22,42 6,100 34,34 18,32 30,0" fill="currentColor" />
        </motion.svg>
      ));

    // Plante (et Insecte) : des feuilles tourbillonnent en traversant.
    case "feuilles":
      return SIX.map((i) => (
        <motion.span
          key={i}
          className="absolute h-3 w-6 rounded-[100%_0_100%_0] bg-[var(--teinte)]"
          style={{ top: `${15 + i * 11}%`, left: "40%" }}
          initial={{ opacity: 0, x: -110 * sens, rotate: 0 }}
          animate={{ opacity: [0, 1, 1, 0], x: 110 * sens, rotate: 360 * sens }}
          transition={{ duration: d * 0.75, delay: i * 0.07, ease: "easeIn" }}
        />
      ));

    // Glace : des cristaux (losanges) apparaissent puis éclatent.
    case "cristaux":
      return SIX.map((i) => (
        <motion.span
          key={i}
          className="absolute h-6 w-6 bg-[var(--teinte)]"
          style={{ top: `${20 + (i % 3) * 22}%`, left: `${16 + i * 12}%` }}
          initial={{ opacity: 0, scale: 0, rotate: 45 }}
          animate={{ opacity: [0, 1, 1, 0], scale: [0, 1.2, 1, 1.8], rotate: 45 }}
          transition={{ duration: d * 0.8, delay: i * 0.08 }}
        />
      ));

    // Psy (et Fée) : des ondes concentriques s'élargissent.
    case "ondes":
      return [0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute inset-[30%] rounded-full border-4 border-[var(--teinte)]"
          initial={{ opacity: 0, scale: 0.2 }}
          animate={{ opacity: [0, 1, 0], scale: 2.4 }}
          transition={{ duration: d * 0.7, delay: i * 0.18, ease: "easeOut" }}
        />
      ));

    // Spectre (et Ténèbres) : des nappes de brume floues dérivent.
    case "brume":
      return [0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute h-2/5 w-3/5 rounded-full bg-[var(--teinte)] blur-xl"
          style={{ top: `${15 + i * 18}%`, left: "20%" }}
          initial={{ opacity: 0, x: -40 * sens, scale: 0.6 }}
          animate={{ opacity: [0, 0.85, 0.85, 0], x: 40 * sens, scale: 1.3 }}
          transition={{ duration: d, delay: i * 0.1, ease: "easeInOut" }}
        />
      ));

    // Dragon : une onde de choc unique, large, avec un éclat central.
    case "choc":
      return (
        <>
          <motion.span
            className="absolute inset-[35%] rounded-full bg-[var(--teinte)]"
            initial={{ opacity: 0, scale: 0.2 }}
            animate={{ opacity: [0, 1, 0], scale: 1.6 }}
            transition={{ duration: d * 0.45 }}
          />
          <motion.span
            className="absolute inset-[30%] rounded-full border-8 border-[var(--teinte)]"
            initial={{ opacity: 0, scale: 0.1 }}
            animate={{ opacity: [0, 1, 0], scale: 3.2 }}
            transition={{ duration: d * 0.9, ease: "easeOut" }}
          />
        </>
      );

    // Combat (et Acier) : un impact en étoile qui « claque ».
    case "impact":
      return (
        <motion.svg
          viewBox="0 0 100 100"
          className="absolute inset-[18%] text-[var(--teinte)]"
          initial={{ opacity: 0, scale: 0.2, rotate: -20 }}
          animate={{ opacity: [0, 1, 1, 0], scale: [0.2, 1.3, 1, 1.4], rotate: 10 }}
          transition={{ duration: d * 0.6, ease: "easeOut" }}
        >
          <polygon
            points="50,2 60,34 94,22 72,48 98,62 64,66 70,98 50,72 28,98 34,64 2,60 28,46 8,20 40,34"
            fill="currentColor"
          />
        </motion.svg>
      );

    // Poison : des bulles montent en grossissant puis éclatent.
    case "bulles":
      return SIX.map((i) => (
        <motion.span
          key={i}
          className="absolute bottom-[18%] h-5 w-5 rounded-full border-2 border-[var(--teinte)] bg-[var(--teinte)]/40"
          style={{ left: `${15 + i * 13}%` }}
          initial={{ opacity: 0, y: 0, scale: 0.3 }}
          animate={{ opacity: [0, 1, 1, 0], y: -60 - (i % 2) * 30, scale: [0.3, 1, 1.6] }}
          transition={{ duration: d * 0.85, delay: i * 0.08, ease: "easeOut" }}
        />
      ));

    // Vol : des traits de vent horizontaux balaient la zone.
    case "rafale":
      return [0, 1, 2, 3].map((i) => (
        <motion.span
          key={i}
          className="absolute left-[10%] h-1.5 w-4/5 rounded-full bg-[var(--teinte)]"
          style={{ top: `${22 + i * 16}%` }}
          initial={{ opacity: 0, x: -120 * sens, scaleX: 0.3 }}
          animate={{ opacity: [0, 1, 0], x: 120 * sens, scaleX: 1 }}
          transition={{ duration: d * 0.55, delay: i * 0.1, ease: "easeIn" }}
        />
      ));

    // Sol (et Roche) : des blocs jaillissent du sol puis retombent.
    case "secousse":
      return SIX.map((i) => (
        <motion.span
          key={i}
          className="absolute bottom-[14%] h-5 w-6 rounded-md bg-[var(--teinte)]"
          style={{ left: `${12 + i * 13}%` }}
          initial={{ opacity: 0, y: 0, rotate: 0 }}
          animate={{ opacity: [0, 1, 1, 0], y: [0, -50 - (i % 3) * 14, 0], rotate: (i % 2 === 0 ? 1 : -1) * 120 }}
          transition={{ duration: d * 0.8, delay: i * 0.05, ease: "easeOut" }}
        />
      ));

    // Normal : un simple flash clair.
    case "flash":
      return (
        <motion.span
          className="absolute inset-[12%] rounded-full bg-[var(--teinte)]"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: [0, 0.9, 0, 0.7, 0], scale: 1.2 }}
          transition={{ duration: d * 0.6 }}
        />
      );
  }
}

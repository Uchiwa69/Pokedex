"use client";

import { useEffect, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import { GLYPHES, type Mouvement } from "@/lib/glyphes";
import { styleTeinte } from "@/lib/teinte";
import type { NomType } from "@/lib/types";

// Table de correspondance mouvement → classe écrite EN ENTIER : Tailwind lit le code comme du texte
// et ne verrait pas une classe fabriquée à la volée (`effet-${mouvement}`).
const CLASSES: Record<Mouvement, string> = {
  jet: "effet-jet",
  pluie: "effet-pluie",
  montee: "effet-montee",
  flotte: "effet-flotte",
  scintille: "effet-scintille",
  orbite: "effet-orbite",
  envol: "effet-envol",
  traverse: "effet-traverse",
  lourde: "effet-lourde",
};

// Pendant combien de temps les symboles peuvent démarrer en décalé (ms), selon le mouvement.
const ETALEMENT: Record<Mouvement, number> = {
  jet: 140,
  pluie: 600,
  montee: 400,
  flotte: 300,
  scintille: 700,
  orbite: 200,
  envol: 350,
  traverse: 350,
  lourde: 450,
};

// Nombre « au hasard » mais toujours le même pour un même indice (entre 0 et 1).
// On n'utilise pas Math.random : un composant React doit donner le même rendu à chaque fois.
function hasard(indice: number, graine: number) {
  const valeur = Math.sin(indice * 12.9898 + graine * 78.233) * 43758.5453;
  return valeur - Math.floor(valeur);
}

// Tracés des éclairs (dans une grille de 100 × 100, étirée sur toute la hauteur de l'écran).
const ECLAIRS = [
  { trace: "M56 0L43 30l11 2l-16 30l12 2l-14 36", gauche: "30vw", delai: "0ms" },
  { trace: "M40 0l12 24l-10 3l14 28l-9 3l10 42", gauche: "-8vw", delai: "90ms" },
  { trace: "M50 0L38 22l10 4l-12 26l9 3l-8 45", gauche: "62vw", delai: "170ms" },
];

type Props = {
  type: NomType;
  origine: { x: number; y: number }; // centre de la tuile cliquée, en pixels dans la fenêtre
  surFin: () => void;
};

// Effet joué sur tout l'écran quand on choisit un type. Chaque type a sa RECETTE (lib/glyphes.ts) :
// un mouvement pour ses symboles (pluie, braises qui montent, flocons, orbite…), un fond éventuel
// (éclairs, lueur, rafale, vignette, reflet) et un nombre d'ondes partant de la tuile.
// Tout est fait en CSS (transform et opacity uniquement) : aucune image, aucun canvas, aucune bibliothèque.
export default function EffetType({ type, origine, surFin }: Props) {
  const animationsReduites = useReducedMotion();
  const { trace, particules, nombre, duree, fond, anneaux } = GLYPHES[type];
  const dureeTotale = duree + ETALEMENT[particules] + 200;

  // L'effet se retire tout seul une fois terminé.
  useEffect(() => {
    const minuterie = setTimeout(surFin, Math.max(dureeTotale, 1300));
    return () => clearTimeout(minuterie);
  }, [surFin, dureeTotale]);

  // --teinte (couleur du type) et le point de départ, lus par les animations de globals.css.
  const style = { ...styleTeinte(type), "--ox": `${origine.x}px`, "--oy": `${origine.y}px` } as CSSProperties;

  return (
    // aria-hidden + pointer-events-none : purement décoratif, il ne gêne ni la lecture ni les clics.
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-50 overflow-hidden" style={style}>
      <span className="effet-voile absolute inset-0 bg-[var(--teinte)]" />

      {/* Animations réduites : seulement l'éclat de couleur, rien ne bouge. */}
      {!animationsReduites && (
        <>
          {/* ---- Le fond ---- */}
          {fond === "vague" && <span className="effet-vague absolute inset-x-0 bottom-0 h-[90vh]" />}
          {fond === "vignette" && <span className="effet-vignette absolute inset-0" />}
          {fond === "reflet" && <span className="effet-reflet absolute -top-[20vh] left-0 h-[140vh] w-[28vw]" />}
          {fond === "rafale" &&
            Array.from({ length: 7 }, (_, i) => (
              <span
                key={i}
                className="effet-rafale absolute left-0 w-[55vw] rounded-full"
                style={{ "--y": `${12 + i * 14}vh`, "--delai": `${i * 55}ms`, height: 3 + Math.round(hasard(i, 9) * 7) } as CSSProperties}
              />
            ))}
          {fond === "foudre" &&
            ECLAIRS.map((eclair) => (
              <svg
                key={eclair.gauche}
                className="effet-foudre absolute top-0 h-full w-[46vw]"
                style={{ left: eclair.gauche, "--delai": eclair.delai } as CSSProperties}
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <path d={eclair.trace} fill="none" stroke="var(--teinte)" strokeWidth="7" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                <path d={eclair.trace} fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              </svg>
            ))}

          {/* ---- Les ondes partant de la tuile ---- */}
          {Array.from({ length: anneaux }, (_, i) => (
            <span key={i} className="effet-anneau absolute" style={{ "--delai": `${i * 130}ms` } as CSSProperties} />
          ))}

          {/* ---- Les symboles ---- */}
          {Array.from({ length: nombre }, (_, i) => {
            const angle = ((i + hasard(i, 1) * 0.8) / nombre) * 360; // direction, en degrés
            const distance = 34 + hasard(i, 2) * 46; // en « vmax » : proportionnel à l'écran
            const taille = 20 + Math.round(hasard(i, 3) * 30);
            // Toutes les variables sont posées ; chaque animation ne lit que celles dont elle a besoin.
            const styleSymbole = {
              width: taille,
              height: taille,
              margin: -taille / 2,
              "--duree": `${Math.round(duree * (0.8 + hasard(i, 7) * 0.4))}ms`,
              "--delai": `${Math.round(hasard(i, 6) * ETALEMENT[particules])}ms`,
              "--x": `${((i + 0.5) / nombre) * 100 + (hasard(i, 8) - 0.5) * 6}vw`, // réparti sur la largeur
              "--y": `${8 + hasard(i, 9) * 80}vh`,
              "--dx": `${(hasard(i, 10) - 0.5) * 14}vw`, // amplitude du balancement
              "--jx": `${Math.cos((angle * Math.PI) / 180) * distance}vmax`,
              "--jy": `${Math.sin((angle * Math.PI) / 180) * distance}vmax`,
              "--a": `${Math.round(angle)}deg`,
              "--rayon": `${Math.round(22 + hasard(i, 11) * 34)}vmin`,
              "--s": (0.9 + hasard(i, 4) * 1.1).toFixed(2),
              "--r": `${Math.round((hasard(i, 5) - 0.5) * 300)}deg`,
            } as CSSProperties;
            return (
              <svg key={i} viewBox="0 0 24 24" className={`${CLASSES[particules]} absolute left-0 top-0 fill-[var(--teinte)]`} style={styleSymbole}>
                <path d={trace} fillRule="evenodd" />
              </svg>
            );
          })}
        </>
      )}
    </div>
  );
}

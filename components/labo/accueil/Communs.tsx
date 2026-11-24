// PROTOTYPE (/labo/accueil) — petits morceaux partagés par les 4 propositions de haut de page.
// Tout est FACTICE ici : le champ ne lance aucune recherche, les types ne filtrent rien.
// Le but est seulement de comparer des visuels avant d'en choisir un pour la vraie page d'accueil.

import { GLYPHES } from "@/lib/glyphes";
import type { NomType } from "@/lib/types";

// Loupe décorative (la même que dans BarreRecherche).
export function Loupe({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

// Symbole d'un type (tracé venu de lib/glyphes.ts), rempli avec la couleur --teinte du parent.
export function SymboleType({ type, className }: { type: NomType; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d={GLYPHES[type].trace} fillRule="evenodd" />
    </svg>
  );
}

// Nombre écrit à la française : 1025 → « 1 025 ».
export function formaterNombre(nombre: number): string {
  return nombre.toLocaleString("fr-FR");
}

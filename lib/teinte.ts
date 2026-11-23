import type { CSSProperties } from "react";
import { TYPES, type NomType } from "@/lib/types";

// Fabrique le style qui pose la variable CSS --teinte (couleur du type principal) sur un élément.
// Ses enfants peuvent ensuite écrire var(--teinte) dans leurs classes (dégradé, halo, lueur) :
// une seule variable par carte, au lieu d'une classe Tailwind différente par type.
export function styleTeinte(type: NomType | undefined): CSSProperties {
  const couleur = type ? TYPES[type].variable : "var(--color-accent)";
  // TypeScript ne connaît pas les variables CSS personnalisées, d'où le « as ».
  return { "--teinte": couleur } as CSSProperties;
}

import type { CategorieAttaque } from "@/lib/conversion";

// Table de correspondance : catégorie → libellé français.
export const LIBELLES_CATEGORIES: Record<CategorieAttaque, string> = {
  physique: "Physique",
  speciale: "Spéciale",
  statut: "Statut",
};

// Petite icône de la catégorie d'une attaque. Elle est décorative (aria-hidden) :
// le libellé est toujours écrit en texte à côté ou dans un texte caché (sr-only).
export default function IconeCategorie({ categorie }: { categorie: CategorieAttaque }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {/* Physique : un impact en étoile */}
      {categorie === "physique" && <path d="M12 2l2.2 6.3L21 6l-3.6 5.6L22 16l-6.7.2L14 22l-2-5.6L7 21l.6-6.4L2 12l5.4-2L5 4l5.5 3.4z" />}
      {/* Spéciale : des ondes concentriques */}
      {categorie === "speciale" && (
        <>
          <circle cx="12" cy="12" r="2.5" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="9.5" />
        </>
      )}
      {/* Statut : un cercle coupé en deux */}
      {categorie === "statut" && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M5.5 18.5c4-2 4-11 13-13" />
        </>
      )}
    </svg>
  );
}

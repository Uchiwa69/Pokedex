import IconeSac from "@/components/IconeSac";
import type { NomIcone } from "@/lib/navigation";

// Icône d'un lien du menu. Décorative (aria-hidden) : le libellé est toujours écrit à côté.
// stroke="currentColor" : le trait prend la couleur du texte du lien (actif ou non).
export default function IconeNavigation({ nom, className }: { nom: NomIcone; className?: string }) {
  // Le sac existe déjà (indicateur de sacoche) : on réutilise le même dessin.
  if (nom === "sac") return <IconeSac className={className} />;

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Tous : une grille de quatre cases */}
      {nom === "grille" && <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />}
      {/* Favoris : une étoile */}
      {nom === "etoile" && <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />}
      {/* Combat : un éclair */}
      {nom === "eclair" && <path d="M13 2L4 14h6l-1 8 9-12h-6z" />}
      {/* Quiz : un point d'interrogation dans un cercle */}
      {nom === "question" && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1 1-1.1 1.8M12 17h.01" />
        </>
      )}
    </svg>
  );
}

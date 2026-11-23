import Link from "next/link";
import { LIENS_NAVIGATION, estLienActif } from "@/lib/navigation";

// Affiche les liens du menu. Ce composant n'a ni état ni hook : il peut être rendu
// côté serveur (version sans lien actif) comme côté client (dans Navigation).
export default function LiensNavigation({ cheminActif }: { cheminActif: string | null }) {
  return (
    // Le menu est une « gélule » en verre ; sur mobile il occupe toute la largeur.
    <ul className="flex items-center justify-between gap-1 rounded-full border border-bordure-verre bg-surface p-1 sm:justify-start">
      {LIENS_NAVIGATION.map((lien) => {
        const actif = estLienActif(lien.href, cheminActif);
        return (
          <li key={lien.href} className="flex-1 sm:flex-none">
            <Link
              href={lien.href}
              // aria-current annonce la page en cours aux lecteurs d'écran.
              aria-current={actif ? "page" : undefined}
              className={
                actif
                  ? "flex min-h-9 items-center justify-center rounded-full bg-accent px-2 text-sm font-semibold text-sur-accent shadow-lueur sm:px-4"
                  : "flex min-h-9 items-center justify-center rounded-full px-2 text-sm font-medium text-texte-doux hover:bg-piste hover:text-texte sm:px-4"
              }
            >
              {lien.libelle}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

import Link from "next/link";
import IconeNavigation from "@/components/IconeNavigation";
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
              // Mobile : icône AU-DESSUS du libellé (flex-col), comme la barre d'une appli.
              // À partir de sm : icône à gauche du libellé (flex-row).
              // `group` : l'icône réagit au survol du lien entier (group-hover).
              className={`group flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-full px-2 text-[11px] sm:min-h-10 sm:flex-row sm:gap-2 sm:px-4 sm:text-sm ${
                actif
                  ? "bg-accent font-semibold text-sur-accent shadow-lueur"
                  : "font-medium text-texte-doux hover:bg-piste hover:text-texte"
              }`}
            >
              {/* L'icône grossit un peu au survol : on n'anime que transform, et pas en animations réduites. */}
              <IconeNavigation
                nom={lien.icone}
                className="size-4 transition-transform duration-200 group-hover:scale-125 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              />
              {lien.libelle}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

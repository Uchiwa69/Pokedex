import Link from "next/link";
import CompteurFavoris from "@/components/CompteurFavoris";
import IconeNavigation from "@/components/IconeNavigation";
import { LIENS_NAVIGATION, estLienActif } from "@/lib/navigation";

// Affiche les liens du menu. Ce composant n'a ni état ni hook : il peut être rendu
// côté serveur (version sans lien actif) comme côté client (dans Navigation).
export default function LiensNavigation({ cheminActif }: { cheminActif: string | null }) {
  return (
    // De simples onglets posés sur l'en-tête, sans cadre autour ; sur mobile ils occupent toute la largeur.
    <ul className="flex items-center justify-between gap-1 lg:justify-start">
      {LIENS_NAVIGATION.map((lien) => {
        const actif = estLienActif(lien.href, cheminActif);
        return (
          <li key={lien.href} className="flex-1 lg:flex-none">
            <Link
              href={lien.href}
              // aria-current annonce la page en cours aux lecteurs d'écran.
              aria-current={actif ? "page" : undefined}
              // Mobile : icône AU-DESSUS du libellé (flex-col), comme la barre d'une appli.
              // À partir de sm : icône à gauche du libellé (flex-row).
              // `group` : l'icône réagit au survol du lien entier (group-hover).
              // relative : le compteur de favoris et le filet de l'onglet actif se placent par rapport au lien.
              // Onglet actif : texte plein, fond subtil, et un filet rouge dessous (pseudo-élément after:).
              className={`group relative flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-[11px] sm:flex-row sm:gap-2 sm:px-3 sm:text-sm ${
                actif
                  ? "bg-piste font-semibold text-texte after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-accent"
                  : "font-medium text-texte-doux hover:bg-piste hover:text-texte"
              }`}
            >
              {/* L'icône grossit un peu au survol : on n'anime que transform, et pas en animations réduites.
                  Sur l'onglet actif, elle prend la couleur d'accent. */}
              <IconeNavigation
                nom={lien.icone}
                className={`size-4 transition-transform duration-200 group-hover:scale-125 motion-reduce:transition-none motion-reduce:group-hover:scale-100 ${
                  actif ? "text-accent" : ""
                }`}
              />
              {lien.libelle}
              {/* Le nombre de favoris, à côté de son lien (composant client : il lit le store). */}
              {lien.href === "/favoris" && <CompteurFavoris />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

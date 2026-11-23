import Link from "next/link";
import { LIENS_NAVIGATION, estLienActif } from "@/lib/navigation";

// Affiche les liens du menu. Ce composant n'a ni état ni hook : il peut être rendu
// côté serveur (version sans lien actif) comme côté client (dans Navigation).
export default function LiensNavigation({ cheminActif }: { cheminActif: string | null }) {
  return (
    <ul className="flex items-center gap-2">
      {LIENS_NAVIGATION.map((lien) => {
        const actif = estLienActif(lien.href, cheminActif);
        return (
          <li key={lien.href}>
            <Link
              href={lien.href}
              // aria-current annonce la page en cours aux lecteurs d'écran.
              aria-current={actif ? "page" : undefined}
              className={
                actif
                  ? "flex min-h-11 items-center rounded-lg bg-accent px-3 text-sm font-semibold text-sur-accent"
                  : "flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-texte-doux hover:bg-piste hover:text-texte"
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

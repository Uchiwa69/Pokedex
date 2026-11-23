import Link from "next/link";
import { construireAdresse, type Filtres } from "@/lib/recherche";

type Props = {
  filtres: Filtres; // q et type en cours, pour les garder dans les liens
  page: number; // page réellement affichée
  totalPages: number;
};

const CLASSES_LIEN =
  "flex min-h-11 items-center rounded-lg border border-bordure bg-surface px-4 text-sm font-semibold text-texte hover:bg-piste";
const CLASSES_INACTIF =
  "flex min-h-11 items-center rounded-lg border border-bordure px-4 text-sm font-semibold text-texte-doux opacity-60";

// Pagination en liens serveur : « Précédent », « Page 2 sur 43 », « Suivant ».
export default function Pagination({ filtres, page, totalPages }: Props) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4">
      {page > 1 ? (
        <Link href={construireAdresse({ ...filtres, page: page - 1 })} className={CLASSES_LIEN}>
          ← Précédent
        </Link>
      ) : (
        // Pas de page précédente : un simple texte, pas un lien qui ne mènerait nulle part.
        <span className={CLASSES_INACTIF} aria-disabled="true">
          ← Précédent
        </span>
      )}

      <p className="text-sm text-texte-doux">
        Page {page} sur {totalPages}
      </p>

      {page < totalPages ? (
        <Link href={construireAdresse({ ...filtres, page: page + 1 })} className={CLASSES_LIEN}>
          Suivant →
        </Link>
      ) : (
        <span className={CLASSES_INACTIF} aria-disabled="true">
          Suivant →
        </span>
      )}
    </nav>
  );
}

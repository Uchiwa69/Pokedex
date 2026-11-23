import Link from "next/link";
import { construireAdresse } from "@/lib/recherche";
import { NOMS_TYPES, TYPES, type NomType } from "@/lib/types";

type Props = {
  q: string;
  typeActif: NomType | null;
};

// Filtre par type : de simples LIENS rendus côté serveur, aucun JavaScript nécessaire.
// Chaque lien garde la recherche en cours (q) et revient à la page 1.
export default function FiltreTypes({ q, typeActif }: Props) {
  return (
    <nav aria-label="Filtrer par type">
      {/* Sur mobile : une seule ligne qui défile horizontalement. À partir de sm : retour à la ligne. */}
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        <li className="shrink-0">
          <Link
            href={construireAdresse({ q, type: null, page: 1 })}
            aria-current={typeActif === null ? "true" : undefined}
            className={
              typeActif === null
                ? "flex min-h-9 items-center rounded-full bg-accent px-4 text-xs font-semibold text-sur-accent shadow-lueur"
                : "flex min-h-9 items-center rounded-full border border-bordure bg-surface px-4 text-xs font-semibold text-texte hover:bg-piste"
            }
          >
            Tous les types
          </Link>
        </li>
        {NOMS_TYPES.map((type) => {
          const actif = type === typeActif;
          return (
            <li key={type} className="shrink-0">
              <Link
                href={construireAdresse({ q, type, page: 1 })}
                aria-current={actif ? "true" : undefined}
                // Le type actif est entouré d'un anneau.
                className={`flex min-h-9 items-center rounded-full px-4 text-xs font-semibold ${TYPES[type].classes} ${
                  actif ? "ring-2 ring-texte ring-offset-2 ring-offset-fond" : ""
                }`}
              >
                {TYPES[type].libelle}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

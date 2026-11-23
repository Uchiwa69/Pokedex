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
      <ul className="flex flex-wrap gap-2">
        <li>
          <Link
            href={construireAdresse({ q, type: null, page: 1 })}
            aria-current={typeActif === null ? "true" : undefined}
            className={
              typeActif === null
                ? "flex min-h-8 items-center rounded-full bg-accent px-3 text-xs font-semibold text-sur-accent"
                : "flex min-h-8 items-center rounded-full border border-bordure bg-surface px-3 text-xs font-semibold text-texte hover:bg-piste"
            }
          >
            Tous les types
          </Link>
        </li>
        {NOMS_TYPES.map((type) => {
          const actif = type === typeActif;
          return (
            <li key={type}>
              <Link
                href={construireAdresse({ q, type, page: 1 })}
                aria-current={actif ? "true" : undefined}
                // Le type actif est entouré d'un anneau.
                className={`flex min-h-8 items-center rounded-full px-3 text-xs font-semibold ${TYPES[type].classes} ${
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

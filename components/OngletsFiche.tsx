import { Suspense } from "react";
import Link from "next/link";
import ChaineEvolution from "@/components/ChaineEvolution";
import ListeAttaques, { SqueletteAttaques } from "@/components/ListeAttaques";
import type { Pokemon } from "@/lib/conversion";

type Props = {
  pokemon: Pokemon;
  // La promesse des paramètres d'adresse, transmise par la page sans avoir été lue.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const ONGLETS = [
  { cle: "evolutions", libelle: "Évolutions" },
  { cle: "attaques", libelle: "Attaques" },
] as const;

// Onglets de la fiche. L'onglet actif vit dans l'adresse (?onglet=attaques), comme la recherche :
// les onglets sont donc de simples LIENS, sans JavaScript, et l'onglet peut être partagé.
// Avantage : les attaques ne sont chargées que si l'on ouvre leur onglet.
export default async function OngletsFiche({ pokemon, searchParams }: Props) {
  const { onglet } = await searchParams;
  // Validation : toute valeur inconnue (?onglet=nimporte) retombe sur le premier onglet.
  const actif = onglet === "attaques" ? "attaques" : "evolutions";

  return (
    <section aria-label="Évolutions et attaques" className="flex flex-col gap-4">
      <nav aria-label="Onglets de la fiche">
        <ul className="flex w-fit gap-1 rounded-full border border-bordure-verre bg-surface p-1">
          {ONGLETS.map((element) => (
            <li key={element.cle}>
              <Link
                // Le premier onglet est l'adresse sans paramètre.
                href={element.cle === "evolutions" ? `/pokemon/${pokemon.nom}` : `/pokemon/${pokemon.nom}?onglet=${element.cle}`}
                // scroll={false} : on reste au même endroit de la page en changeant d'onglet.
                scroll={false}
                aria-current={actif === element.cle ? "page" : undefined}
                className={
                  actif === element.cle
                    ? "flex min-h-11 items-center rounded-full bg-accent px-5 text-sm font-semibold text-sur-accent shadow-lueur"
                    : "flex min-h-11 items-center rounded-full px-5 text-sm font-medium text-texte-doux hover:bg-piste hover:text-texte"
                }
              >
                {element.libelle}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {actif === "attaques" ? (
        <>
          <h2 className="font-titre text-xl font-semibold">Attaques apprises par niveau</h2>
          <Suspense fallback={<SqueletteAttaques />}>
            <ListeAttaques nom={pokemon.nom} />
          </Suspense>
        </>
      ) : (
        <>
          <h2 className="font-titre text-xl font-semibold">Chaîne d&apos;évolution</h2>
          {/* Suspense imbriqué : la chaîne arrive après le reste, sans bloquer la fiche. */}
          <Suspense fallback={<p className="etiquette">Chargement des évolutions…</p>}>
            <ChaineEvolution nomEspece={pokemon.espece} nomActuel={pokemon.nom} />
          </Suspense>
        </>
      )}
    </section>
  );
}

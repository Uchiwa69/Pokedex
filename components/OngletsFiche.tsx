import { Suspense } from "react";
import ChaineEvolution from "@/components/ChaineEvolution";
import LiensOnglets from "@/components/LiensOnglets";
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
      {/* Les liens sont dans un petit composant client (préchargement au survol) ; tout le reste est serveur. */}
      <LiensOnglets
        actif={actif}
        onglets={ONGLETS.map((element) => ({
          cle: element.cle,
          libelle: element.libelle,
          // Le premier onglet est l'adresse sans paramètre.
          href: element.cle === "evolutions" ? `/pokemon/${pokemon.nom}` : `/pokemon/${pokemon.nom}?onglet=${element.cle}`,
        }))}
      />

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

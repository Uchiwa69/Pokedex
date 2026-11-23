import { Suspense } from "react";
import BarreRecherche from "@/components/BarreRecherche";
import EtatVide from "@/components/EtatVide";
import FiltreTypes from "@/components/FiltreTypes";
import GrillePokemons from "@/components/GrillePokemons";
import Pagination from "@/components/Pagination";
import SqueletteGrille from "@/components/SqueletteGrille";
import { recupererListe } from "@/lib/pokeapi";
import { validerFiltres } from "@/lib/recherche";
import { TYPES } from "@/lib/types";

// searchParams (comme params) est une promesse : ce sont des données de la REQUÊTE,
// inconnues au build. On les lit donc dans un composant placé sous <Suspense>.
type Props = PageProps<"/">;

export default function PageAccueil({ searchParams }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="etiquette">Pokédex national</p>
        <h1 className="font-titre text-3xl font-bold">Tous les Pokémon</h1>
      </header>

      {/* BarreRecherche lit l'adresse avec useSearchParams → elle aussi a besoin d'un Suspense. */}
      <Suspense fallback={<div className="h-28" />}>
        <BarreRecherche />
      </Suspense>

      {/* Le filtre a son propre <Suspense> : il s'affiche sans attendre la liste des Pokémon.
          En attendant l'adresse, on montre déjà le filtre (sans type actif) : il occupe exactement
          la même place, donc rien ne se décale. */}
      <Suspense fallback={<FiltreTypes q="" typeActif={null} />}>
        <Filtre searchParams={searchParams} />
      </Suspense>

      <Suspense fallback={<SqueletteGrille />}>
        <Resultats searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

// Lit l'adresse (aucune donnée à charger) et passe le type actif au filtre.
async function Filtre({ searchParams }: { searchParams: Props["searchParams"] }) {
  const filtres = validerFiltres(await searchParams);
  return <FiltreTypes q={filtres.q} typeActif={filtres.type} />;
}

async function Resultats({ searchParams }: { searchParams: Props["searchParams"] }) {
  // 1. Lire puis VALIDER l'adresse (type inconnu, page farfelue… → valeurs par défaut).
  const filtres = validerFiltres(await searchParams);

  // 2. Charger la page demandée (fonction en cache).
  const resultat = await recupererListe(filtres.q, filtres.type, filtres.page);

  return (
    <div className="flex flex-col gap-6">
      {resultat.total === 0 ? (
        <EtatVide
          titre="Aucun Pokémon trouvé"
          message={
            filtres.type
              ? `Aucun Pokémon de type ${TYPES[filtres.type].libelle} ne correspond à « ${filtres.q} ». Essaie un nom français ou anglais, même incomplet.`
              : `Aucun Pokémon ne correspond à « ${filtres.q} ». Essaie un nom français ou anglais, même incomplet.`
          }
          lien={{ href: "/", libelle: "Effacer la recherche et le filtre" }}
        />
      ) : (
        <>
          <p className="etiquette">
            {resultat.total.toLocaleString("fr-FR")} {resultat.total > 1 ? "Pokémon trouvés" : "Pokémon trouvé"}
          </p>
          <GrillePokemons pokemons={resultat.pokemons} />
          <Pagination filtres={filtres} page={resultat.page} totalPages={resultat.totalPages} />
        </>
      )}
    </div>
  );
}

import { Suspense } from "react";
import BarreRecherche from "@/components/BarreRecherche";
import EtatVide from "@/components/EtatVide";
import FiltreTypes from "@/components/FiltreTypes";
import GrillePokemons from "@/components/GrillePokemons";
import IntroPokedex from "@/components/IntroPokedex";
import Pagination from "@/components/Pagination";
import SqueletteGrille from "@/components/SqueletteGrille";
import { recupererListe, recupererTousLesNoms } from "@/lib/pokeapi";
import { validerFiltres } from "@/lib/recherche";
import { TYPES } from "@/lib/types";

// searchParams (comme params) est une promesse : ce sont des données de la REQUÊTE,
// inconnues au build. On les lit donc dans un composant placé sous <Suspense>.
type Props = PageProps<"/">;

export default function PageAccueil({ searchParams }: Props) {
  return (
    // IntroPokedex (composant client) reçoit toute la page en « children » : les composants ci-dessous restent
    // des composants serveur, rendus normalement. À la première arrivée, il les affiche dans l'écran d'un
    // Pokédex géant, puis on plonge dedans ; ensuite, il les affiche simplement, en colonne.
    <IntroPokedex>
      {/* Haut de page centré et compact : titre, recherche, puis les types. Peu de hauteur, pour que les
          cartes arrivent vite à l'écran. */}
      <div className="flex flex-col items-center gap-4 pb-4 text-center">
        {/* Titre sobre : un vrai texte (le seul h1 de la page), et le nombre de Pokémon du Pokédex dessous. */}
        <header className="flex w-full flex-col items-center gap-1">
          <h1 className="font-titre text-3xl font-bold tracking-tight sm:text-4xl">Pokédex National</h1>
          <NombreTotal />
        </header>

        {/* BarreRecherche lit l'adresse avec useSearchParams → elle aussi a besoin d'un Suspense.
            max-w-2xl : le champ ne s'étire pas sur toute la largeur. Le repli a la hauteur du champ. */}
        <div className="w-full max-w-2xl text-left">
          <Suspense fallback={<div className="h-12" />}>
            <BarreRecherche />
          </Suspense>
        </div>

        {/* Le filtre a son propre <Suspense> : il s'affiche sans attendre la liste des Pokémon.
            En attendant l'adresse, on montre déjà le filtre (sans type actif) : il occupe exactement
            la même place, donc rien ne se décale. */}
        <div className="w-full">
          <Suspense fallback={<FiltreTypes q="" typeActif={null} disposition="grille" />}>
            <Filtre searchParams={searchParams} />
          </Suspense>
        </div>
      </div>

      <Suspense fallback={<SqueletteGrille />}>
        <Resultats searchParams={searchParams} />
      </Suspense>
    </IntroPokedex>
  );
}

// Lit l'adresse (aucune donnée à charger) et passe le type actif au filtre.
async function Filtre({ searchParams }: { searchParams: Props["searchParams"] }) {
  const filtres = validerFiltres(await searchParams);
  return <FiltreTypes q={filtres.q} typeActif={filtres.type} disposition="grille" />;
}

// Le nombre de Pokémon du Pokédex, sous le titre. Composant serveur asynchrone : la liste des noms vient
// d'une fonction en cache ("use cache"), elle est donc connue au build et fait partie de la page statique.
async function NombreTotal() {
  const noms = await recupererTousLesNoms();
  // toLocaleString("fr-FR") : « 1 025 » avec l'espace des milliers.
  return <p className="text-sm font-medium text-texte-doux">{noms.length.toLocaleString("fr-FR")} Pokémon</p>;
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
          {/* Le nombre de résultats n'est affiché que s'il y a une recherche ou un type : sinon il répéterait
              le total déjà écrit sous le titre. */}
          {(filtres.q || filtres.type) && (
            <p className="etiquette">
              {resultat.total.toLocaleString("fr-FR")} {resultat.total > 1 ? "Pokémon trouvés" : "Pokémon trouvé"}
            </p>
          )}
          <GrillePokemons pokemons={resultat.pokemons} />
          <Pagination filtres={filtres} page={resultat.page} totalPages={resultat.totalPages} />
        </>
      )}
    </div>
  );
}

import { Suspense } from "react";
import Link from "next/link";
import BarreRecherche from "@/components/BarreRecherche";
import EtatVide from "@/components/EtatVide";
import FiltreTypes from "@/components/FiltreTypes";
import GrillePokemons from "@/components/GrillePokemons";
import IntroPokedex from "@/components/IntroPokedex";
import Pagination from "@/components/Pagination";
import SqueletteGrille from "@/components/SqueletteGrille";
import TitreParticules from "@/components/TitreParticules";
import { recupererListe, TOTAL_POKEMONS } from "@/lib/pokeapi";
import { validerFiltres } from "@/lib/recherche";
import { NOMS_TYPES, TYPES } from "@/lib/types";

// « 1 025 ». toLocaleString sépare les milliers par une espace FINE, presque invisible dans un texte courant :
// on la remplace par une espace insécable ordinaire.
const TOTAL = TOTAL_POKEMONS.toLocaleString("fr-FR").replace(/ /g, " ");

// searchParams (comme params) est une promesse : ce sont des données de la REQUÊTE,
// inconnues au build. On les lit donc dans un composant placé sous <Suspense>.
type Props = PageProps<"/">;

export default function PageAccueil({ searchParams }: Props) {
  return (
    // IntroPokedex (composant client) reçoit toute la page en « children » : les composants ci-dessous restent
    // des composants serveur, rendus normalement. À la première arrivée, il les affiche dans l'écran d'un
    // Pokédex géant, puis on plonge dedans ; ensuite, il les affiche simplement, en colonne.
    <IntroPokedex>
      {/* Haut de page centré : titre, phrase d'accroche, recherche, lien vers l'atelier, puis les types.
          (Choisi parmi quatre propositions comparées dans /labo/hero.) */}
      <div className="flex flex-col items-center gap-6 py-4 text-center sm:py-6">
        {/* Le titre a sa propre zone, sur toute la largeur : il est dessiné en particules (TitreParticules),
            qui ont besoin de place autour d'elles. L'accroche et le lien vers l'atelier sont réunis dessous. */}
        <header className="flex w-full flex-col items-center gap-1">
          <p className="etiquette">Pokédex national</p>
          <TitreParticules texte="Tous les Pokémon" />
          <p className="max-w-xl text-sm text-texte-doux sm:text-base">
            {TOTAL} Pokémon, {NOMS_TYPES.length} types. Cherche par nom ou par numéro, ou{" "}
            <Link href="/atelier" className="font-medium text-accent underline">
              crée ta carte dans l&apos;atelier
            </Link>
            .
          </p>
        </header>

        {/* BarreRecherche lit l'adresse avec useSearchParams → elle aussi a besoin d'un Suspense.
            max-w-2xl : le champ ne s'étire plus sur toute la largeur ; text-left : son libellé reste à gauche. */}
        <div className="w-full max-w-2xl text-left">
          <Suspense fallback={<div className="h-28" />}>
            <BarreRecherche />
          </Suspense>
        </div>

        {/* Le filtre a son propre <Suspense> : il s'affiche sans attendre la liste des Pokémon.
            En attendant l'adresse, on montre déjà le filtre (sans type actif) : il occupe exactement
            la même place, donc rien ne se décale. */}
        <div className="w-full">
          <Suspense fallback={<FiltreTypes q="" typeActif={null} disposition="centre" />}>
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
  return <FiltreTypes q={filtres.q} typeActif={filtres.type} disposition="centre" />;
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

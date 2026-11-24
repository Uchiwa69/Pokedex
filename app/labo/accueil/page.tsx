// PROTOTYPE — page de comparaison pour la page d'accueil.
// Elle n'est liée depuis aucun menu : on y accède par l'adresse /labo/accueil.
// Deux rangées d'onglets, que l'on peut COMBINER :
//   - le cadre et la navigation (?cadre=…) : coque de Pokédex rouge, coque sombre, panneau latéral, dock, ou l'actuel ;
//   - le haut de page (?haut=…) : propositions A, B, C, D.
// La grille de cartes dessous est la vraie. Le menu, la recherche et les types sont factices
// (ils ne naviguent pas et ne filtrent rien) : on compare seulement les visuels.

import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import GrillePokemons from "@/components/GrillePokemons";
import SqueletteGrille from "@/components/SqueletteGrille";
import CoqueLaterale from "@/components/labo/accueil/CoqueLaterale";
import CoquePokedex from "@/components/labo/accueil/CoquePokedex";
import DockFlottant from "@/components/labo/accueil/DockFlottant";
import HautAppareil from "@/components/labo/accueil/HautAppareil";
import HautCommande from "@/components/labo/accueil/HautCommande";
import HautDefile from "@/components/labo/accueil/HautDefile";
import HautVedette from "@/components/labo/accueil/HautVedette";
import { recupererListe, recupererPokemon } from "@/lib/pokeapi";

export const metadata: Metadata = {
  title: "Labo · Accueil",
  robots: { index: false },
};

const CADRES = [
  { cle: "rouge", libelle: "1 · Coque rouge" },
  { cle: "sombre", libelle: "2 · Coque sombre" },
  { cle: "lateral", libelle: "3 · Panneau latéral" },
  { cle: "dock", libelle: "4 · Dock flottant" },
  { cle: "actuel", libelle: "Actuel" },
] as const;

const HAUTS = [
  { cle: "a", libelle: "A · Vedette" },
  { cle: "b", libelle: "B · Écran de Pokédex" },
  { cle: "c", libelle: "C · Barre de commande" },
  { cle: "d", libelle: "D · Défilé" },
] as const;

type CleCadre = (typeof CADRES)[number]["cle"];
type CleHaut = (typeof HAUTS)[number]["cle"];

// Le Pokémon mis en avant dans les hauts de page A et B.
const NOM_VEDETTE = "charizard";

type Props = PageProps<"/labo/accueil">;

export default function PageLaboAccueil({ searchParams }: Props) {
  return (
    // searchParams est une donnée de la requête : on la lit dans un composant sous <Suspense>.
    <Suspense fallback={<SqueletteGrille />}>
      <Contenu searchParams={searchParams} />
    </Suspense>
  );
}

// Une rangée d'onglets. Ce sont de simples liens : le choix vit dans l'adresse, comme les onglets de la fiche.
function Onglets({ titre, choix, actif, adresse }: { titre: string; choix: readonly { cle: string; libelle: string }[]; actif: string; adresse: (cle: string) => string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="etiquette w-full px-2 sm:w-44">{titre}</p>
      <ul className="flex flex-wrap gap-1">
        {choix.map((element) => (
          <li key={element.cle}>
            <Link
              href={adresse(element.cle)}
              aria-current={actif === element.cle ? "page" : undefined}
              className={
                actif === element.cle
                  ? "flex min-h-9 items-center rounded-full bg-accent px-4 text-sm font-semibold text-sur-accent shadow-lueur"
                  : "flex min-h-9 items-center rounded-full px-4 text-sm font-medium text-texte-doux hover:bg-piste hover:text-texte"
              }
            >
              {element.libelle}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

async function Contenu({ searchParams }: { searchParams: Props["searchParams"] }) {
  const parametres = await searchParams;
  // Validation : toute valeur inconnue retombe sur le premier choix (coque rouge) et sur le haut C.
  const cadre: CleCadre = CADRES.find((element) => element.cle === parametres.cadre)?.cle ?? "rouge";
  const haut: CleHaut = HAUTS.find((element) => element.cle === parametres.haut)?.cle ?? "c";

  const [vedette, liste] = await Promise.all([recupererPokemon(NOM_VEDETTE), recupererListe("", null, 1)]);
  if (!vedette) throw new Error("Le Pokémon vedette du labo est introuvable.");

  // Ce qui s'affiche « dans l'écran », quel que soit le cadre choisi.
  const interieur: ReactNode = (
    <>
      <nav aria-label="Propositions du labo" className="flex flex-col gap-2 rounded-3xl border border-dashed border-bordure p-2">
        <Onglets titre="Cadre et navigation" choix={CADRES} actif={cadre} adresse={(cle) => `/labo/accueil?cadre=${cle}&haut=${haut}`} />
        <Onglets titre="Haut de page" choix={HAUTS} actif={haut} adresse={(cle) => `/labo/accueil?cadre=${cadre}&haut=${cle}`} />
      </nav>

      {haut === "a" && <HautVedette vedette={vedette} total={liste.total} />}
      {haut === "b" && <HautAppareil vedette={vedette} total={liste.total} />}
      {haut === "c" && <HautCommande total={liste.total} />}
      {haut === "d" && <HautDefile pokemons={liste.pokemons} total={liste.total} />}

      <p className="etiquette">{liste.total.toLocaleString("fr-FR")} Pokémon trouvés</p>
      <GrillePokemons pokemons={liste.pokemons} />
    </>
  );

  if (cadre === "rouge" || cadre === "sombre") return <CoquePokedex ton={cadre}>{interieur}</CoquePokedex>;
  if (cadre === "lateral") return <CoqueLaterale>{interieur}</CoqueLaterale>;
  if (cadre === "dock") return <DockFlottant>{interieur}</DockFlottant>;
  // « Actuel » : la page s'affiche dans la mise en page habituelle du site (en-tête d'aujourd'hui).
  return <div className="flex flex-col gap-6">{interieur}</div>;
}

// PROTOTYPE — page de comparaison pour le haut de la page d'accueil.
// Elle n'est liée depuis aucun menu : on y accède par l'adresse /labo/accueil.
// Un onglet par proposition (A, B, C, D). Seul le HAUT change : la grille de cartes dessous est la vraie.
// La recherche et les types y sont factices (ils ne filtrent rien) : on compare seulement les visuels.

import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import GrillePokemons from "@/components/GrillePokemons";
import SqueletteGrille from "@/components/SqueletteGrille";
import HautAppareil from "@/components/labo/accueil/HautAppareil";
import HautCommande from "@/components/labo/accueil/HautCommande";
import HautDefile from "@/components/labo/accueil/HautDefile";
import HautVedette from "@/components/labo/accueil/HautVedette";
import { recupererListe, recupererPokemon } from "@/lib/pokeapi";

export const metadata: Metadata = {
  title: "Labo · Haut de l'accueil",
  robots: { index: false },
};

const VARIANTES = [
  { cle: "a", libelle: "A · Vedette" },
  { cle: "b", libelle: "B · Écran de Pokédex" },
  { cle: "c", libelle: "C · Barre de commande" },
  { cle: "d", libelle: "D · Défilé" },
] as const;

type Cle = (typeof VARIANTES)[number]["cle"];

// Le Pokémon mis en avant dans les propositions A et B.
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

async function Contenu({ searchParams }: { searchParams: Props["searchParams"] }) {
  const { v } = await searchParams;
  // Validation : toute valeur inconnue (?v=nimporte) retombe sur la proposition A.
  const active: Cle = VARIANTES.find((variante) => variante.cle === v)?.cle ?? "a";

  const [vedette, liste] = await Promise.all([recupererPokemon(NOM_VEDETTE), recupererListe("", null, 1)]);
  if (!vedette) throw new Error("Le Pokémon vedette du labo est introuvable.");

  return (
    <div className="flex flex-col gap-6">
      {/* Bandeau du labo : les onglets sont de simples liens (?v=b), comme les onglets de la fiche. */}
      <nav aria-label="Propositions" className="flex flex-wrap items-center gap-2 rounded-3xl border border-dashed border-bordure p-2">
        <p className="etiquette px-2">Labo · haut de l&apos;accueil</p>
        <ul className="flex flex-wrap gap-1">
          {VARIANTES.map((variante) => (
            <li key={variante.cle}>
              <Link
                href={`/labo/accueil?v=${variante.cle}`}
                scroll={false}
                aria-current={active === variante.cle ? "page" : undefined}
                className={
                  active === variante.cle
                    ? "flex min-h-9 items-center rounded-full bg-accent px-4 text-sm font-semibold text-sur-accent shadow-lueur"
                    : "flex min-h-9 items-center rounded-full px-4 text-sm font-medium text-texte-doux hover:bg-piste hover:text-texte"
                }
              >
                {variante.libelle}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {active === "a" && <HautVedette vedette={vedette} total={liste.total} />}
      {active === "b" && <HautAppareil vedette={vedette} total={liste.total} />}
      {active === "c" && <HautCommande total={liste.total} />}
      {active === "d" && <HautDefile pokemons={liste.pokemons} total={liste.total} />}

      <p className="etiquette">{liste.total.toLocaleString("fr-FR")} Pokémon trouvés</p>
      <GrillePokemons pokemons={liste.pokemons} />
    </div>
  );
}

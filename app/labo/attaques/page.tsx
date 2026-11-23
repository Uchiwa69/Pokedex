// PROTOTYPE (branche feature/pokemon-2d-attack-animations) — page de test des effets d'attaque 2D.
// Elle n'est liée depuis aucun menu : on y accède par l'adresse /labo/attaques.
// Le mode combat existant (ArenaCombat, EffetAttaque) n'est pas modifié.

import { Suspense } from "react";
import type { Metadata } from "next";
import SceneAttaques2D from "@/components/labo/SceneAttaques2D";
import { recupererMeilleuresAttaques, recupererPokemon } from "@/lib/pokeapi";

export const metadata: Metadata = {
  title: "Labo · Effets d'attaque 2D",
  robots: { index: false },
};

type Props = PageProps<"/labo/attaques">;

export default function PageLaboAttaques({ searchParams }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="etiquette">Laboratoire · prototype non intégré</p>
        <h1 className="font-titre text-3xl font-bold">Effets d&apos;attaque 2D</h1>
        <p className="max-w-3xl text-sm text-texte-doux">
          Chaque attaque reçoit automatiquement un effet selon son type (couleurs, matière, trajectoire), sa catégorie
          (à distance, contact ou statut) et sa puissance (intensité). Change les deux Pokémon avec l&apos;adresse :
          <code className="px-1">/labo/attaques?j=pikachu&amp;a=gengar</code>.
        </p>
      </header>

      <Suspense fallback={<div role="status" aria-label="Chargement" className="h-96 animate-pulse rounded-3xl bg-piste motion-reduce:animate-none" />}>
        <Contenu searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function premiere(valeur: string | string[] | undefined): string {
  return Array.isArray(valeur) ? (valeur[0] ?? "") : (valeur ?? "");
}

async function Contenu({ searchParams }: { searchParams: Props["searchParams"] }) {
  const parametres = await searchParams;

  // Validation : un nom inconnu (recupererPokemon renvoie null) est remplacé par le Pokémon par défaut.
  const [demandeJoueur, demandeAdversaire] = await Promise.all([
    recupererPokemon(premiere(parametres.j) || "charizard"),
    recupererPokemon(premiere(parametres.a) || "blastoise"),
  ]);
  const joueur = demandeJoueur ?? (await recupererPokemon("charizard"));
  const adversaire = demandeAdversaire ?? (await recupererPokemon("blastoise"));
  if (!joueur || !adversaire) throw new Error("Les Pokémon du banc d'essai sont introuvables.");

  const [attaquesJoueur, attaquesAdversaire] = await Promise.all([
    recupererMeilleuresAttaques(joueur.nom),
    recupererMeilleuresAttaques(adversaire.nom),
  ]);

  return <SceneAttaques2D joueur={joueur} adversaire={adversaire} attaquesJoueur={attaquesJoueur} attaquesAdversaire={attaquesAdversaire} />;
}

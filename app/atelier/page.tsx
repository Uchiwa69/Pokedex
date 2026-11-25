import { Suspense } from "react";
import type { Metadata } from "next";
import AtelierCarte from "@/components/AtelierCarte";
import ChoixPokemonAtelier from "@/components/ChoixPokemonAtelier";
import EtatVide from "@/components/EtatVide";
import SqueletteFiche from "@/components/SqueletteFiche";
import { recupererAttaquesParNiveau, recupererPokemon, recupererStade } from "@/lib/pokeapi";

// Atelier : on y compose sa propre carte holographique (style, surnom, motif, effet, attaques), enregistrée
// dans le navigateur. Le Pokémon choisi vit dans l'adresse : /atelier?pokemon=pikachu.
// Le lien « Créer sa carte » d'une fiche arrive ici avec son Pokémon déjà choisi.
type Props = PageProps<"/atelier">;

export const metadata: Metadata = {
  title: "Atelier",
  description: "Crée ta carte holographique : choisis un Pokémon, un style, un motif et ses attaques.",
};

export default function PageAtelier({ searchParams }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="etiquette">Cartes holographiques</p>
        <h1 className="font-titre text-3xl font-bold">Atelier</h1>
      </header>
      {/* searchParams est une donnée de la requête : il est lu dans un composant sous <Suspense>. */}
      <Suspense fallback={<SqueletteFiche />}>
        <Contenu searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

// Composant serveur : il lit et VALIDE l'adresse, charge le Pokémon et ses attaques (fonctions en cache),
// puis passe ces données aux composants client.
async function Contenu({ searchParams }: Pick<Props, "searchParams">) {
  const recu = (await searchParams).pokemon;
  // Validation : un seul texte, nettoyé et limité. Tout le reste = aucun Pokémon choisi.
  const nom = typeof recu === "string" ? recu.trim().toLowerCase().slice(0, 40) : "";
  const pokemon = nom ? await recupererPokemon(nom) : null;
  const apprises = pokemon ? await recupererAttaquesParNiveau(pokemon.nom) : [];
  // Stade d'évolution : il donne la rareté de la carte « classique », comme sur la fiche.
  const stade = pokemon ? await recupererStade(pokemon.espece) : null;

  return (
    <>
      <ChoixPokemonAtelier choisi={pokemon ? pokemon.nom : null} />

      {pokemon && stade ? (
        <section aria-labelledby="titre-carte" className="flex flex-col gap-6">
          <h2 id="titre-carte" className="font-titre text-xl font-semibold">
            Carte de {pokemon.nomFr}
          </h2>
          {/* key : changer de Pokémon recrée l'atelier (et sa carte 3D) au lieu de réutiliser l'ancien. */}
          <AtelierCarte key={pokemon.nom} pokemon={pokemon} stade={stade} attaques={apprises.map((apprise) => apprise.attaque)} />
        </section>
      ) : nom ? (
        <EtatVide titre="Pokémon introuvable" message={`Aucun Pokémon ne s'appelle « ${nom} ». Cherche-le par son nom ci-dessus.`} lien={{ href: "/atelier", libelle: "Recommencer" }} />
      ) : (
        <p className="text-sm text-texte-doux">Cherche un Pokémon ci-dessus pour commencer sa carte. Tu peux aussi ouvrir une fiche et utiliser son bouton « Créer sa carte ».</p>
      )}
    </>
  );
}

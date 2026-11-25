import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AtelierCarte from "@/components/AtelierCarte";
import SqueletteFiche from "@/components/SqueletteFiche";
import { recupererAttaquesParNiveau, recupererPokemon } from "@/lib/pokeapi";

// Atelier : /pokemon/pikachu/carte. On y compose sa propre carte holographique (style, surnom, motif,
// effet, attaques), enregistrée dans le navigateur.
type Props = PageProps<"/pokemon/[nom]/carte">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { nom } = await params;
  const pokemon = await recupererPokemon(nom);
  if (!pokemon) return { title: "Pokémon introuvable" };
  return {
    title: `Carte de ${pokemon.nomFr}`,
    description: `Crée ta carte holographique de ${pokemon.nomFr} : style, surnom, motif et attaques.`,
  };
}

// Comme pour la fiche : la page ne lit pas params elle-même, elle le transmet à un composant sous <Suspense>.
export default function PageCarte({ params }: Props) {
  return (
    <Suspense fallback={<SqueletteFiche />}>
      <Atelier params={params} />
    </Suspense>
  );
}

// Composant serveur : il charge le Pokémon et ses attaques (fonctions en cache), puis passe ces DONNÉES
// à l'atelier, qui est un composant client (il a besoin d'état, du glisser-déposer et du store).
async function Atelier({ params }: Pick<Props, "params">) {
  const { nom } = await params;
  const pokemon = await recupererPokemon(nom);
  if (!pokemon) notFound();

  const apprises = await recupererAttaquesParNiveau(nom);

  return (
    <div className="flex flex-col gap-6">
      <Link href={`/pokemon/${pokemon.nom}`} className="etiquette flex min-h-11 items-center self-start hover:text-texte">
        ← Fiche de {pokemon.nomFr}
      </Link>
      <header className="flex flex-col gap-2">
        <p className="etiquette">Atelier</p>
        <h1 className="font-titre text-3xl font-bold">Crée ta carte de {pokemon.nomFr}</h1>
      </header>
      <AtelierCarte pokemon={pokemon} attaques={apprises.map((apprise) => apprise.attaque)} />
    </div>
  );
}

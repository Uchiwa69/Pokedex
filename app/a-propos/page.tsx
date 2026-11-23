import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "À propos",
};

export default function PageAPropos() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="etiquette">Projet</p>
        <h1 className="font-titre text-3xl font-bold">À propos</h1>
      </header>
      <div className="verre flex max-w-2xl flex-col gap-4 p-6 text-sm text-texte-doux">
        <p>
          Ce Pokédex est un projet de fin de cours réalisé avec Next.js, TypeScript et Tailwind CSS. Les données
          viennent de la{" "}
          <a href="https://pokeapi.co" target="_blank" rel="noreferrer" className="font-medium text-accent underline">
            PokéAPI
          </a>
          , une API publique en lecture seule.
        </p>
        <p>
          Pokémon est une marque de Nintendo / Game Freak / The Pokémon Company. Projet étudiant non commercial.
        </p>
      </div>
    </div>
  );
}

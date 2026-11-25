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
        {/* Crédits des animations d'attaques du mode combat (code et images repris d'un autre projet). */}
        <p>
          Les animations d&apos;attaques du mode combat et leurs images viennent de{" "}
          <a
            href="https://github.com/smogon/pokemon-showdown-client"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-accent underline"
          >
            Pokémon Showdown
          </a>{" "}
          (Guangcong Luo et contributeurs), placées dans le domaine public (CC0). Les images de glaçon et d&apos;éclair
          sont de Clint Bellanger (OpenGameArt), sous licence CC-BY-SA 3.0.
        </p>
        {/* Crédits des composants d'interface repris ou adaptés d'autres projets. */}
        <p>
          Le titre en particules de l&apos;accueil, la nuée de points de l&apos;en-tête et du pied de page et la feuille
          holographique des cartes de l&apos;atelier viennent de{" "}
          <a href="https://reactbits.dev" target="_blank" rel="noreferrer" className="font-medium text-accent underline">
            React Bits
          </a>{" "}
          (composants « Particle Text », « Swarm Cursor » et « Holo Card »). Les projecteurs de l&apos;introduction sont adaptés du composant
          « Spotlight New » d&apos;
          <a href="https://ui.aceternity.com" target="_blank" rel="noreferrer" className="font-medium text-accent underline">
            Aceternity UI
          </a>
          .
        </p>
        <p>
          Pokémon est une marque de Nintendo / Game Freak / The Pokémon Company. Projet étudiant non commercial.
        </p>
      </div>
    </div>
  );
}

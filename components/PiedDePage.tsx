import Link from "next/link";

export default function PiedDePage() {
  return (
    <footer className="border-t border-bordure bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-texte-doux">
        <p>
          Données fournies par{" "}
          <a href="https://pokeapi.co" target="_blank" rel="noreferrer" className="font-medium text-accent underline">
            PokéAPI
          </a>
          . Projet étudiant non commercial —{" "}
          <Link href="/a-propos" className="font-medium text-accent underline">
            À propos
          </Link>
          .
        </p>
        <p>Pokémon est une marque de Nintendo / Game Freak / The Pokémon Company.</p>
      </div>
    </footer>
  );
}

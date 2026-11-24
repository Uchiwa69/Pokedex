import Link from "next/link";

export default function PiedDePage() {
  return (
    <footer className="border-t border-bordure-verre">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-texte-doux sm:flex-row sm:items-center sm:justify-between">
        <p>
          Données :{" "}
          <a href="https://pokeapi.co" target="_blank" rel="noreferrer" className="font-medium text-accent underline">
            PokéAPI
          </a>{" "}
          ·{" "}
          <Link href="/a-propos" className="font-medium text-accent underline">
            À propos
          </Link>
        </p>
        <p>Pokémon est une marque de Nintendo / Game Freak / The Pokémon Company. Projet étudiant non commercial.</p>
      </div>
    </footer>
  );
}

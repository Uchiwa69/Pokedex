import Link from "next/link";
import NueeCurseur from "@/components/NueeCurseur";

// Pied de page : composant serveur. Seule la nuée de points (NueeCurseur) est un composant client.
export default function PiedDePage() {
  return (
    // bg-cadre : même fond bleu-noir que l'en-tête, la nuée y ressort mieux.
    <footer className="border-t border-bordure-verre bg-cadre">
      <NueeCurseur>
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
      </NueeCurseur>
    </footer>
  );
}

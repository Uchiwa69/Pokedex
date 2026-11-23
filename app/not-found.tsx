import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page introuvable",
};

// Affiché pour toute adresse inconnue, et plus tard quand une page appelle notFound().
export default function PageIntrouvable() {
  return (
    <div className="verre flex flex-col items-center gap-4 px-6 py-8 text-center">
      <p className="etiquette">Erreur 404</p>
      <h1 className="font-titre text-3xl font-bold">Page introuvable</h1>
      <p className="max-w-md text-sm text-texte-doux">
        Ce Pokémon s&apos;est enfui… ou cette page n&apos;existe pas.
      </p>
      <Link
        href="/"
        className="bouton bouton-principal"
      >
        Retour à la liste
      </Link>
    </div>
  );
}

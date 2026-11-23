"use client"; // Une frontière d'erreur est obligatoirement un composant client.

import { useEffect } from "react";

type Props = {
  error: unknown;
  // Fournie par Next : relance le chargement et le rendu de la page.
  retry: () => void;
};

// error.tsx capte les erreurs levées pendant le rendu de la page (par exemple une panne de la PokéAPI)
// et affiche ce message à la place, sans casser l'en-tête ni le pied de page.
export default function Erreur({ error, retry }: Props) {
  useEffect(() => {
    // On garde une trace de l'erreur dans la console pour pouvoir la comprendre.
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="flex flex-col items-center gap-4 py-8 text-center">
      <h1 className="font-titre text-3xl font-bold">Une erreur est survenue</h1>
      <p className="max-w-md text-sm text-texte-doux">
        Impossible de charger les données pour le moment. La PokéAPI est peut-être indisponible.
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="flex min-h-11 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-sur-accent"
      >
        Réessayer
      </button>
    </div>
  );
}

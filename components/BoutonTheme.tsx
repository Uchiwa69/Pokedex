"use client";

import { useTheme } from "next-themes";

// Bouton de l'en-tête : bascule entre le thème sombre et le thème clair.
// Petite feuille client : useTheme (next-themes) est un hook.
export default function BoutonTheme() {
  // resolvedTheme : le thème réellement affiché ("dark" ou "light"). setTheme le change et le mémorise.
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      // Le libellé ne dépend PAS du thème : côté serveur on ne connaît pas le choix mémorisé dans le
      // navigateur, un libellé « Passer en clair / en sombre » créerait une erreur d'hydratation.
      aria-label="Changer de thème (clair ou sombre)"
      title="Changer de thème"
      className="flex size-11 shrink-0 items-center justify-center rounded-full border border-bordure-verre bg-surface text-texte-doux transition-colors hover:bg-piste hover:text-texte"
    >
      {/* Même raison pour les icônes : les DEUX sont dans la page, et c'est le CSS qui choisit laquelle
          montrer (variante dark: de Tailwind, pilotée par la classe .dark de <html>). Aucun état React. */}
      {/* Soleil : affiché en thème sombre (on peut passer au clair). */}
      <svg viewBox="0 0 24 24" aria-hidden="true" className="hidden size-5 dark:block" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
      {/* Lune : affichée en thème clair (on peut passer au sombre). */}
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 dark:hidden" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
      </svg>
    </button>
  );
}

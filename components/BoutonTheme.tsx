"use client";

import { useTheme } from "next-themes";
import { useEstMonte } from "@/hooks/useEstMonte";

// Bouton soleil/lune. Le serveur ne connaît pas le thème de l'utilisateur (il est dans le
// localStorage ou dans les réglages du système) : on n'affiche donc l'icône qu'après l'hydratation.
export default function BoutonTheme() {
  // resolvedTheme vaut "light" ou "dark", même quand le réglage est "system".
  const { resolvedTheme, setTheme } = useTheme();
  const monte = useEstMonte();

  // Avant l'hydratation : un emplacement vide de la même taille (44 px), pour que rien ne bouge.
  if (!monte) {
    return <span className="block h-11 w-11" aria-hidden="true" />;
  }

  const sombre = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(sombre ? "light" : "dark")}
      aria-label={sombre ? "Passer en thème clair" : "Passer en thème sombre"}
      className="flex h-11 w-11 items-center justify-center rounded-lg border border-bordure bg-surface text-texte hover:bg-piste"
    >
      {sombre ? (
        // Soleil
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        // Lune
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}

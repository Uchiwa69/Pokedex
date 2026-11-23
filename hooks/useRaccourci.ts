import { useEffect, useRef } from "react";

// Exécute `action` quand l'utilisateur appuie sur `touche` (ex. "/"),
// sauf s'il est déjà en train d'écrire dans un champ.
export function useRaccourci(touche: string, action: () => void) {
  const derniereAction = useRef(action);
  useEffect(() => {
    derniereAction.current = action;
  }, [action]);

  useEffect(() => {
    function surTouche(evenement: KeyboardEvent) {
      if (evenement.key !== touche) return;
      if (evenement.ctrlKey || evenement.metaKey || evenement.altKey) return;

      // On ne détourne pas la touche si l'utilisateur écrit quelque part.
      const cible = evenement.target as HTMLElement | null;
      const enSaisie =
        cible !== null &&
        (cible.tagName === "INPUT" || cible.tagName === "TEXTAREA" || cible.tagName === "SELECT" || cible.isContentEditable);
      if (enSaisie) return;

      evenement.preventDefault(); // sinon le "/" serait écrit dans le champ
      derniereAction.current();
    }

    // On s'abonne au montage…
    window.addEventListener("keydown", surTouche);
    // …et on se désabonne au démontage (fonction de nettoyage de useEffect).
    return () => window.removeEventListener("keydown", surTouche);
  }, [touche]);
}

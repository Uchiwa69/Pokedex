import { useCallback, useEffect, useRef } from "react";

// « Debounce » : renvoie une version temporisée de la fonction `rappel`.
// Chaque appel relance le minuteur ; `rappel` n'est exécuté que lorsque `delai` millisecondes
// se sont écoulées SANS nouvel appel. Pour une recherche : on attend que l'utilisateur
// ait fini de taper au lieu de lancer une requête à chaque lettre.
export function useRappelTemporise<Arguments extends unknown[]>(
  rappel: (...args: Arguments) => void,
  delai: number,
) {
  // useRef garde une valeur entre les rendus SANS provoquer de nouveau rendu.
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On mémorise la dernière version de `rappel` (elle change à chaque rendu).
  const dernierRappel = useRef(rappel);
  useEffect(() => {
    dernierRappel.current = rappel;
  }, [rappel]);

  // Nettoyage : si le composant disparaît, on annule le minuteur en cours.
  useEffect(() => {
    return () => {
      if (minuteur.current) clearTimeout(minuteur.current);
    };
  }, []);

  return useCallback(
    (...args: Arguments) => {
      if (minuteur.current) clearTimeout(minuteur.current);
      minuteur.current = setTimeout(() => dernierRappel.current(...args), delai);
    },
    [delai],
  );
}

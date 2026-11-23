import { useCallback, useEffect, useRef } from "react";

// Renvoie une fonction qui joue le cri d'un Pokémon.
// Le son n'est JAMAIS lancé automatiquement : seulement quand on appelle la fonction (au clic).
export function useCri(url: string | null) {
  const audio = useRef<HTMLAudioElement | null>(null);

  // Si on quitte la page, on coupe le son en cours.
  useEffect(() => {
    return () => {
      audio.current?.pause();
    };
  }, []);

  return useCallback(() => {
    if (!url) return;
    audio.current?.pause(); // on arrête le cri précédent s'il joue encore
    const son = new Audio(url);
    son.volume = 0.4;
    audio.current = son;
    // play() renvoie une promesse qui peut échouer (son bloqué par le navigateur) : on l'ignore.
    son.play().catch(() => {});
  }, [url]);
}

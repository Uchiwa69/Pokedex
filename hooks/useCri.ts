import { useCallback, useEffect, useRef } from "react";

// Renvoie une fonction qui joue le cri d'un Pokémon.
// Le son n'est JAMAIS lancé automatiquement : seulement quand on appelle la fonction (au clic).
// surEchec est appelé si le navigateur ne sait pas lire ce son : les cris de la PokéAPI sont des fichiers
// « .ogg », un format que Safari (Mac, iPhone, iPad) ne lisait pas avant 2025.
export function useCri(url: string | null, surEchec?: () => void) {
  const audio = useRef<HTMLAudioElement | null>(null);
  // La fonction du parent est gardée dans un ref : la fonction renvoyée ne change pas à chaque rendu.
  const refEchec = useRef(surEchec);
  useEffect(() => {
    refEchec.current = surEchec;
  }, [surEchec]);

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
    // play() renvoie une promesse qui peut échouer, pour deux raisons très différentes :
    // - « NotSupportedError » : le navigateur ne sait pas lire ce format → on prévient (surEchec) ;
    // - le son est bloqué ou interrompu (autre erreur) → on l'ignore, comme avant.
    son.play().catch((erreur: unknown) => {
      if (erreur instanceof DOMException && erreur.name === "NotSupportedError") refEchec.current?.();
    });
  }, [url]);
}

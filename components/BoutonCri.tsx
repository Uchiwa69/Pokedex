"use client";

import { useCri } from "@/hooks/useCri";

type Props = {
  url: string | null;
  nomFr: string;
};

// Joue le cri du Pokémon AU CLIC uniquement (jamais de son automatique).
export default function BoutonCri({ url, nomFr }: Props) {
  const jouerCri = useCri(url);

  // Certains Pokémon n'ont pas de cri dans l'API : pas de bouton.
  if (!url) return null;

  return (
    <button type="button" onClick={jouerCri} aria-label={`Écouter le cri de ${nomFr}`} className="bouton bouton-secondaire">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 9v6h4l5 4V5L8 9H4z" />
        <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
      </svg>
      Cri
    </button>
  );
}

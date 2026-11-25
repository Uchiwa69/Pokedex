"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Pokemon } from "@/lib/conversion";

// « Pokémon au hasard » : demande un Pokémon tiré au sort à notre route /api/aleatoire, puis ouvre sa fiche.
// C'est une ACTION (le résultat n'est pas connu à l'avance), donc un <button> et non un lien.
export default function BoutonHasard({ className = "bouton bouton-secondaire" }: { className?: string }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);

  async function tirer() {
    setEnCours(true);
    try {
      // attaques=non : on n'a besoin que du Pokémon, la réponse est plus rapide.
      const reponse = await fetch("/api/aleatoire?nombre=1&attaques=non");
      const equipe = reponse.ok ? ((await reponse.json()) as { pokemon: Pokemon }[]) : [];
      if (equipe[0]) router.push(`/pokemon/${equipe[0].pokemon.nom}`);
    } finally {
      setEnCours(false);
    }
  }

  return (
    <button type="button" onClick={tirer} disabled={enCours} className={`${className} disabled:opacity-60`}>
      {/* Icône décorative : un dé */}
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5">
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <path d="M9 9h.01M15 9h.01M12 12h.01M9 15h.01M15 15h.01" />
      </svg>
      {enCours ? "Tirage…" : "Pokémon au hasard"}
    </button>
  );
}

"use client";

import { useEffect, useRef, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRaccourci } from "@/hooks/useRaccourci";
import { useRappelTemporise } from "@/hooks/useRappelTemporise";

// Champ de recherche. Il ne cherche rien lui-même : il met à jour l'adresse (?q=…),
// et c'est le serveur qui refait le rendu de la liste à partir de l'adresse.
export default function BarreRecherche() {
  const router = useRouter();
  const chemin = usePathname();
  const parametres = useSearchParams();
  const qAdresse = parametres.get("q") ?? "";

  const champ = useRef<HTMLInputElement>(null);

  // useTransition : enAttente vaut true tant que le serveur n'a pas renvoyé la nouvelle liste.
  // Pendant ce temps l'ancienne liste reste affichée (pas d'écran vide).
  const [enAttente, demarrerTransition] = useTransition();

  // Touche « / » : place le curseur dans le champ.
  useRaccourci("/", () => champ.current?.focus());

  // Debounce de 300 ms : on attend que l'utilisateur fasse une pause avant de changer l'adresse.
  const chercher = useRappelTemporise((texte: string) => {
    // On repart des paramètres actuels pour GARDER le type choisi.
    const suivants = new URLSearchParams(parametres.toString());
    const propre = texte.trim();
    if (propre) suivants.set("q", propre);
    else suivants.delete("q");
    suivants.delete("page"); // nouvelle recherche → retour à la page 1

    const requete = suivants.toString();
    demarrerTransition(() => {
      // replace (et non push) : chaque lettre tapée ne crée pas une entrée dans l'historique.
      router.replace(requete ? `${chemin}?${requete}` : chemin, { scroll: false });
    });
  }, 300);

  // Si l'adresse change sans que l'utilisateur soit en train de taper (bouton Précédent, lien « Tous »…),
  // on remet le champ d'accord avec l'adresse.
  useEffect(() => {
    const element = champ.current;
    if (element && document.activeElement !== element) {
      element.value = qAdresse;
    }
  }, [qAdresse]);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="recherche" className="etiquette">
        Rechercher un Pokémon
      </label>
      <div className="relative">
        {/* Loupe décorative */}
        <svg
          viewBox="0 0 24 24"
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-texte-doux"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          ref={champ}
          id="recherche"
          type="search"
          name="q"
          defaultValue={qAdresse}
          onChange={(evenement) => chercher(evenement.target.value)}
          placeholder="Nom anglais : pikachu, char…"
          autoComplete="off"
          className="min-h-12 w-full rounded-full border border-bordure bg-surface pl-12 pr-12 text-sm text-texte shadow-carte placeholder:text-texte-doux"
        />
        <kbd
          aria-hidden="true"
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-bordure px-2 text-xs text-texte-doux"
        >
          /
        </kbd>
      </div>
      {/* Zone toujours présente (hauteur fixe) : rien ne bouge quand le message apparaît.
          role="status" : le message est annoncé par les lecteurs d'écran. */}
      <p role="status" className="etiquette h-4 pl-4">
        {enAttente ? "Recherche…" : ""}
      </p>
    </div>
  );
}

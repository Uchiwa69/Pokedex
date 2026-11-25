"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRappelTemporise } from "@/hooks/useRappelTemporise";
import type { Pokemon } from "@/lib/conversion";
import { estUnNumero } from "@/lib/recherche";
import { styleTeinte } from "@/lib/teinte";

// Nombre de Pokémon du Pokédex national (pour tirer un numéro au hasard dans la roulette).
const TOTAL = 1025;
// Petit sprite fixe d'un Pokémon, par son numéro (dépôt d'images de la PokéAPI).
const adresseSprite = (numero: number) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${numero}.png`;

type Props = {
  nombre: number; // taille de l'équipe adverse (= taille de mon équipe)
  mode: "hasard" | "choix";
  surMode: (mode: "hasard" | "choix") => void;
  choisis: Pokemon[]; // adversaires choisis par le joueur (dans l'ordre)
  surChoisis: (choisis: Pokemon[]) => void;
  tirage: boolean; // true pendant la recherche des adversaires : les places au hasard défilent
};

// L'équipe adverse sur l'écran de préparation du combat.
// Deux modes : « Au hasard » (toutes les places sont tirées au sort) ou « Je choisis » (on cherche des
// Pokémon par leur nom ; les places laissées vides sont quand même tirées au hasard).
export default function ChoixAdversaires({ nombre, mode, surMode, choisis, surChoisis, tirage }: Props) {
  const [suggestions, setSuggestions] = useState<Pokemon[]>([]);
  const champ = useRef<HTMLInputElement>(null);
  // Numéro de la dernière recherche envoyée : une réponse plus ancienne qui arrive en retard est ignorée.
  const derniereRecherche = useRef(0);

  // En mode « hasard », aucune place n'est choisie.
  const retenus = mode === "choix" ? choisis.slice(0, nombre) : [];
  const complet = retenus.length >= nombre;

  // Debounce de 250 ms : on attend une pause dans la frappe avant d'interroger le serveur.
  const chercher = useRappelTemporise(async (texte: string) => {
    const numero = ++derniereRecherche.current;
    // Moins de 2 lettres : rien à chercher, sauf si c'est un numéro (« 6 »).
    if (texte.trim().length < 2 && !estUnNumero(texte)) {
      setSuggestions([]);
      return;
    }
    try {
      const reponse = await fetch(`/api/recherche?q=${encodeURIComponent(texte.trim())}`);
      const trouves = reponse.ok ? ((await reponse.json()) as Pokemon[]) : [];
      if (numero === derniereRecherche.current) setSuggestions(trouves);
    } catch {
      if (numero === derniereRecherche.current) setSuggestions([]);
    }
  }, 250);

  function ajouter(pokemon: Pokemon) {
    surChoisis([...retenus, pokemon]);
    setSuggestions([]);
    if (champ.current) {
      champ.current.value = "";
      champ.current.focus(); // prêt pour chercher le suivant
    }
  }

  return (
    <section aria-labelledby="titre-adversaires" className="flex flex-col items-center gap-2">
      <h3 id="titre-adversaires" className="etiquette">
        Adversaires
      </h3>

      {/* Les places de l'équipe adverse */}
      <ul className="flex flex-wrap justify-center gap-2">
        {Array.from({ length: nombre }, (_, i) => {
          const pokemon = retenus[i];
          if (pokemon) {
            return (
              <li key={pokemon.nom} style={styleTeinte(pokemon.types[0])} className="relative flex w-20 flex-col items-center gap-1">
                <span className="flex size-16 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--teinte)_60%,transparent)] bg-[color-mix(in_srgb,var(--teinte)_18%,transparent)]">
                  <Image src={adresseSprite(pokemon.id)} alt="" width={56} height={56} unoptimized className="size-14 object-contain [image-rendering:pixelated]" />
                </span>
                <span className="w-full truncate text-xs font-semibold text-texte">{pokemon.nomFr}</span>
                {/* Petit bouton rond pour retirer cet adversaire (zone de clic élargie par le padding). */}
                <button
                  type="button"
                  onClick={() => surChoisis(retenus.filter((p) => p.nom !== pokemon.nom))}
                  disabled={tirage}
                  aria-label={`Retirer ${pokemon.nomFr} des adversaires`}
                  className="absolute -right-2 -top-2 flex size-8 items-center justify-center rounded-full border border-bordure bg-surface-pleine text-sm font-bold text-texte hover:bg-piste"
                >
                  <span aria-hidden="true">×</span>
                </button>
              </li>
            );
          }
          return (
            <li key={`libre-${i}`} aria-hidden="true" className="flex w-20 flex-col items-center gap-1">
              <span className="flex size-16 items-center justify-center overflow-hidden rounded-full border border-dashed border-bordure bg-surface font-titre text-2xl font-bold text-texte-doux">
                {/* Pendant le tirage : des Pokémon défilent dans la place. Sinon : un point d'interrogation. */}
                {tirage ? <Roulette depart={i} /> : "?"}
              </span>
              <span className="text-xs font-semibold text-texte-doux">???</span>
            </li>
          );
        })}
      </ul>

      {/* Choix du mode : deux boutons à bascule (aria-pressed annonce lequel est actif). */}
      <div className="flex gap-1 rounded-full border border-bordure-verre bg-surface p-1">
        {(["hasard", "choix"] as const).map((valeur) => (
          <button
            key={valeur}
            type="button"
            onClick={() => surMode(valeur)}
            disabled={tirage}
            aria-pressed={mode === valeur}
            className={
              mode === valeur
                ? "flex min-h-9 items-center rounded-full bg-accent px-4 text-sm font-semibold text-sur-accent shadow-lueur"
                : "flex min-h-9 items-center rounded-full px-4 text-sm font-medium text-texte-doux hover:bg-piste hover:text-texte"
            }
          >
            {valeur === "hasard" ? "Au hasard" : "Je choisis"}
          </button>
        ))}
      </div>

      {mode === "choix" && (
        <div className="flex w-full max-w-xs flex-col gap-2">
          <label htmlFor="recherche-adversaire" className="sr-only">
            Chercher un adversaire par son nom
          </label>
          <input
            ref={champ}
            id="recherche-adversaire"
            type="search"
            autoComplete="off"
            disabled={complet || tirage}
            onChange={(evenement) => chercher(evenement.target.value)}
            placeholder={complet ? "Équipe adverse complète" : "Nom d'un Pokémon…"}
            className="min-h-11 w-full rounded-full border border-bordure bg-surface px-4 text-sm text-texte placeholder:text-texte-doux disabled:opacity-60"
          />
          {/* Suggestions : une liste de boutons. Un Pokémon déjà choisi n'est pas proposé une 2e fois. */}
          {suggestions.length > 0 && !complet && (
            <ul className="flex flex-col gap-1 rounded-3xl border border-bordure bg-surface-pleine p-1 text-left">
              {suggestions
                .filter((pokemon) => !retenus.some((p) => p.nom === pokemon.nom))
                .map((pokemon) => (
                  <li key={pokemon.nom}>
                    <button type="button" onClick={() => ajouter(pokemon)} className="flex min-h-11 w-full items-center gap-2 rounded-full px-2 text-sm font-medium text-texte hover:bg-piste">
                      <Image src={adresseSprite(pokemon.id)} alt="" width={36} height={36} unoptimized className="size-9 object-contain [image-rendering:pixelated]" />
                      <span className="truncate">{pokemon.nomFr}</span>
                      <span className="etiquette ml-auto pr-2">N° {String(pokemon.id).padStart(4, "0")}</span>
                    </button>
                  </li>
                ))}
            </ul>
          )}
          <p className="text-xs text-texte-doux">Les places laissées vides seront tirées au hasard.</p>
        </div>
      )}
    </section>
  );
}

// Un Pokémon différent toutes les 90 ms : l'effet « roulette » pendant le tirage au sort.
// En animations réduites, rien ne défile : on garde le point d'interrogation.
function Roulette({ depart }: { depart: number }) {
  // Premier numéro calculé à partir de la position (pas de hasard pendant le rendu) ; le hasard vient ensuite, dans l'intervalle.
  const [numero, setNumero] = useState(1 + ((depart * 151 + 24) % TOTAL));

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const intervalle = setInterval(() => setNumero(1 + Math.floor(Math.random() * TOTAL)), 90);
    // Nettoyage : l'intervalle est arrêté quand la roulette disparaît.
    return () => clearInterval(intervalle);
  }, []);

  return (
    <>
      <Image src={adresseSprite(numero)} alt="" width={56} height={56} unoptimized className="size-14 object-contain [image-rendering:pixelated] motion-reduce:hidden" />
      <span className="hidden motion-reduce:inline">?</span>
    </>
  );
}

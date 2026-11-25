// PROTOTYPE (labo) — quatre propositions pour le haut de la page d'accueil : titre, recherche, filtres de type.
// Elles réutilisent les VRAIS composants (BarreRecherche, FiltreTypes) : seule la mise en page autour change.
// Les cartes de la grille ne sont pas concernées. Ce sont des composants serveur, sans état.

import { Suspense, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import BadgeType from "@/components/BadgeType";
import BarreRecherche from "@/components/BarreRecherche";
import FiltreTypes from "@/components/FiltreTypes";
import type { Pokemon } from "@/lib/conversion";
import { TOTAL_POKEMONS } from "@/lib/pokeapi";
import { styleTeinte } from "@/lib/teinte";
import { NOMS_TYPES } from "@/lib/types";

export type VarianteHero = "colonnes" | "centre" | "console" | "affiche";

type Props = { vedette: Pokemon };

// « 1 025 ». toLocaleString sépare les milliers par une espace FINE, presque invisible dans un texte courant :
// on la remplace par une espace insécable ordinaire.
const TOTAL = TOTAL_POKEMONS.toLocaleString("fr-FR").replace(/ /g, " ");
const ACCROCHE = `${TOTAL} Pokémon, ${NOMS_TYPES.length} types. Cherche par nom ou par numéro.`;

// La recherche : BarreRecherche lit l'adresse (useSearchParams), elle a donc besoin d'un Suspense.
function Recherche() {
  return (
    <Suspense fallback={<div className="h-28" />}>
      <BarreRecherche />
    </Suspense>
  );
}

// L'action rapide : le lien vers l'atelier.
function Actions({ centre = false }: { centre?: boolean }) {
  return (
    <div className={`flex flex-wrap gap-2 ${centre ? "justify-center" : ""}`}>
      <Link href="/atelier" className="bouton bouton-principal px-5">
        Créer une carte
      </Link>
    </div>
  );
}

// Le Pokémon mis en avant : grande illustration sur un halo de la couleur de son type, lien vers sa fiche.
function Vedette({ pokemon, taille = "h-64" }: { pokemon: Pokemon; taille?: string }) {
  return (
    <Link href={`/pokemon/${pokemon.nom}`} style={styleTeinte(pokemon.types[0])} className="group relative flex flex-col items-center gap-2 rounded-3xl p-4 text-center">
      <span className={`relative block aspect-square ${taille}`}>
        <span aria-hidden="true" className="absolute inset-4 rounded-full bg-[var(--teinte)] opacity-35 blur-3xl" />
        <span aria-hidden="true" className="absolute bottom-2 left-1/2 h-4 w-3/5 -translate-x-1/2 rounded-[100%] bg-[var(--teinte)] opacity-60 blur-xs" />
        {pokemon.artwork && (
          <Image
            src={pokemon.artwork}
            alt={`Illustration de ${pokemon.nomFr}`}
            fill
            sizes="320px"
            className="object-contain drop-shadow-[0_18px_24px_rgb(0_0_0/0.45)] transition-transform duration-300 group-hover:-translate-y-2 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0 motion-reduce:group-hover:scale-100"
          />
        )}
      </span>
      <span className="etiquette">Pokémon du jour · N° {String(pokemon.id).padStart(4, "0")}</span>
      <span className="font-titre text-2xl font-bold">{pokemon.nomFr}</span>
      <span className="flex gap-2">
        {pokemon.types.map((type) => (
          <BadgeType key={type} type={type} />
        ))}
      </span>
    </Link>
  );
}

/* ---------- A · Deux colonnes : texte et recherche à gauche, Pokémon du jour à droite ---------- */
function HeroColonnes({ vedette }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-3">
            <p className="etiquette">Pokédex national</p>
            <h1 className="font-titre text-4xl font-bold sm:text-5xl">Tous les Pokémon</h1>
            <p className="max-w-xl text-sm text-texte-doux sm:text-base">{ACCROCHE}</p>
          </header>
          <Recherche />
          <Actions />
        </div>
        <Vedette pokemon={vedette} />
      </div>
      <FiltreTypes q="" typeActif={null} disposition="etale" />
    </div>
  );
}

/* ---------- B · Centré : tout au milieu, sans Pokémon vedette ---------- */
function HeroCentre() {
  return (
    <div className="flex flex-col items-center gap-6 py-4 text-center sm:py-10">
      <header className="flex flex-col items-center gap-3">
        <p className="etiquette">Pokédex national</p>
        {/* Titre en dégradé : du texte vers l'accent (bg-clip-text découpe le dégradé à la forme des lettres). */}
        <h1 className="bg-linear-to-r from-texte to-accent bg-clip-text font-titre text-4xl font-bold text-transparent sm:text-6xl">Tous les Pokémon</h1>
        <p className="max-w-xl text-sm text-texte-doux sm:text-base">{ACCROCHE}</p>
      </header>
      <div className="w-full max-w-2xl text-left">
        <Recherche />
      </div>
      <Actions centre />
      <div className="w-full">
        <FiltreTypes q="" typeActif={null} disposition="centre" />
      </div>
    </div>
  );
}

/* ---------- C · Console : un grand panneau de verre, comme l'écran d'un Pokédex, avec des chiffres clés ---------- */
function Chiffre({ valeur, libelle }: { valeur: ReactNode; libelle: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-bordure bg-surface px-4 py-3">
      <span className="font-titre text-2xl font-bold tabular-nums sm:text-3xl">{valeur}</span>
      <span className="etiquette">{libelle}</span>
    </div>
  );
}

function HeroConsole({ vedette }: Props) {
  return (
    <section aria-labelledby="titre-hero" className="verre relative flex flex-col gap-6 overflow-hidden p-4 sm:p-8">
      {/* Décor d'écran : fines lignes horizontales et lueur de l'accent dans un coin (purement décoratif). */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0_3px,color-mix(in_srgb,var(--color-texte)_4%,transparent)_3px_4px)]" />
      <span aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-accent opacity-15 blur-3xl" />

      <div className="relative grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-3">
            <p className="etiquette flex items-center gap-2">
              <span aria-hidden="true" className="size-2 rounded-full bg-accent-bis motion-safe:animate-pulse" />
              Pokédex national · en ligne
            </p>
            <h1 id="titre-hero" className="font-titre text-4xl font-bold sm:text-5xl">
              Tous les Pokémon
            </h1>
          </header>
          <div className="grid max-w-xl grid-cols-3 gap-2">
            <Chiffre valeur={TOTAL} libelle="Pokémon" />
            <Chiffre valeur={NOMS_TYPES.length} libelle="Types" />
            <Chiffre valeur="9" libelle="Générations" />
          </div>
          <Recherche />
          <Actions />
        </div>
        <div className="hidden lg:block">
          <Vedette pokemon={vedette} taille="h-56" />
        </div>
      </div>
      <div className="relative">
        <FiltreTypes q="" typeActif={null} disposition="etale" />
      </div>
    </section>
  );
}

/* ---------- D · Affiche : le Pokémon du jour en très grand, à moitié hors cadre, numéro en filigrane ---------- */
function HeroAffiche({ vedette }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="titre-hero" style={styleTeinte(vedette.types[0])} className="verre relative overflow-hidden p-4 sm:p-8">
        {/* Dégradé de la couleur du type, numéro géant en filigrane : les mêmes codes que les cartes. */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_35%,var(--teinte))] opacity-25" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-10 right-4 font-titre text-[11rem] font-bold leading-none text-texte opacity-5 sm:text-[16rem]">
          {String(vedette.id).padStart(4, "0")}
        </span>

        <div className="relative grid items-center gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <header className="flex flex-col gap-3">
              <p className="etiquette">Pokédex national</p>
              <h1 id="titre-hero" className="font-titre text-4xl font-bold sm:text-6xl">
                Tous les Pokémon
              </h1>
              <p className="max-w-md text-sm text-texte-doux sm:text-base">{ACCROCHE}</p>
            </header>
            <Recherche />
            <Actions />
          </div>
          <div className="flex justify-center">
            <Vedette pokemon={vedette} taille="h-64 lg:h-80" />
          </div>
        </div>
      </section>
      <FiltreTypes q="" typeActif={null} disposition="etale" />
    </div>
  );
}

// Table de correspondance : variante → composant.
export default function HeroAccueil({ variante, vedette }: Props & { variante: VarianteHero }) {
  if (variante === "centre") return <HeroCentre />;
  if (variante === "console") return <HeroConsole vedette={vedette} />;
  if (variante === "affiche") return <HeroAffiche vedette={vedette} />;
  return <HeroColonnes vedette={vedette} />;
}

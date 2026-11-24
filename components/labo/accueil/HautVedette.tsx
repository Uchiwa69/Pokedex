// PROTOTYPE A — « Vedette » : un grand bandeau avec un Pokémon mis en avant.
// Tout le bandeau prend la couleur du type de la vedette (variable --teinte).

import Image from "next/image";
import Link from "next/link";
import BadgeType from "@/components/BadgeType";
import { Loupe, SymboleType, formaterNombre } from "@/components/labo/accueil/Communs";
import type { Pokemon } from "@/lib/conversion";
import { styleTeinte } from "@/lib/teinte";
import { NOMS_TYPES, TYPES } from "@/lib/types";

export default function HautVedette({ vedette, total }: { vedette: Pokemon; total: number }) {
  const numero = String(vedette.id).padStart(4, "0");

  return (
    <div className="flex flex-col gap-6">
      <section style={styleTeinte(vedette.types[0])} className="verre relative overflow-hidden p-6 sm:p-10">
        {/* Décor : lueur de la teinte côté illustration + numéro géant en filigrane */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_85%_45%,var(--teinte),transparent_60%)] opacity-30" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-10 right-2 font-titre text-[9rem] font-bold leading-none text-texte opacity-[0.05] sm:text-[14rem]">
          {numero}
        </span>

        <div className="relative grid items-center gap-8 lg:grid-cols-[1.25fr_1fr]">
          <div className="flex flex-col gap-6">
            <header className="flex flex-col gap-2">
              <p className="etiquette">Pokédex national · {formaterNombre(total)} Pokémon</p>
              <h1 className="font-titre text-4xl font-bold leading-tight sm:text-5xl">
                Trouve ton prochain{" "}
                <span className="bg-linear-to-r from-accent to-accent-bis bg-clip-text text-transparent">partenaire</span>
              </h1>
              <p className="max-w-md text-sm text-texte-doux">
                Cherche par nom, filtre par type, compose une équipe de six et lance un combat.
              </p>
            </header>

            {/* Recherche intégrée au bandeau */}
            <div className="relative max-w-lg">
              <Loupe className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-texte-doux" />
              <label htmlFor="recherche-labo" className="sr-only">
                Rechercher un Pokémon
              </label>
              <input
                id="recherche-labo"
                type="search"
                placeholder="Dracaufeu, pikachu…"
                autoComplete="off"
                className="min-h-14 w-full rounded-full border border-bordure bg-fond/60 pl-14 pr-14 text-sm text-texte shadow-carte placeholder:text-texte-doux"
              />
              <kbd aria-hidden="true" className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 rounded-full border border-bordure px-2 text-xs text-texte-doux">
                /
              </kbd>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" className="bouton bouton-principal">
                Pokémon au hasard
              </button>
              <Link href="/sacoche" className="bouton bouton-secondaire">
                Composer mon équipe
              </Link>
            </div>
          </div>

          {/* La vedette : illustration qui lévite, halo de sa teinte, petite légende cliquable */}
          <Link href={`/pokemon/${vedette.nom}`} className="group relative mx-auto flex w-full max-w-xs flex-col items-center gap-4">
            <div className="relative aspect-square w-full">
              <span aria-hidden="true" className="absolute inset-6 rounded-full bg-[var(--teinte)] opacity-40 blur-3xl" />
              <span aria-hidden="true" className="absolute bottom-2 left-1/2 h-4 w-3/5 -translate-x-1/2 rounded-[100%] bg-[var(--teinte)] opacity-60 blur-sm motion-safe:animate-ombre-sol" />
              {vedette.artwork && (
                <Image
                  src={vedette.artwork}
                  alt={`Illustration de ${vedette.nomFr}`}
                  fill
                  sizes="320px"
                  loading="eager"
                  className="object-contain drop-shadow-[0_18px_22px_rgb(0_0_0/0.45)] motion-safe:animate-levitation"
                />
              )}
            </div>
            <span className="flex items-center gap-2 rounded-full border border-bordure-verre bg-fond/70 px-4 py-2 text-sm font-semibold group-hover:border-[var(--teinte)]">
              <span className="etiquette">N° {numero}</span>
              {vedette.nomFr}
              {vedette.types.map((type) => (
                <BadgeType key={type} type={type} petit />
              ))}
            </span>
          </Link>
        </div>
      </section>

      {/* Types : une seule ligne de gélules (symbole + libellé) qui défile si la place manque */}
      <nav aria-label="Filtrer par type (factice)">
        <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
          <li className="shrink-0">
            <button type="button" className="flex min-h-11 items-center rounded-full bg-accent px-5 text-sm font-semibold text-sur-accent shadow-lueur">
              Tous
            </button>
          </li>
          {NOMS_TYPES.map((type) => (
            <li key={type} className="shrink-0" style={styleTeinte(type)}>
              <button
                type="button"
                className="flex min-h-11 items-center gap-2 rounded-full border border-bordure bg-surface pl-2 pr-4 text-sm font-medium text-texte transition-colors duration-200 hover:border-[var(--teinte)]"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--teinte)_22%,transparent)]">
                  <SymboleType type={type} className="size-4 fill-[var(--teinte)]" />
                </span>
                {TYPES[type].libelle}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

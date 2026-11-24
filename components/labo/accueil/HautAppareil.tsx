// PROTOTYPE B — « Écran de Pokédex » : le haut de page ressemble à l'écran d'un appareil
// (voyants, quadrillage, ligne de balayage, relevé de statistiques, touches de type).

import Image from "next/image";
import Link from "next/link";
import { SymboleType, formaterNombre } from "@/components/labo/accueil/Communs";
import type { Pokemon } from "@/lib/conversion";
import { styleTeinte } from "@/lib/teinte";
import { NOMS_TYPES, TYPES } from "@/lib/types";

// Les statistiques vont jusqu'à 255 dans les jeux : sert à calculer la longueur des barres.
const STAT_MAX = 255;

export default function HautAppareil({ vedette, total }: { vedette: Pokemon; total: number }) {
  const numero = String(vedette.id).padStart(4, "0");
  const releve = [
    { libelle: "PV", valeur: vedette.stats.pv },
    { libelle: "ATT", valeur: vedette.stats.attaque },
    { libelle: "DEF", valeur: vedette.stats.defense },
    { libelle: "VIT", valeur: vedette.stats.vitesse },
  ];

  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-bordure bg-surface p-4 shadow-carte sm:p-6">
      {/* Bandeau de l'appareil : trois voyants et l'état */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="size-3 rounded-full bg-pv-bas shadow-[0_0_10px_var(--color-pv-bas)]" />
          <span aria-hidden="true" className="size-2 rounded-full bg-pv-moyen" />
          <span aria-hidden="true" className="size-2 rounded-full bg-pv-haut" />
          <p className="etiquette pl-2">PKDX-OS · en ligne</p>
        </div>
        <p className="etiquette">{formaterNombre(total)} entrées</p>
      </div>

      {/* L'écran : quadrillage fin + ligne de balayage qui descend */}
      <div className="relative overflow-hidden rounded-2xl border border-bordure-verre bg-fond p-6 sm:p-8">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(var(--color-bordure)_1px,transparent_1px),linear-gradient(90deg,var(--color-bordure)_1px,transparent_1px)] bg-[size:32px_32px] opacity-30"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-1/5 bg-linear-to-b from-transparent via-accent/10 to-transparent motion-safe:animate-balayage motion-reduce:hidden"
        />

        <div className="relative grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col gap-6">
            <header className="flex flex-col gap-2">
              <p className="etiquette text-accent-bis">Base de données · région : toutes</p>
              <h1 className="font-titre text-4xl font-bold uppercase tracking-wider sm:text-5xl">Pokédex national</h1>
              <p className="font-titre text-sm text-texte-doux">
                &gt; {formaterNombre(total)} Pokémon enregistrés
                <span aria-hidden="true" className="ml-1 inline-block h-4 w-2 translate-y-0.5 bg-accent-bis motion-safe:animate-pulse" />
              </p>
            </header>

            {/* Recherche façon ligne de commande */}
            <div className="relative max-w-lg">
              <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-titre text-lg font-bold text-accent-bis">
                &gt;
              </span>
              <label htmlFor="recherche-labo" className="sr-only">
                Rechercher un Pokémon
              </label>
              <input
                id="recherche-labo"
                type="search"
                placeholder="NOM DU POKÉMON…"
                autoComplete="off"
                className="min-h-12 w-full rounded-xl border border-bordure bg-surface pl-10 pr-4 font-titre text-sm tracking-wider text-texte placeholder:text-texte-doux"
              />
            </div>
          </div>

          {/* « Entrée du jour » : illustration + relevé de statistiques */}
          <Link
            href={`/pokemon/${vedette.nom}`}
            style={styleTeinte(vedette.types[0])}
            className="flex items-center gap-4 rounded-2xl border border-bordure-verre bg-surface p-4 hover:border-[var(--teinte)]"
          >
            <div className="relative size-28 shrink-0">
              <span aria-hidden="true" className="absolute inset-2 rounded-full bg-[var(--teinte)] opacity-40 blur-2xl" />
              {vedette.artwork && (
                <Image src={vedette.artwork} alt={`Illustration de ${vedette.nomFr}`} fill sizes="112px" loading="eager" className="object-contain" />
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className="etiquette">Entrée du jour · N° {numero}</p>
              <p className="truncate font-titre text-xl font-semibold">{vedette.nomFr}</p>
              <dl className="flex flex-col gap-1">
                {releve.map((ligne) => (
                  <div key={ligne.libelle} className="flex items-center gap-2">
                    <dt className="etiquette w-8">{ligne.libelle}</dt>
                    <dd className="h-1.5 flex-1 overflow-hidden rounded-full bg-piste">
                      {/* Barre : toujours dessinée à 100 %, puis réduite avec scaleX (on n'anime/modifie que transform). */}
                      <span
                        className="block h-full origin-left rounded-full bg-[var(--teinte)]"
                        style={{ transform: `scaleX(${Math.min(ligne.valeur / STAT_MAX, 1)})` }}
                      />
                      <span className="sr-only">{ligne.valeur}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </Link>
        </div>
      </div>

      {/* Les « touches » de l'appareil : une par type */}
      <nav aria-label="Filtrer par type (factice)">
        <ul className="grid grid-cols-5 gap-2 sm:grid-cols-10 lg:grid-cols-[repeat(19,minmax(0,1fr))]">
          <li>
            <button type="button" className="flex h-14 w-full items-center justify-center rounded-xl bg-accent text-[11px] font-semibold text-sur-accent shadow-lueur">
              Tous
            </button>
          </li>
          {NOMS_TYPES.map((type) => (
            <li key={type} style={styleTeinte(type)}>
              <button
                type="button"
                title={TYPES[type].libelle}
                className="flex h-14 w-full flex-col items-center justify-center gap-1 rounded-xl border border-bordure bg-fond text-[10px] font-semibold text-texte-doux transition-colors duration-200 hover:border-[var(--teinte)] hover:text-texte"
              >
                <SymboleType type={type} className="size-5 fill-[var(--teinte)]" />
                <span className="w-full truncate px-1 text-center">{TYPES[type].libelle}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}

"use client";

// Atelier de création de carte holographique : à gauche la carte 3D, mise à jour en direct ; à droite les
// réglages (style, surnom, motif, effet, attaques). Chaque changement est enregistré tout de suite dans le
// store useCartes (donc dans le navigateur) : il n'y a pas de bouton « Enregistrer ».
// Les attaques se posent sur la carte par GLISSER-DÉPOSER (API native du navigateur : draggable, onDragStart,
// onDragOver, onDrop), et aussi avec un bouton « Ajouter », pour le clavier et les écrans tactiles.

import { useMemo, useState, type DragEvent } from "react";
import Carte3D, { type PersoCarte } from "@/components/Carte3D";
import {
  adresseChromatique,
  ATTAQUES_MAX,
  CARTE_DE_BASE,
  LIBELLES_MOTIFS,
  LONGUEUR_MAX_SURNOM,
  MOTIFS_PROPOSES,
  NOMS_STYLES,
  STYLES,
  type AttaqueCarte,
  type CartePerso,
} from "@/lib/carte-perso";
import { formaterMesure, type Attaque, type Pokemon } from "@/lib/conversion";
import { LIBELLES_STATS } from "@/lib/stats";
import { styleTeinte } from "@/lib/teinte";
import { TYPES } from "@/lib/types";
import { useCartes } from "@/stores/cartes";

type Props = {
  pokemon: Pokemon;
  attaques: Attaque[]; // toutes les attaques que ce Pokémon apprend, chargées par le serveur
};

// Classes d'un bouton de choix (style, motif, effet) : actif ou non. Écrites en entier pour Tailwind.
const CHOIX = "min-h-11 rounded-2xl border px-4 py-2 text-left text-sm transition-colors duration-200";
const CHOIX_ACTIF = "border-transparent bg-accent text-sur-accent shadow-lueur";
const CHOIX_INACTIF = "border-bordure bg-surface text-texte hover:bg-piste";

export default function AtelierCarte({ pokemon, attaques }: Props) {
  // La carte enregistrée pour ce Pokémon, ou la carte de base. Le sélecteur renvoie UNE valeur du store.
  const enregistree = useCartes((etat) => etat.cartes[pokemon.nom]);
  const enregistrer = useCartes((etat) => etat.enregistrer);
  const supprimer = useCartes((etat) => etat.supprimer);
  const carte = enregistree ?? CARTE_DE_BASE;

  // Modifie une partie de la carte et l'enregistre (le store applique les règles : 2 attaques au plus…).
  const modifier = (changement: Partial<CartePerso>) => enregistrer(pokemon.nom, { ...carte, ...changement, nomPokemon: pokemon.nomFr });

  // Où une attaque glissée est en train de passer : "carte", un numéro d'emplacement, ou null.
  const [survol, setSurvol] = useState<"carte" | number | null>(null);

  // Ce que la carte 3D doit afficher. useMemo : l'objet ne change que si la carte change, et Carte3D
  // ne se met à jour que dans ce cas.
  const perso: PersoCarte = useMemo(
    () => ({
      nom: carte.surnom.trim() || pokemon.nomFr,
      illustration: carte.style === "chromatique" ? adresseChromatique(pokemon.artwork) : pokemon.artwork,
      style: carte.style,
      motif: carte.motif ?? STYLES[carte.style].motif,
      typeEffet: carte.typeEffet ?? pokemon.types[0] ?? "normal",
      attaques: carte.attaques,
    }),
    [carte, pokemon],
  );

  /* ---------- Attaques ---------- */
  const pleine = carte.attaques.length >= ATTAQUES_MAX;
  const estPosee = (nom: string) => carte.attaques.some((a) => a.nom === nom);

  // Pose une attaque sur la carte : à l'emplacement visé (elle remplace celle qui s'y trouve), ou à la suite.
  function poser(nom: string, emplacement?: number) {
    const attaque = attaques.find((a) => a.nom === nom);
    if (!attaque) return;
    const posee: AttaqueCarte = { nom: attaque.nom, nomFr: attaque.nomFr, type: attaque.type, puissance: attaque.puissance };
    const autres = carte.attaques.filter((a) => a.nom !== nom); // jamais deux fois la même
    if (emplacement !== undefined && emplacement < autres.length) {
      modifier({ attaques: autres.map((a, index) => (index === emplacement ? posee : a)) });
    } else if (autres.length < ATTAQUES_MAX) {
      modifier({ attaques: [...autres, posee] });
    }
  }
  const retirer = (nom: string) => modifier({ attaques: carte.attaques.filter((a) => a.nom !== nom) });
  const echanger = () => modifier({ attaques: [...carte.attaques].reverse() });

  // Glisser-déposer. Au départ, on range le nom de l'attaque dans l'événement (dataTransfer) ;
  // à l'arrivée, on le relit. preventDefault dans onDragOver : c'est ce qui AUTORISE le dépôt à cet endroit.
  const debuterGlisser = (evenement: DragEvent, nom: string) => {
    evenement.dataTransfer.setData("text/plain", nom);
    evenement.dataTransfer.effectAllowed = "copy";
  };
  const zoneDeDepot = (cible: "carte" | number) => ({
    onDragOver: (evenement: DragEvent) => {
      evenement.preventDefault();
      evenement.dataTransfer.dropEffect = "copy";
      setSurvol(cible);
    },
    onDragLeave: () => setSurvol(null),
    onDrop: (evenement: DragEvent) => {
      evenement.preventDefault();
      setSurvol(null);
      poser(evenement.dataTransfer.getData("text/plain"), cible === "carte" ? undefined : cible);
    },
  });

  const personnalisee = enregistree !== undefined;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
      {/* ---------- La carte, qui est aussi une zone de dépôt ---------- */}
      <div className="mx-auto flex w-full max-w-sm flex-col gap-4 lg:sticky lg:top-24">
        <div
          {...zoneDeDepot("carte")}
          className={`rounded-3xl transition-shadow duration-200 ${survol === "carte" ? "shadow-lueur outline-2 outline-accent" : ""}`}
        >
          <Carte3D
            illustration={pokemon.artwork}
            numero={String(pokemon.id).padStart(4, "0")}
            nom={pokemon.nomFr}
            types={pokemon.types.map((type) => TYPES[type].libelle)}
            typePrincipal={pokemon.types[0] ?? "normal"}
            mesures={`${formaterMesure(pokemon.taille, "m")} · ${formaterMesure(pokemon.poids, "kg")}`}
            puissance={LIBELLES_STATS.reduce((somme, stat) => somme + pokemon.stats[stat.cle], 0)}
            perso={perso}
          />
        </div>
        {/* role="status" : annoncé aux lecteurs d'écran quand le texte change. */}
        <p role="status" className="text-center text-sm text-texte-doux">
          {personnalisee ? "Carte enregistrée sur cet appareil." : "Modifie un réglage : ta carte sera enregistrée sur cet appareil."}
        </p>
        <button type="button" onClick={() => supprimer(pokemon.nom)} disabled={!personnalisee} className="bouton bouton-secondaire mx-auto px-5 text-sm disabled:opacity-50">
          Revenir à la carte d&apos;origine
        </button>
      </div>

      {/* ---------- Les réglages ---------- */}
      <div className="flex min-w-0 flex-col gap-6">
        <section aria-labelledby="titre-style" className="verre flex flex-col gap-4 p-4 sm:p-6">
          <h2 id="titre-style" className="font-titre text-xl font-semibold">
            Style de carte
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {NOMS_STYLES.map((style) => (
              <button
                key={style}
                type="button"
                // aria-pressed : indique aux lecteurs d'écran lequel est choisi.
                aria-pressed={carte.style === style}
                // Changer de style remet le motif de ce style (motif: null), pour rester cohérent.
                onClick={() => modifier({ style, motif: null })}
                className={`${CHOIX} flex flex-col gap-1 ${carte.style === style ? CHOIX_ACTIF : CHOIX_INACTIF}`}
              >
                <span className="font-titre font-semibold">{STYLES[style].libelle}</span>
                <span className={carte.style === style ? "" : "text-texte-doux"}>{STYLES[style].description}</span>
              </button>
            ))}
          </div>
        </section>

        <section aria-labelledby="titre-surnom" className="verre flex flex-col gap-4 p-4 sm:p-6">
          <h2 id="titre-surnom" className="font-titre text-xl font-semibold">
            Surnom
          </h2>
          <label className="flex flex-col gap-2">
            <span className="etiquette">Nom écrit sur la carte ({LONGUEUR_MAX_SURNOM} caractères au plus)</span>
            <input
              type="text"
              value={carte.surnom}
              maxLength={LONGUEUR_MAX_SURNOM}
              placeholder={pokemon.nomFr}
              onChange={(evenement) => modifier({ surnom: evenement.target.value })}
              className="min-h-11 rounded-full border border-bordure bg-surface px-4 text-sm text-texte placeholder:text-texte-doux"
            />
          </label>
        </section>

        <section aria-labelledby="titre-holo" className="verre flex flex-col gap-4 p-4 sm:p-6">
          <h2 id="titre-holo" className="font-titre text-xl font-semibold">
            Holographie
          </h2>
          <div className="flex flex-col gap-2">
            <p className="etiquette">Motif de la feuille</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" aria-pressed={carte.motif === null} onClick={() => modifier({ motif: null })} className={`${CHOIX} ${carte.motif === null ? CHOIX_ACTIF : CHOIX_INACTIF}`}>
                Celui du style
              </button>
              {MOTIFS_PROPOSES.map((motif) => (
                <button key={motif} type="button" aria-pressed={carte.motif === motif} onClick={() => modifier({ motif })} className={`${CHOIX} ${carte.motif === motif ? CHOIX_ACTIF : CHOIX_INACTIF}`}>
                  {LIBELLES_MOTIFS[motif]}
                </button>
              ))}
            </div>
          </div>
          {/* L'effet animé (et la couleur de la carte) : un des types du Pokémon. Inutile s'il n'en a qu'un. */}
          {pokemon.types.length > 1 && (
            <div className="flex flex-col gap-2">
              <p className="etiquette">Effet et couleur</p>
              <div className="flex flex-wrap gap-2">
                {pokemon.types.map((type) => {
                  const actif = perso.typeEffet === type;
                  return (
                    <button key={type} type="button" aria-pressed={actif} onClick={() => modifier({ typeEffet: type })} className={`${CHOIX} ${actif ? CHOIX_ACTIF : CHOIX_INACTIF}`}>
                      {TYPES[type].libelle}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <section aria-labelledby="titre-attaques" className="verre flex flex-col gap-4 p-4 sm:p-6">
          <div className="flex flex-col gap-1">
            <h2 id="titre-attaques" className="font-titre text-xl font-semibold">
              Attaques
            </h2>
            <p className="text-sm text-texte-doux">
              Fais glisser une attaque sur la carte ou sur un emplacement, ou utilise son bouton « Ajouter ». {ATTAQUES_MAX} attaques au plus.
            </p>
          </div>

          {/* Les emplacements de la carte : chacun est une zone de dépôt. */}
          <ol className="grid gap-2 sm:grid-cols-2" aria-label="Attaques posées sur la carte">
            {Array.from({ length: ATTAQUES_MAX }, (_, index) => {
              const posee = carte.attaques[index];
              return (
                <li
                  key={index}
                  {...zoneDeDepot(index)}
                  style={posee ? styleTeinte(posee.type) : undefined}
                  className={`flex min-h-16 items-center gap-2 rounded-2xl border px-3 py-2 transition-colors duration-200 ${
                    survol === index ? "border-accent bg-piste" : posee ? "border-bordure bg-surface" : "border-dashed border-bordure"
                  }`}
                >
                  {posee ? (
                    <>
                      <span aria-hidden="true" className="size-3 shrink-0 rounded-full bg-[var(--teinte)]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-titre text-sm font-semibold">{posee.nomFr}</span>
                        <span className="etiquette">
                          {TYPES[posee.type].libelle} · Puis. {posee.puissance ?? "—"}
                        </span>
                      </span>
                      <button type="button" onClick={() => retirer(posee.nom)} aria-label={`Retirer ${posee.nomFr} de la carte`} className="flex size-11 shrink-0 items-center justify-center rounded-full text-texte-doux hover:bg-piste hover:text-texte">
                        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-5">
                          <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                      </button>
                    </>
                  ) : (
                    <span className="etiquette">Emplacement {index + 1} : dépose une attaque ici</span>
                  )}
                </li>
              );
            })}
          </ol>
          {carte.attaques.length === 2 && (
            <button type="button" onClick={echanger} className="bouton bouton-secondaire self-start px-5 text-sm">
              Échanger les deux attaques
            </button>
          )}

          {/* Les attaques disponibles. Chaque ligne se glisse (draggable) ; le bouton fait la même chose au clic. */}
          {attaques.length === 0 ? (
            <p className="text-sm text-texte-doux">Ce Pokémon n&apos;apprend aucune attaque par montée de niveau.</p>
          ) : (
            <ul className="grid max-h-96 gap-2 overflow-y-auto pr-1 sm:grid-cols-2" aria-label="Attaques disponibles">
              {attaques.map((attaque) => {
                const posee = estPosee(attaque.nom);
                return (
                  <li
                    key={attaque.nom}
                    draggable={!posee}
                    onDragStart={(evenement) => debuterGlisser(evenement, attaque.nom)}
                    style={styleTeinte(attaque.type)}
                    className={`flex items-center gap-2 rounded-2xl border border-bordure bg-surface py-1 pl-3 pr-1 ${posee ? "opacity-50" : "cursor-grab active:cursor-grabbing"}`}
                  >
                    <span aria-hidden="true" className="size-3 shrink-0 rounded-full bg-[var(--teinte)]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-titre text-sm font-semibold">{attaque.nomFr}</span>
                      <span className="etiquette">
                        {TYPES[attaque.type].libelle} · Puis. {attaque.puissance ?? "—"}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => poser(attaque.nom)}
                      disabled={posee || pleine}
                      aria-label={posee ? `${attaque.nomFr} est déjà sur la carte` : `Ajouter ${attaque.nomFr} à la carte`}
                      className="flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm font-semibold text-accent hover:bg-piste disabled:text-texte-doux disabled:hover:bg-transparent"
                    >
                      {posee ? "Posée" : "Ajouter"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

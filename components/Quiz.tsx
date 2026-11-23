"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import BoutonCri from "@/components/BoutonCri";
import type { Pokemon } from "@/lib/conversion";
import { styleTeinte } from "@/lib/teinte";

const NOMBRE_DE_CHOIX = 4;

// Une manche : le Pokémon à deviner et les propositions (dont la bonne), déjà mélangées.
type Manche = {
  reponse: Pokemon;
  choix: Pokemon[];
};

// Mélange une copie du tableau (algorithme de Fisher-Yates) : on parcourt le tableau depuis la fin
// et on échange chaque case avec une case tirée au hasard parmi celles qui la précèdent.
function melanger<T>(elements: T[]): T[] {
  const copie = [...elements];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

// Demande 4 Pokémon au hasard au serveur : le premier est la réponse, les 3 autres sont les leurres.
async function tirerManche(): Promise<Manche> {
  const reponse = await fetch(`/api/aleatoire?nombre=${NOMBRE_DE_CHOIX}&attaques=non`);
  if (!reponse.ok) throw new Error(`Réponse ${reponse.status}`);
  const tirage = (await reponse.json()) as { pokemon: Pokemon }[];
  // On écarte les rares Pokémon sans illustration : impossible d'en faire une silhouette.
  const pokemons = tirage.map((t) => t.pokemon).filter((p) => p.artwork !== null);
  if (pokemons.length < 2) throw new Error("Tirage insuffisant");
  return { reponse: pokemons[0], choix: melanger(pokemons) };
}

// Quiz « Qui est ce Pokémon ? » : une silhouette, quatre propositions.
export default function Quiz() {
  const [manche, setManche] = useState<Manche | null>(null);
  const [choisi, setChoisi] = useState<string | null>(null); // nom du Pokémon choisi, null = pas encore répondu
  const [bonnes, setBonnes] = useState(0);
  const [jouees, setJouees] = useState(0);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);
  const animationsReduites = useReducedMotion();

  // Charge une manche et met l'état à jour quand la réponse arrive.
  function charger() {
    tirerManche()
      .then((nouvelle) => {
        setManche(nouvelle);
        setChoisi(null);
        setErreur(false);
      })
      .catch(() => setErreur(true))
      .finally(() => setChargement(false));
  }

  // Première manche, au montage du composant.
  useEffect(() => {
    charger();
  }, []);

  function mancheSuivante() {
    setChargement(true);
    charger();
  }

  function repondre(nom: string) {
    if (!manche || choisi !== null) return; // une seule réponse par manche
    setChoisi(nom);
    setJouees((n) => n + 1);
    if (nom === manche.reponse.nom) setBonnes((n) => n + 1);
  }

  if (erreur && !manche) {
    return (
      <div role="alert" className="verre flex flex-col items-center gap-4 px-6 py-8 text-center">
        <p className="text-sm text-texte-doux">Impossible de préparer le quiz. Vérifie ta connexion.</p>
        <button type="button" onClick={mancheSuivante} className="bouton bouton-principal">
          Réessayer
        </button>
      </div>
    );
  }

  if (!manche) {
    return <div role="status" aria-label="Préparation du quiz" className="h-96 animate-pulse rounded-3xl bg-piste motion-reduce:animate-none" />;
  }

  const { reponse, choix } = manche;
  const revele = choisi !== null;
  const gagne = choisi === reponse.nom;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <p className="etiquette text-center">
        Score : {bonnes} sur {jouees}
      </p>

      {/* La teinte du type n'apparaît qu'à la révélation (sinon elle donnerait un indice). */}
      <div className="verre relative mx-auto aspect-square w-full max-w-xs overflow-hidden" style={styleTeinte(revele ? reponse.types[0] : undefined)}>
        <motion.span
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(145deg,var(--teinte),transparent_65%)]"
          initial={false}
          animate={{ opacity: revele ? 0.35 : 0 }}
          transition={{ duration: 0.35 }}
        />

        {/* key : une nouvelle manche recrée le bloc, donc l'animation repart de zéro. */}
        <motion.div
          key={reponse.nom}
          className="absolute inset-8"
          initial={false}
          // Révélation : petit rebond de l'image (transform), sauf en animations réduites.
          animate={revele && !animationsReduites ? { scale: [1, 1.12, 1] } : { scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          {/* Deux images superposées : celle en couleurs dessous, la silhouette dessus.
              On révèle en faisant disparaître la silhouette en fondu (on n'anime que opacity).
              brightness-0 rend l'image entièrement noire ; en thème sombre, invert la rend blanche. */}
          <Image
            src={reponse.artwork ?? ""}
            alt={revele ? `Illustration de ${reponse.nomFr}` : ""}
            fill
            sizes="256px"
            loading="eager"
            className={revele ? "object-contain" : "object-contain opacity-0"}
          />
          <motion.div className="absolute inset-0" initial={false} animate={{ opacity: revele ? 0 : 1 }} transition={{ duration: 0.35 }}>
            <Image
              src={reponse.artwork ?? ""}
              // L'alt ne doit pas donner la réponse.
              alt={revele ? "" : "Silhouette du Pokémon mystère"}
              fill
              sizes="256px"
              loading="eager"
              // draggable={false} : on ne peut pas « tricher » en faisant glisser l'image.
              draggable={false}
              className="object-contain brightness-0 dark:invert"
            />
          </motion.div>
        </motion.div>
      </div>

      {/* Résultat annoncé aux lecteurs d'écran (aria-live), hauteur réservée pour ne rien décaler. */}
      <p aria-live="polite" className="min-h-7 text-center font-titre text-xl font-semibold">
        {revele ? (gagne ? `Bravo, c'est ${reponse.nomFr} !` : `Raté… c'était ${reponse.nomFr}.`) : ""}
      </p>

      <ul className="grid grid-cols-2 gap-2">
        {choix.map((pokemon) => {
          const estLaReponse = pokemon.nom === reponse.nom;
          const estChoisi = pokemon.nom === choisi;
          return (
            <li key={pokemon.nom} className="min-w-0">
              <button
                type="button"
                onClick={() => repondre(pokemon.nom)}
                disabled={revele}
                // Après la réponse : la bonne proposition est entourée de vert, le mauvais choix de rouge,
                // avec un symbole ✓ / ✗ pour ne pas reposer uniquement sur la couleur.
                className={`bouton w-full border-2 bg-surface text-texte ${
                  !revele
                    ? "border-bordure hover:bg-piste"
                    : estLaReponse
                      ? "border-pv-haut"
                      : estChoisi
                        ? "border-pv-bas"
                        : "border-bordure opacity-60"
                }`}
              >
                <span className="truncate">{pokemon.nomFr}</span>
                {revele && estLaReponse && <span aria-label="bonne réponse">✓</span>}
                {revele && estChoisi && !estLaReponse && <span aria-label="mauvaise réponse">✗</span>}
              </button>
            </li>
          );
        })}
      </ul>

      {revele && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button type="button" onClick={mancheSuivante} disabled={chargement} className="bouton bouton-principal disabled:opacity-60">
            {chargement ? "Chargement…" : "Pokémon suivant"}
          </button>
          {/* Le cri n'est joué que si l'on clique sur ce bouton (aucun son automatique). */}
          <BoutonCri url={reponse.cri} nomFr={reponse.nomFr} />
          <Link href={`/pokemon/${reponse.nom}`} className="bouton bouton-secondaire">
            Voir la fiche
          </Link>
        </div>
      )}
      {erreur && (
        <p role="alert" className="text-center text-sm text-danger">
          Le tirage a échoué. Réessaie.
        </p>
      )}
    </div>
  );
}

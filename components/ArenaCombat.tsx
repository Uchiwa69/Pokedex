"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import BadgeType from "@/components/BadgeType";
import ChoixAdversaires from "@/components/ChoixAdversaires";
import DecorArene from "@/components/DecorArene";
import { DUREE_EFFET } from "@/components/EffetAttaque";
import EtatVide from "@/components/EtatVide";
import { LIBELLES_CATEGORIES } from "@/components/IconeCategorie";
import Pokeball from "@/components/Pokeball";
import SocleEquipe from "@/components/SocleEquipe";
import { useChargementAttaques } from "@/hooks/useChargementAttaques";
import {
  ATTAQUE_SECOURS,
  calculerPvMax,
  choisirAttaqueIA,
  messageEfficacite,
  NIVEAU,
  ordreDesTours,
  resoudreAttaque,
  type TableEfficacite,
} from "@/lib/combat";
import type { Attaque, Pokemon } from "@/lib/conversion";
import { GLYPHES } from "@/lib/glyphes";
import { choisirRecette } from "@/lib/labo/effets2d";
import { jouerAttaque, Moteur2D, type Point } from "@/lib/labo/moteur2d";
import { styleTeinte } from "@/lib/teinte";
import { TYPES, type NomType } from "@/lib/types";
import { useSacoche, useSacochePrete } from "@/stores/sacoche";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type Cote = "joueur" | "adversaire";

// Un Pokémon engagé dans le combat : ses données + ses points de vie du moment.
type Lutteur = {
  pokemon: Pokemon;
  surnom: string;
  attaques: Attaque[];
  pv: number;
  pvMax: number;
};

// Ce qui est en train d'être animé : qui attaque, et à quelle étape on en est.
type Scene = {
  attaquant: Cote;
  etape: "elan" | "effet" | "impact";
  type: NomType; // type de l'attaque, pour choisir l'effet visuel
};

type Ligne = { id: number; texte: string };

// Tout l'état d'une partie, dans un seul objet : une seule mise à jour à chaque étape.
type Partie = {
  joueurs: Lutteur[];
  adversaires: Lutteur[];
  iJoueur: number; // indice du Pokémon actif dans chaque équipe
  iAdversaire: number;
  scene: Scene | null;
  ko: Cote | null; // côté dont le Pokémon est en train de tomber K.O.
  journal: Ligne[];
  occupe: boolean; // true pendant qu'un tour se déroule : le menu est bloqué
  resultat: "victoire" | "defaite" | null;
};

type MembreAdverse = { pokemon: Pokemon; attaques: Attaque[] };

function creerLutteur(pokemon: Pokemon, surnom: string, attaques: Attaque[]): Lutteur {
  const pvMax = calculerPvMax(pokemon.stats.pv);
  return { pokemon, surnom, attaques, pv: pvMax, pvMax };
}

// Promesse qui se résout après `ms` millisecondes : permet d'écrire « await attendre(300) »
// entre deux étapes de l'animation.
function attendre(ms: number): Promise<void> {
  return new Promise((resoudre) => setTimeout(resoudre, ms));
}

// Tire un nombre au hasard entre 0 (inclus) et 1 (exclu).
// Le hasard est tiré ICI, dans le composant, au moment du clic ; les fonctions de lib/combat.ts
// le reçoivent en argument et restent pures (donc testables).
function tirerHasard(): number {
  return Math.random();
}

// Bandeau de fin de combat : classes complètes pour chaque résultat (jamais de classe fabriquée à la volée).
const STYLES_RESULTAT = {
  victoire: {
    bordure: "border-pv-haut",
    titre: "text-pv-haut",
    lueur: "bg-[radial-gradient(circle_at_50%_0%,var(--color-pv-haut),transparent_70%)]",
  },
  defaite: {
    bordure: "border-danger",
    titre: "text-danger",
    lueur: "bg-[radial-gradient(circle_at_50%_0%,var(--color-danger),transparent_70%)]",
  },
};

/* ------------------------------------------------------------------ */
/* Composant principal                                                 */
/* ------------------------------------------------------------------ */

// Mode combat : ma sacoche contre une équipe tirée au hasard.
// La table d'efficacité des types est chargée par le serveur (page) et reçue en prop.
export default function ArenaCombat({ table }: { table: TableEfficacite }) {
  const prete = useSacochePrete();
  const membres = useSacoche((etat) => etat.membres);
  useChargementAttaques(); // s'assure que chaque membre a ses 4 attaques

  const [partie, setPartie] = useState<Partie | null>(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(false);
  // Équipe adverse : tirée au hasard, ou choisie par le joueur (les places laissées vides restent au hasard).
  const [modeAdversaires, setModeAdversaires] = useState<"hasard" | "choix">("hasard");
  const [adversairesChoisis, setAdversairesChoisis] = useState<Pokemon[]>([]);
  const animationsReduites = useReducedMotion();

  // Numéro de la prochaine ligne du journal (sert de `key`). Un ref : le changer ne refait pas de rendu.
  const prochainId = useRef(0);
  // Passe à false quand on quitte la page : le tour en cours arrête alors de mettre à jour l'état.
  // Effets d'attaque : un <canvas> posé sur l'arène, dessiné par le moteur 2D (lib/labo/moteur2d.ts).
  const refArene = useRef<HTMLDivElement>(null);
  const refToile = useRef<HTMLCanvasElement>(null);
  const refMoteur = useRef<Moteur2D | null>(null);
  // Animations d'attaques de Pokémon Showdown (lib/showdown) : environ 600 attaques ont leur propre mise en scène.
  // Le module est lourd, il n'est donc téléchargé qu'au démarrage d'un combat (voir demarrer).
  // typeof import(…) : le type de ce que renvoie l'import dynamique.
  const refShowdown = useRef<typeof import("@/lib/showdown") | null>(null);
  // Deux calques pour ces animations : un derrière les Pokémon (voiles de couleur), un devant (images d'effets).
  const refCalqueFond = useRef<HTMLDivElement>(null);
  const refCalqueEffets = useRef<HTMLDivElement>(null);
  const enCombat = partie !== null;
  useEffect(() => {
    // Le canvas n'existe que pendant un combat : le moteur est créé à ce moment-là, et arrêté à la fin.
    const toile = refToile.current;
    if (!enCombat || !toile) return;
    const moteur = new Moteur2D(toile);
    refMoteur.current = moteur;
    moteur.demarrer();
    const observateur = new ResizeObserver(() => moteur.redimensionner());
    observateur.observe(toile);
    return () => {
      observateur.disconnect();
      moteur.arreter();
      refMoteur.current = null;
    };
  }, [enCombat]);

  // Joue l'effet visuel d'une attaque, de l'attaquant vers la cible. L'effet est choisi automatiquement
  // à partir du type, de la catégorie et de la puissance de l'attaque (lib/labo/effets2d.ts).
  async function jouerEffet(cote: Cote, attaque: Attaque) {
    const moteur = refMoteur.current;
    const arene = refArene.current;

    // 1er choix : la mise en scène de Showdown pour CETTE attaque, si elle existe.
    const showdown = refShowdown.current;
    if (showdown && arene && refCalqueFond.current && refCalqueEffets.current && !animationsReduites) {
      const jouee = await showdown.jouerAnimation({
        nom: attaque.nom,
        arene,
        calqueFond: refCalqueFond.current,
        calqueEffets: refCalqueEffets.current,
        attaquant: cote,
      });
      if (jouee) return;
    }

    // 2e choix (attaque inconnue de Showdown, module pas encore chargé…) : l'effet par type du site.
    const depart = arene?.querySelector<HTMLElement>(`[data-cote="${cote}"]`);
    const arrivee = arene?.querySelector<HTMLElement>(`[data-cote="${cote === "joueur" ? "adversaire" : "joueur"}"]`);
    // Animations réduites (ou canvas indisponible) : pas de particules, on attend simplement.
    if (animationsReduites || !moteur || !arene || !depart || !arrivee) {
      await attendre(durees.effet);
      return;
    }
    const cadre = arene.getBoundingClientRect();
    const centre = (element: HTMLElement): Point => {
      const zone = element.getBoundingClientRect();
      return { x: zone.left - cadre.left + zone.width / 2, y: zone.top - cadre.top + zone.height * 0.45 };
    };
    const recette = choisirRecette(attaque.type, attaque.categorie, attaque.puissance);
    // L'élan, le clignotement et le tremblement sont déjà gérés par ce composant (étapes « elan » et
    // « impact ») : le moteur ne s'occupe donc que des particules.
    await jouerAttaque(moteur, recette, centre(depart), centre(arrivee), {
      elan: () => {},
      charger: () => attendre(450),
      encaisser: () => Promise.resolve(),
    });
  }

  const monte = useRef(true);
  // Numéro du combat en cours. Il change quand on quitte : un tour encore en train de se dérouler (il attend
  // entre ses étapes) compare son numéro à celui-ci et arrête de mettre à jour l'état d'un combat abandonné.
  const numeroCombat = useRef(0);
  // Confirmation en deux clics pour « Quitter le combat » (comme « Vider la sacoche »).
  const [confirmationQuitter, setConfirmationQuitter] = useState(false);

  // Abandonne le combat et revient à l'écran de préparation.
  function quitter() {
    numeroCombat.current++;
    setConfirmationQuitter(false);
    setPartie(null);
  }
  useEffect(() => {
    monte.current = true;
    return () => {
      monte.current = false;
    };
  }, []);

  // Durées des étapes d'un tour, en millisecondes. Animations réduites : tout est plus court et sans mouvement.
  const durees = animationsReduites
    ? { elan: 0, effet: 400, impact: 300, ko: 300, entree: 300, pause: 400 }
    : { elan: 260, effet: DUREE_EFFET * 1000, impact: 480, ko: 600, entree: 450, pause: 500 };

  const attaquesPretes = membres.every((m) => m.attaques !== undefined);

  /* ---------- Démarrage : tirage de l'équipe adverse ---------- */

  async function demarrer() {
    setChargement(true);
    setErreur(false);
    // Import dynamique : le fichier n'est téléchargé que maintenant, en parallèle du tirage de l'adversaire.
    // S'il échoue (hors connexion…), le combat se joue avec les effets par type : on ignore donc l'erreur.
    if (!refShowdown.current) {
      import("@/lib/showdown")
        .then((module) => {
          refShowdown.current = module;
        })
        .catch(() => {});
    }
    try {
      // Les adversaires choisis sont envoyés au serveur, qui complète au hasard (voir app/api/aleatoire/route.ts).
      const choisis = modeAdversaires === "choix" ? adversairesChoisis.slice(0, membres.length).map((p) => p.nom) : [];
      const adresse = `/api/aleatoire?nombre=${membres.length}${choisis.length > 0 ? `&choisis=${choisis.join(",")}` : ""}`;
      // Promise.all : la requête et une attente minimale avancent en même temps. Le tirage dure ainsi au moins
      // 1,4 s, le temps de voir défiler les Pokémon (pas d'attente en animations réduites).
      const [reponse] = await Promise.all([fetch(adresse), attendre(animationsReduites ? 0 : 1400)]);
      if (!reponse.ok) throw new Error(`Réponse ${reponse.status}`);
      const equipeAdverse = (await reponse.json()) as MembreAdverse[];
      if (equipeAdverse.length === 0) throw new Error("Équipe adverse vide");

      const joueurs = membres.map((m) => creerLutteur(m.pokemon, m.surnom, m.attaques ?? []));
      const adversaires = equipeAdverse.map((m) => creerLutteur(m.pokemon, m.pokemon.nomFr, m.attaques));
      const lignes = [
        "Le combat commence !",
        `L'adversaire envoie ${adversaires[0].surnom} !`,
        `${joueurs[0].surnom}, à toi !`,
      ];
      setPartie({
        joueurs,
        adversaires,
        iJoueur: 0,
        iAdversaire: 0,
        scene: null,
        ko: null,
        journal: lignes.map((texte) => ({ id: prochainId.current++, texte })),
        occupe: false,
        resultat: null,
      });
    } catch {
      setErreur(true);
    } finally {
      setChargement(false);
    }
  }

  /* ---------- Un tour complet ---------- */

  async function jouerTour(attaqueJoueur: Attaque) {
    if (!partie || partie.occupe || partie.resultat) return;
    const combat = numeroCombat.current; // le combat auquel ce tour appartient

    // Copies locales : on les fait évoluer au fil du tour, et on « publie » l'état à chaque étape.
    let joueurs = partie.joueurs;
    let adversaires = partie.adversaires;
    let iJoueur = partie.iJoueur;
    let iAdversaire = partie.iAdversaire;
    const journal = [...partie.journal];

    function dire(texte: string) {
      journal.push({ id: prochainId.current++, texte });
    }
    function publier(extra: Partial<Partie> = {}) {
      if (!monte.current || combat !== numeroCombat.current) return; // page quittée ou combat abandonné
      setPartie({
        joueurs,
        adversaires,
        iJoueur,
        iAdversaire,
        scene: null,
        ko: null,
        journal: [...journal],
        occupe: true,
        resultat: null,
        ...extra,
      });
    }

    // L'IA choisit son attaque, puis la vitesse décide de l'ordre.
    const attaqueAdverse = choisirAttaqueIA(
      adversaires[iAdversaire].attaques,
      adversaires[iAdversaire].pokemon,
      joueurs[iJoueur].pokemon,
      table,
      tirerHasard(),
    );
    const premier = ordreDesTours(
      joueurs[iJoueur].pokemon.stats.vitesse,
      adversaires[iAdversaire].pokemon.stats.vitesse,
      tirerHasard(),
    );
    const ordre: Cote[] = premier === "joueur" ? ["joueur", "adversaire"] : ["adversaire", "joueur"];

    for (const cote of ordre) {
      const attaquant = cote === "joueur" ? joueurs[iJoueur] : adversaires[iAdversaire];
      const defenseur = cote === "joueur" ? adversaires[iAdversaire] : joueurs[iJoueur];
      const attaque = cote === "joueur" ? attaqueJoueur : attaqueAdverse;

      // 1. Annonce + élan de l'attaquant. Si Showdown a une mise en scène pour cette attaque, c'est elle qui
      //    déplace l'attaquant : on saute notre élan pour qu'il ne s'élance pas deux fois.
      const miseEnScene = !animationsReduites && (refShowdown.current?.aUneAnimation(attaque.nom) ?? false);
      dire(`${attaquant.surnom} utilise ${attaque.nomFr} !`);
      publier({ scene: { attaquant: cote, etape: miseEnScene ? "effet" : "elan", type: attaque.type } });
      await attendre(miseEnScene ? 150 : durees.elan);

      // 2. Calcul (fonction pure) : l'attaque touche-t-elle, et pour combien ?
      const resultat = resoudreAttaque(attaquant.pokemon, defenseur.pokemon, attaque, table, tirerHasard(), tirerHasard());
      if (resultat.rate) {
        dire(`${attaquant.surnom} rate son attaque !`);
        publier();
        await attendre(durees.pause);
        continue; // on passe à l'autre combattant
      }

      // 3. Effet visuel du type de l'attaque
      publier({ scene: { attaquant: cote, etape: "effet", type: attaque.type } });
      await jouerEffet(cote, attaque);

      // 4. Impact : tremblement, flash du défenseur, baisse des PV, message d'efficacité
      const pvRestants = Math.max(0, defenseur.pv - resultat.degats);
      if (cote === "joueur") {
        adversaires = adversaires.map((l, i) => (i === iAdversaire ? { ...l, pv: pvRestants } : l));
      } else {
        joueurs = joueurs.map((l, i) => (i === iJoueur ? { ...l, pv: pvRestants } : l));
      }
      const message = messageEfficacite(resultat.efficacite);
      if (message) dire(message);
      publier({ scene: { attaquant: cote, etape: "impact", type: attaque.type } });
      await attendre(durees.impact);

      // 5. K.O. : chute et fondu, puis le Pokémon suivant entre (ou le combat se termine)
      if (pvRestants === 0) {
        dire(`${defenseur.surnom} est K.O. !`);
        publier({ ko: cote === "joueur" ? "adversaire" : "joueur" });
        await attendre(durees.ko);

        if (cote === "joueur") {
          const suivant = adversaires.findIndex((l) => l.pv > 0);
          if (suivant === -1) {
            dire("Tu as gagné le combat !");
            // ko conservé : le dernier Pokémon battu reste à terre sur l'écran de fin (sinon il réapparaissait debout).
            publier({ resultat: "victoire", occupe: false, ko: "adversaire" });
            return;
          }
          iAdversaire = suivant;
          dire(`L'adversaire envoie ${adversaires[suivant].surnom} !`);
        } else {
          const suivant = joueurs.findIndex((l) => l.pv > 0);
          if (suivant === -1) {
            dire("Tous tes Pokémon sont K.O. Tu as perdu le combat…");
            publier({ resultat: "defaite", occupe: false, ko: "joueur" });
            return;
          }
          iJoueur = suivant;
          dire(`${joueurs[suivant].surnom}, à toi !`);
        }
        publier();
        await attendre(durees.entree);
        break; // le Pokémon qui vient d'entrer n'attaque pas pendant ce tour
      }
    }

    publier({ occupe: false }); // fin du tour : le menu est de nouveau utilisable
  }

  /* ---------- Affichage ---------- */

  if (!prete) {
    return (
      <div role="status" aria-label="Chargement du combat" className="h-96 animate-pulse rounded-3xl bg-piste motion-reduce:animate-none" />
    );
  }

  if (membres.length === 0) {
    return (
      <EtatVide
        titre="Ta sacoche est vide"
        message="Il faut au moins un Pokémon dans la sacoche pour lancer un combat."
        lien={{ href: "/", libelle: "Choisir des Pokémon" }}
      />
    );
  }

  // Avant le combat : écran de préparation. Mon équipe à gauche, des silhouettes « ? » à droite
  // (l'adversaire n'est tiré au sort qu'au démarrage), et un grand « VS » entre les deux.
  if (!partie) {
    return (
      // Le stade en décor (DecorArene) : pas de cadre ici, il déborde et se fond dans le fond de la page.
      // « isolate » : le décor (-z-10) reste derrière le contenu de CETTE zone, pas derrière toute la page.
      // Le contenu est posé sur le terrain, sur un panneau semi-opaque et flouté, pour garder un bon contraste.
      <div className="relative isolate flex min-h-[40rem] flex-col items-center justify-end p-4 pt-48 sm:min-h-[46rem] sm:p-6">
        <DecorArene />
        <div className="relative flex w-full max-w-4xl flex-col items-center gap-6 rounded-3xl border border-bordure-verre bg-fond/70 px-4 py-6 text-center backdrop-blur-md sm:px-6">
        <div className="relative flex flex-col gap-2">
          <h2 className="font-titre text-xl font-semibold">Prêt pour le combat ?</h2>
          <p className="max-w-md text-sm text-texte-doux">
            Ton équipe de {membres.length} Pokémon affronte {membres.length} adversaires, au niveau {NIVEAU}. Laisse faire le hasard ou choisis-les.
          </p>
        </div>

        {/* Trois colonnes : mon équipe, « VS », l'équipe adverse. Sur mobile, elles s'empilent. */}
        <div className="relative grid w-full max-w-3xl items-start gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <section aria-labelledby="titre-mon-equipe" className="flex flex-col items-center gap-2">
            <h3 id="titre-mon-equipe" className="etiquette">
              Ton équipe
            </h3>
            <ul className="flex flex-wrap justify-center gap-2">
              {membres.map((m) => (
                <li key={m.pokemon.nom} style={styleTeinte(m.pokemon.types[0])} className="flex w-20 flex-col items-center gap-1">
                  <span className="relative flex size-16 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--teinte)_60%,transparent)] bg-[color-mix(in_srgb,var(--teinte)_18%,transparent)]">
                    {/* Sprite animé ; à défaut, l'illustration. alt vide : le surnom est écrit juste dessous. */}
                    {(m.pokemon.spriteFace ?? m.pokemon.artwork) && (
                      <Image
                        src={(m.pokemon.spriteFace ?? m.pokemon.artwork) as string}
                        alt=""
                        width={48}
                        height={48}
                        unoptimized // un GIF optimisé par Next deviendrait une image fixe
                        className="size-12 object-contain [image-rendering:pixelated]"
                      />
                    )}
                  </span>
                  <span className="w-full truncate text-xs font-semibold text-texte">{m.surnom}</span>
                </li>
              ))}
            </ul>
          </section>

          <p aria-hidden="true" className="bg-linear-to-r from-accent to-accent-bis bg-clip-text font-titre text-4xl font-bold text-transparent sm:mt-8 sm:text-5xl">
            VS
          </p>

          {/* Équipe adverse : au hasard ou choisie. Pendant le tirage, des Pokémon défilent dans les places libres. */}
          <ChoixAdversaires
            nombre={membres.length}
            mode={modeAdversaires}
            surMode={setModeAdversaires}
            choisis={adversairesChoisis}
            surChoisis={setAdversairesChoisis}
            tirage={chargement}
          />
        </div>

        {erreur && (
          <p role="alert" className="relative text-sm text-danger">
            Impossible de trouver un adversaire. Vérifie ta connexion et réessaie.
          </p>
        )}
        <button type="button" onClick={demarrer} disabled={!attaquesPretes || chargement} className="bouton bouton-principal relative disabled:opacity-60">
          {!attaquesPretes ? "Préparation des attaques…" : chargement ? "Recherche d'un adversaire…" : "Commencer le combat"}
        </button>
        </div>
      </div>
    );
  }

  const joueur = partie.joueurs[partie.iJoueur];
  const adversaire = partie.adversaires[partie.iAdversaire];
  // Un Pokémon sans attaque offensive utilise « Lutte ».
  const attaquesDuJoueur = joueur.attaques.length > 0 ? joueur.attaques : [ATTAQUE_SECOURS];
  const tremble = partie.scene?.etape === "impact" && !animationsReduites;

  return (
    <div className="flex flex-col gap-6">
      {/* Quitter le combat : retour à l'écran de préparation. Pendant le combat, il faut confirmer (le combat
          est perdu) ; une fois le combat terminé, un seul clic suffit. */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {partie.resultat ? (
          <button type="button" onClick={quitter} className="bouton bouton-secondaire">
            Retour à la préparation
          </button>
        ) : confirmationQuitter ? (
          <>
            <button type="button" onClick={quitter} className="bouton bouton-secondaire text-danger">
              Confirmer : abandonner
            </button>
            <button type="button" onClick={() => setConfirmationQuitter(false)} className="bouton bouton-secondaire">
              Continuer le combat
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirmationQuitter(true)} className="bouton bouton-secondaire">
            Quitter le combat
          </button>
        )}
      </div>

      {/* L'arène. Elle tremble à l'impact (transform uniquement). */}
      <motion.div
        ref={refArene}
        // Pas de cadre : le stade déborde de cette zone et se fond dans la page (voir DecorArene).
        className="relative isolate p-4 sm:p-6"
        animate={{ x: tremble ? [0, -8, 8, -6, 6, 0] : 0 }}
        transition={{ duration: 0.35 }}
      >
        {/* Le même décor que sur l'écran de préparation, mais avec zoom : il « avance » quand le combat commence. */}
        <DecorArene zoom />
        {/* Entrée en combat, jouée une seule fois (ces éléments sont créés avec l'arène) : un anneau de lumière
            part du centre, et le mot « COMBAT ! » surgit puis s'efface. Rien en animations réduites. */}
        {/* overflow-hidden sur ce calque : l'anneau, qui grandit beaucoup, ne doit pas élargir la page. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        <span className="absolute left-1/2 top-1/2 -ml-32 -mt-32 size-64 rounded-full border-4 border-accent-bis opacity-0 motion-safe:animate-eclat" />
        <p className="absolute inset-0 flex items-center justify-center bg-linear-to-r from-accent to-accent-bis bg-clip-text font-titre text-5xl font-bold tracking-widest text-transparent opacity-0 motion-safe:animate-annonce sm:text-8xl">
          COMBAT !
        </p>
        </div>
        {/* Calque du fond pour les animations Showdown : placé AVANT les Pokémon, donc derrière eux. */}
        {/* Sans cadre autour de l'arène, un voile de couleur aurait des bords nets : un masque en dégradé les adoucit. */}
        <div ref={refCalqueFond} aria-hidden="true" className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_100%)]" />
        {/* relative : la grille des Pokémon passe au-dessus du calque du fond. */}
        <div className="relative grid min-h-[26rem] grid-cols-2 items-end gap-4 sm:min-h-[34rem]">
          {/* Mon Pokémon : à gauche, de dos, un peu plus bas */}
          <div className="pt-8">
            <CoteArene cote="joueur" lutteur={joueur} equipe={partie.joueurs} scene={partie.scene} ko={partie.ko} />
          </div>
          {/* L'adversaire : à droite, de face */}
          <div className="pb-8">
            <CoteArene cote="adversaire" lutteur={adversaire} equipe={partie.adversaires} scene={partie.scene} ko={partie.ko} />
          </div>
        </div>
        {/* Calque des effets d'attaque : décoratif (aria-hidden), il ne capte pas les clics.
            Ce qui se passe est déjà écrit dans le journal de combat. */}
        <canvas ref={refToile} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />
        {/* Calque des images d'effets Showdown : placé APRÈS les Pokémon, donc devant eux. */}
        <div ref={refCalqueEffets} aria-hidden="true" className="pointer-events-none absolute inset-0" />
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Menu des attaques, ou résultat du combat */}
        {partie.resultat ? (
          // Bandeau de fin : vert pour une victoire, rouge pour une défaite (table de classes complètes ci-dessous).
          <section
            aria-labelledby="titre-resultat"
            className={`verre relative flex flex-col items-center gap-4 overflow-hidden p-6 text-center sm:p-8 ${STYLES_RESULTAT[partie.resultat].bordure}`}
          >
            <span aria-hidden="true" className={`pointer-events-none absolute inset-0 opacity-25 ${STYLES_RESULTAT[partie.resultat].lueur}`} />
            <p className="etiquette relative">Fin du combat</p>
            <h2 id="titre-resultat" className={`relative animate-apparition font-titre text-4xl font-bold motion-reduce:animate-fondu sm:text-5xl ${STYLES_RESULTAT[partie.resultat].titre}`}>
              {partie.resultat === "victoire" ? "Victoire !" : "Défaite…"}
            </h2>
            <p className="relative text-sm text-texte-doux">
              {partie.resultat === "victoire"
                ? `${partie.joueurs.filter((l) => l.pv > 0).length} de tes Pokémon sur ${partie.joueurs.length} sont encore debout.`
                : `Il restait ${partie.adversaires.filter((l) => l.pv > 0).length} Pokémon à l'adversaire.`}
            </p>
            <div className="relative flex flex-wrap justify-center gap-2">
              <button type="button" onClick={demarrer} disabled={chargement} className="bouton bouton-principal disabled:opacity-60">
                {chargement ? "Recherche d'un adversaire…" : "Nouveau combat"}
              </button>
              <Link href="/sacoche" className="bouton bouton-secondaire">
                Modifier mon équipe
              </Link>
            </div>
          </section>
        ) : (
          <section aria-labelledby="titre-attaques" className="flex flex-col gap-2">
            <h2 id="titre-attaques" className="etiquette">
              Attaques de {joueur.surnom}
            </h2>
            <ul className="grid grid-cols-2 gap-2">
              {attaquesDuJoueur.map((attaque) => (
                // --teinte : couleur du type de l'attaque, pour le décor et le symbole du bouton.
                <li key={attaque.id} className="min-w-0" style={styleTeinte(attaque.type)}>
                  {/* Même présentation que les cartes d'attaque de la fiche : symbole du type, nom en gras,
                      puissance bien lisible à droite. Le contour s'allume au survol. */}
                  <button
                    type="button"
                    onClick={() => jouerTour(attaque)}
                    disabled={partie.occupe}
                    className="verre relative flex min-h-16 w-full items-center gap-2 overflow-hidden p-2 text-left transition-colors duration-200 hover:border-[var(--teinte)] disabled:opacity-50 sm:gap-3 sm:p-3"
                  >
                    <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,var(--teinte),transparent_60%)] opacity-25" />
                    <span aria-hidden="true" className="relative hidden size-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--teinte)_22%,transparent)] sm:flex">
                      <svg viewBox="0 0 24 24" className="size-5 fill-[var(--teinte)]">
                        <path d={GLYPHES[attaque.type].trace} fillRule="evenodd" />
                      </svg>
                    </span>
                    <span className="relative flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate font-titre text-sm font-bold sm:text-base">{attaque.nomFr}</span>
                      <span className="etiquette truncate">
                        {TYPES[attaque.type].libelle} · {LIBELLES_CATEGORIES[attaque.categorie]}
                      </span>
                    </span>
                    <span className="relative flex shrink-0 flex-col items-center">
                      <span className="etiquette">Puis.</span>
                      <span className="font-titre text-xl font-bold leading-tight tabular-nums">{attaque.puissance ?? "—"}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Journal : aria-live="polite" → chaque nouvelle ligne est lue par les lecteurs d'écran,
            sans interrompre ce qui est en train d'être lu. On affiche les 5 dernières lignes. */}
        <section aria-labelledby="titre-journal" className="verre flex flex-col gap-2 p-4">
          <h2 id="titre-journal" className="etiquette">
            Journal de combat
          </h2>
          <ol aria-live="polite" className="flex flex-col gap-1 text-sm">
            {partie.journal.slice(-5).map((ligne, index, lignes) => (
              // La dernière ligne (la plus récente) est mise en avant.
              <li key={ligne.id} className={index === lignes.length - 1 ? "font-semibold text-texte" : "text-texte-doux"}>
                {ligne.texte}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Un côté de l'arène                                                  */
/* ------------------------------------------------------------------ */

type PropsCote = {
  cote: Cote;
  lutteur: Lutteur;
  equipe: Lutteur[];
  scene: Scene | null;
  ko: Cote | null;
};

function CoteArene({ cote, lutteur, equipe, scene, ko }: PropsCote) {
  const animationsReduites = useReducedMotion();
  const estAttaquant = scene !== null && scene.attaquant === cote;
  const estCible = scene !== null && scene.attaquant !== cote;
  // Le joueur est à gauche : il s'élance vers la droite (+1). L'adversaire, vers la gauche (-1).
  const sens = cote === "joueur" ? 1 : -1;

  // Animation du Pokémon selon ce qui se passe. On n'anime que transform (x, y, rotate, scale) et opacity.
  // Pose de repos. Chaque animation ci-dessous REPART de cette pose complète ({ ...repos, … }) : si une valeur
  // manquait (scale par exemple), motion la ramènerait à sa valeur d'entrée (scale: 0.5) et le Pokémon rétrécirait.
  const repos = { opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 };
  let animation: Record<string, number | number[]> = repos;
  let duree = 0.3;
  if (ko === cote) {
    // K.O. : chute et fondu (fondu seul en animations réduites).
    animation = animationsReduites ? { opacity: 0 } : { opacity: 0, y: 50, rotate: -20 * sens };
    duree = 0.5;
  } else if (estAttaquant && scene.etape === "elan" && !animationsReduites) {
    animation = { ...repos, x: [0, 44 * sens, 0] }; // élan vers l'adversaire, puis retour
    duree = 0.26;
  } else if (estCible && scene.etape === "impact") {
    animation = { ...repos, opacity: animationsReduites ? [1, 0.4, 1] : [1, 0.15, 1, 0.15, 1] }; // le défenseur clignote
    duree = 0.4;
  }

  const ratio = lutteur.pv / lutteur.pvMax;

  return (
    <div className="flex flex-col gap-2">
      {/* Encadré d'informations */}
      {/* max-w-sm : l'encadré ne s'étire plus sur toute la demi-arène, il reste au-dessus de son Pokémon. */}
      <div className="mx-auto flex w-full max-w-sm flex-col gap-1 rounded-2xl border border-bordure bg-surface p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate font-titre text-sm font-semibold">{lutteur.surnom}</p>
          <p className="etiquette shrink-0">Niv. {NIVEAU}</p>
        </div>
        <ul className="flex gap-1" aria-label="Types">
          {lutteur.pokemon.types.map((type) => (
            <li key={type} className="flex min-w-0">
              <BadgeType type={type} petit />
            </li>
          ))}
        </ul>

        {/* Barre de PV : sa longueur est animée par une transition CSS sur transform ;
            sa couleur dépend du niveau (vert > 50 %, jaune > 20 %, rouge sinon). */}
        <div className="h-2 overflow-hidden rounded-full bg-piste" aria-hidden="true">
          <div
            className={`h-full origin-left rounded-full transition-transform duration-500 motion-reduce:transition-none ${
              ratio > 0.5 ? "bg-pv-haut" : ratio > 0.2 ? "bg-pv-moyen" : "bg-pv-bas"
            }`}
            style={{ transform: `scaleX(${ratio})` }}
          />
        </div>
        <p className="etiquette tabular-nums">
          PV {lutteur.pv} / {lutteur.pvMax}
        </p>

        {/* Une Pokéball par membre de l'équipe (comme dans l'en-tête) : pleine s'il peut encore se battre,
            simple contour s'il est K.O. */}
        <p className="sr-only">
          {equipe.filter((l) => l.pv > 0).length} Pokémon sur {equipe.length} encore en état de se battre
        </p>
        <div className="flex gap-1" aria-hidden="true">
          {equipe.map((l) => (
            <Pokeball key={l.pokemon.nom} vide={l.pv <= 0} className={l.pv > 0 ? "size-3.5" : "size-3.5 text-texte-doux opacity-50"} />
          ))}
        </div>
      </div>

      {/* data-cote : permet au moteur d'effets de retrouver la position de chaque Pokémon. */}
      <div className="relative" data-cote={cote}>
        {/* key = nom du Pokémon : quand un nouveau Pokémon entre, ce bloc est recréé
            et son animation d'entrée (initial → animate) se joue. */}
        <motion.div
          key={lutteur.pokemon.nom}
          initial={animationsReduites ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
          animate={animation}
          transition={{ duration: duree }}
        >
          {/* grand : socle plus large sur ordinateur, pour que les Pokémon ne soient pas perdus dans l'arène. */}
          <SocleEquipe grand pokemon={lutteur.pokemon} vue={cote === "joueur" ? "dos" : "face"} decalage={cote === "joueur" ? 0 : 3} />
        </motion.div>

      </div>
    </div>
  );
}

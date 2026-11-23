"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import BadgeType from "@/components/BadgeType";
import { DUREE_EFFET } from "@/components/EffetAttaque";
import EtatVide from "@/components/EtatVide";
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
import { choisirRecette } from "@/lib/labo/effets2d";
import { jouerAttaque, Moteur2D, type Point } from "@/lib/labo/moteur2d";
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
  const animationsReduites = useReducedMotion();

  // Numéro de la prochaine ligne du journal (sert de `key`). Un ref : le changer ne refait pas de rendu.
  const prochainId = useRef(0);
  // Passe à false quand on quitte la page : le tour en cours arrête alors de mettre à jour l'état.
  // Effets d'attaque : un <canvas> posé sur l'arène, dessiné par le moteur 2D (lib/labo/moteur2d.ts).
  const refArene = useRef<HTMLDivElement>(null);
  const refToile = useRef<HTMLCanvasElement>(null);
  const refMoteur = useRef<Moteur2D | null>(null);
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
    try {
      const reponse = await fetch(`/api/aleatoire?nombre=${membres.length}`);
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
      if (!monte.current) return;
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

      // 1. Annonce + élan de l'attaquant
      dire(`${attaquant.surnom} utilise ${attaque.nomFr} !`);
      publier({ scene: { attaquant: cote, etape: "elan", type: attaque.type } });
      await attendre(durees.elan);

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
            publier({ resultat: "victoire", occupe: false });
            return;
          }
          iAdversaire = suivant;
          dire(`L'adversaire envoie ${adversaires[suivant].surnom} !`);
        } else {
          const suivant = joueurs.findIndex((l) => l.pv > 0);
          if (suivant === -1) {
            dire("Tous tes Pokémon sont K.O. Tu as perdu le combat…");
            publier({ resultat: "defaite", occupe: false });
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

  // Avant le combat : écran de préparation.
  if (!partie) {
    return (
      <div className="verre flex flex-col items-center gap-6 px-6 py-8 text-center">
        <div className="flex flex-col gap-2">
          <h2 className="font-titre text-xl font-semibold">Prêt pour le combat ?</h2>
          <p className="max-w-md text-sm text-texte-doux">
            Ton équipe de {membres.length} Pokémon affronte {membres.length} Pokémon tirés au hasard, au niveau {NIVEAU}.
          </p>
        </div>
        <ul className="flex flex-wrap justify-center gap-2">
          {membres.map((m) => (
            <li key={m.pokemon.nom} className="etiquette rounded-full border border-bordure px-3 py-1">
              {m.surnom}
            </li>
          ))}
        </ul>
        {erreur && (
          <p role="alert" className="text-sm text-danger">
            Impossible de trouver un adversaire. Vérifie ta connexion et réessaie.
          </p>
        )}
        <button type="button" onClick={demarrer} disabled={!attaquesPretes || chargement} className="bouton bouton-principal disabled:opacity-60">
          {!attaquesPretes ? "Préparation des attaques…" : chargement ? "Recherche d'un adversaire…" : "Commencer le combat"}
        </button>
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
      {/* L'arène. Elle tremble à l'impact (transform uniquement). */}
      <motion.div
        ref={refArene}
        className="verre relative overflow-hidden p-4 sm:p-6"
        animate={{ x: tremble ? [0, -8, 8, -6, 6, 0] : 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="grid grid-cols-2 items-end gap-4">
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
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Menu des attaques, ou résultat du combat */}
        {partie.resultat ? (
          <section aria-labelledby="titre-resultat" className="verre flex flex-col items-start gap-4 p-4 sm:p-6">
            <p className="etiquette">Fin du combat</p>
            <h2 id="titre-resultat" className="font-titre text-3xl font-bold">
              {partie.resultat === "victoire" ? "Victoire !" : "Défaite…"}
            </h2>
            <button type="button" onClick={demarrer} disabled={chargement} className="bouton bouton-principal disabled:opacity-60">
              {chargement ? "Recherche d'un adversaire…" : "Nouveau combat"}
            </button>
          </section>
        ) : (
          <section aria-labelledby="titre-attaques" className="flex flex-col gap-2">
            <h2 id="titre-attaques" className="etiquette">
              Attaques de {joueur.surnom}
            </h2>
            <ul className="grid grid-cols-2 gap-2">
              {attaquesDuJoueur.map((attaque) => (
                <li key={attaque.id} className="min-w-0">
                  {/* Bouton coloré par le type de l'attaque (classes complètes venues de la table TYPES). */}
                  <button
                    type="button"
                    onClick={() => jouerTour(attaque)}
                    disabled={partie.occupe}
                    className={`flex min-h-16 w-full flex-col items-start justify-center gap-1 rounded-2xl px-4 py-2 text-left shadow-carte disabled:opacity-50 ${TYPES[attaque.type].classes}`}
                  >
                    <span className="w-full truncate font-titre text-sm font-semibold">{attaque.nomFr}</span>
                    <span className="w-full truncate text-[11px] font-semibold uppercase tracking-wider">
                      {TYPES[attaque.type].libelle} · Puis. {attaque.puissance ?? "—"}
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
  let animation: Record<string, number | number[]> = { opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 };
  let duree = 0.3;
  if (ko === cote) {
    // K.O. : chute et fondu (fondu seul en animations réduites).
    animation = animationsReduites ? { opacity: 0 } : { opacity: 0, y: 50, rotate: -20 * sens };
    duree = 0.5;
  } else if (estAttaquant && scene.etape === "elan" && !animationsReduites) {
    animation = { x: [0, 44 * sens, 0] }; // élan vers l'adversaire, puis retour
    duree = 0.26;
  } else if (estCible && scene.etape === "impact") {
    animation = { opacity: animationsReduites ? [1, 0.4, 1] : [1, 0.15, 1, 0.15, 1] }; // le défenseur clignote
    duree = 0.4;
  }

  const ratio = lutteur.pv / lutteur.pvMax;

  return (
    <div className="flex flex-col gap-2">
      {/* Encadré d'informations */}
      <div className="flex flex-col gap-1 rounded-2xl border border-bordure bg-surface p-3">
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

        {/* Une pastille par membre de l'équipe : pleine s'il peut encore se battre */}
        <p className="sr-only">
          {equipe.filter((l) => l.pv > 0).length} Pokémon sur {equipe.length} encore en état de se battre
        </p>
        <div className="flex gap-1" aria-hidden="true">
          {equipe.map((l) => (
            <span
              key={l.pokemon.nom}
              className={l.pv > 0 ? "h-2 w-2 rounded-full bg-accent" : "h-2 w-2 rounded-full border border-texte-doux opacity-50"}
            />
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
          <SocleEquipe pokemon={lutteur.pokemon} vue={cote === "joueur" ? "dos" : "face"} decalage={cote === "joueur" ? 0 : 3} />
        </motion.div>

      </div>
    </div>
  );
}

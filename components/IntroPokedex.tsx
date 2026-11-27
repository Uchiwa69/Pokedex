"use client";

// Introduction de la page d'accueil — un Pokédex géant EN 3D, fermé à l'arrivée : en défilant, son volet
// s'ouvre, puis on plonge dans son écran, qui devient la page du site.
//
// L'appareil est un vrai modèle en volume (three.js) : lib/labo/pokedex3d.ts le construit pièce par pièce,
// lib/labo/scene-pokedex.ts règle ses lumières. three.js est chargé à la demande (import dynamique) ; en
// attendant, la scène est vide sous son projecteur, puis l'appareil y apparaît en fondu (pas d'image
// d'attente : on voyait l'ancien visuel une fraction de seconde avant le modèle 3D).
//
// Le défilement pilote tout : useScroll donne l'avancement (0 → 1), et à chaque changement on règle l'angle
// du volet, l'orientation de l'appareil et le zoom de la caméra, puis on redessine UNE image. Il n'y a pas
// de boucle d'animation permanente : quand on ne défile pas, la carte graphique ne travaille pas.
//
// L'idée forte : ce que l'on voit dans l'écran de l'appareil est LA VRAIE PAGE du site. À chaque image, on
// calcule où l'écran du modèle tombe dans la fenêtre (projection de ses quatre coins par la caméra), et on
// réduit et découpe la vraie page pour qu'elle l'occupe exactement. Quand la caméra zoome, l'écran grandit,
// donc la page aussi, jusqu'à sa taille normale.
//
// Deux composants dans ce fichier :
//   - IntroPokedex (le parent) décide si l'introduction est affichée, et porte la vraie page ;
//   - ScenePokedex (l'enfant) dessine l'appareil et pilote l'animation tant que l'introduction est affichée.

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import { motion, transform, useMotionValue, useMotionValueEvent, useScroll, useTransform, type MotionValue } from "motion/react";
import Projecteurs from "@/components/Projecteurs";
import { ratioPixels } from "@/lib/qualite";

type Props = {
  // La vraie page (titre, recherche, grille…), rendue par le serveur et transmise ici.
  children: ReactNode;
};

// La chorégraphie est EXACTEMENT celle de la version en photos : seul l'appareil a changé.
// À tel avancement du défilement (1re liste) correspond telle valeur (2e liste).
// - décalage de l'appareil vers la droite, en part de sa largeur (volet ouvert, il est deux fois plus large) ;
// - grossissement : la plongée, lente puis de plus en plus rapide (1 → 3 → 14).
const COURBE_DECALAGE = { avancement: [0.03, 0.2, 0.28], valeur: [0, 0.44, 0] };
const COURBE_TAILLE = { avancement: [0, 0.24, 0.3, 0.41, 0.52], valeur: [0.9, 1, 1, 3, 14] };
// Repères repris des photos, pour que le modèle 3D ait la même taille et la même place à l'écran :
// l'appareil occupait un cadre de proportions 1210 × 1834, haut de min(70svh, 62vw) ; l'écran y mesurait 69,33 %
// de la largeur, et son centre était à 52 % de la largeur et 48,06 % de la hauteur.
const PROPORTIONS = 1210 / 1834;
const ECRAN = { largeur: 0.6933, centreX: 0.52, centreY: 0.4806 };
// Caméra : champ de vision vertical (en degrés) et distance à l'écran de l'appareil. Elle ne s'approche pas :
// la plongée est un zoom de l'objectif, comme le grossissement (scale) de la version en photos.
const CHAMP = 38;
const DISTANCE = 11;

// Rectangle de l'écran du modèle dans la zone d'affichage, en pixels.
type Rectangle = { gauche: number; haut: number; largeur: number; hauteur: number };

// L'en-tête du site reste masqué jusqu'à cet avancement (la plongée a commencé, l'écran grossit déjà).
const SEUIL_ENTETE = 0.36;

// Arrivée dans le site : un geste est considéré comme terminé après cette durée sans événement (millisecondes),
// et la page n'est jamais retenue plus longtemps que RETENUE_MAX.
const PAUSE_FIN_DE_GESTE = 260;
const RETENUE_MIN = 600; // retenue minimale : juste après l'introduction, le navigateur est occupé et les événements tardent
// Sécurité seulement : la retenue s'arrête d'elle-même dès que le geste est fini ou qu'un nouveau geste commence.
// 2,5 s : l'inertie du pavé tactile d'un Mac dure souvent 1,5 à 2 s (avec 1 s, sa fin faisait glisser la page).
const RETENUE_MAX = 2500;
// Un cran de molette arrivé après ce silence (millisecondes) n'est plus l'élan du geste précédent : c'est le
// visiteur qui redemande à défiler. On rend alors la page aussitôt (sinon ce cran était « perdu » : la page
// descendait puis remontait d'un coup, une saccade). L'élan d'une molette libre ou d'un pavé tactile envoie, lui,
// des événements serrés (moins de 20 ms d'écart).
const ECART_NOUVEAU_GESTE = 180;

// Clé du sessionStorage : retient, le temps de la visite, que l'introduction a déjà été vue.
// (sessionStorage est vidé à la fermeture de l'onglet : à la visite suivante, elle rejoue.)
const CLE_VUE = "pokedex-intro-vue";
// Rien à écouter : la valeur n'est lue qu'une fois, à l'arrivée sur la page.
const sansAbonnement = () => () => {};

// À partir de cet avancement, la plongée est finie : on est dans le site, l'introduction se referme.
const SEUIL_FIN = 0.62;
// Pour ROUVRIR l'introduction, il faut insister : cumuler ce nombre de pixels de molette vers le haut,
// alors qu'on est déjà tout en haut de la page.
const EFFORT_POUR_ROUVRIR = 1800;
// Avant de compter cet effort, il faut être resté immobile tout en haut pendant ce temps (en millisecondes) :
// l'élan d'une remontée de page (molette libre, pavé tactile) ne doit pas suffire à rouvrir l'introduction.
const REPOS_AVANT_EFFORT = 500;

// true si le visiteur a demandé moins d'animations dans son système.
// On n'utilise pas ici useReducedMotion() de motion : il donne la vraie réponse dès le premier rendu du
// navigateur, alors que le serveur, lui, a rendu la page AVEC l'introduction → les deux HTML différaient
// (erreur d'hydratation). useSyncExternalStore répond « false » pendant l'hydratation, comme le serveur,
// puis donne la vraie valeur juste après.
const REQUETE_REDUIT = "(prefers-reduced-motion: reduce)";
function abonnerAnimationsReduites(rappel: () => void) {
  const media = window.matchMedia(REQUETE_REDUIT);
  media.addEventListener("change", rappel);
  return () => media.removeEventListener("change", rappel);
}
function useAnimationsReduites(): boolean {
  return useSyncExternalStore(
    abonnerAnimationsReduites,
    () => window.matchMedia(REQUETE_REDUIT).matches,
    () => false,
  );
}

// Borne une valeur entre 0 et 1.
const entre0et1 = (valeur: number) => Math.min(1, Math.max(0, valeur));

// Les réglages d'affichage de la vraie page, pilotés par la scène pendant l'introduction.
type ValeursPage = {
  opacite: MotionValue<number>;
  taille: MotionValue<number>;
  x: MotionValue<number>;
  y: MotionValue<number>;
  decoupe: MotionValue<string>;
  clics: MotionValue<string>;
};

export default function IntroPokedex({ children }: Props) {
  const page = useRef<HTMLDivElement>(null);
  const animationsReduites = useAnimationsReduites();

  // L'introduction ne joue qu'UNE fois par visite. Revenir sur l'accueil (depuis une fiche, par exemple) affiche
  // directement la page. useSyncExternalStore (comme pour les stores du site) : le serveur ne connaît pas le
  // sessionStorage, il répond « pas encore vue » ; le navigateur lit la vraie valeur juste après, sans erreur
  // d'hydratation. La valeur lue est gardée dans un ref : elle ne change plus tant que cette page reste affichée.
  const lueAuDepart = useRef<boolean | null>(null);
  const dejaVue = useSyncExternalStore(
    sansAbonnement,
    () => {
      if (lueAuDepart.current === null) {
        try {
          lueAuDepart.current = sessionStorage.getItem(CLE_VUE) === "1";
        } catch {
          lueAuDepart.current = false; // sessionStorage indisponible (navigation privée stricte…)
        }
      }
      return lueAuDepart.current;
    },
    () => false,
  );

  // « auto » : on suit dejaVue. « page » : la plongée vient de se terminer, l'introduction est refermée.
  // « intro » : le visiteur a insisté en haut de page pour la revoir.
  const [etat, setEtat] = useState<"auto" | "page" | "intro">("auto");
  const introAffichee = !animationsReduites && (etat === "intro" || (etat === "auto" && !dejaVue));

  // Réglages de la vraie page. Ce sont des « motion values » : la scène les modifie à chaque défilement sans
  // provoquer de nouveau rendu React. Valeurs de départ : page invisible (elle apparaîtra dans l'écran).
  const opacite = useMotionValue(0);
  const taille = useMotionValue(1);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const decoupe = useMotionValue("none");
  const clics = useMotionValue("none");

  // Changer d'état ajoute ou retire deux écrans de hauteur AU-DESSUS de la page : sans précaution, tout sauterait
  // sous les yeux du visiteur. On note donc où est la page juste avant, et on corrige le défilement juste après,
  // pour qu'elle reste exactement au même endroit de la fenêtre.
  // useLayoutEffect : s'exécute après la mise à jour de la page mais AVANT que le navigateur la dessine.
  const positionAvant = useRef<number | null>(null);
  // Défilement auquel la plongée s'est terminée : c'est là qu'on revient si l'introduction est rouverte.
  const defilementFin = useRef<number | null>(null);
  function changerEtat(suivant: "page" | "intro") {
    positionAvant.current = page.current?.getBoundingClientRect().top ?? null;
    if (suivant === "page") defilementFin.current = window.scrollY;
    setEtat(suivant);
  }
  useLayoutEffect(() => {
    if (!introAffichee) {
      // Introduction absente : la page est une page normale (aucune transformation, aucune découpe).
      opacite.set(1);
      taille.set(1);
      x.set(0);
      y.set(0);
      decoupe.set("none");
      clics.set("auto");
    }
    if (positionAvant.current !== null && page.current) {
      if (introAffichee) {
        // Réouverture : la page devient fixe (voir plus bas). On la garde à l'endroit où elle était, et on place
        // le défilement à la fin de la plongée : remonter la fera alors rentrer dans l'écran de l'appareil.
        // (Sans fin connue — introduction déjà vue lors d'une visite précédente —, on vise un point situé
        // après la fin de la plongée : la page y est de toute façon à sa place.)
        x.set(0);
        y.set(positionAvant.current);
        window.scrollTo(0, defilementFin.current ?? window.innerHeight * 1.4);
      } else {
        // Fermeture : la page revient dans le flux. Sa place est calculée SANS ses transformations (offsetTop
        // additionnés, moins le défilement) : les motion values viennent d'être remises à zéro, mais le
        // navigateur ne l'a pas encore appliqué, et getBoundingClientRect() verrait l'ancien décalage.
        let haut = -window.scrollY;
        for (let element: HTMLElement | null = page.current; element; element = element.offsetParent as HTMLElement | null) {
          haut += element.offsetTop;
        }
        window.scrollBy(0, haut - positionAvant.current);
      }
      positionAvant.current = null;
    }
  }, [introAffichee, opacite, taille, x, y, decoupe, clics]);

  // Arrivée dans le site : la plongée se termine souvent en plein geste (molette lancée, doigt qui glisse), et
  // l'élan faisait descendre la page de plusieurs écrans. On RETIENT donc la page tout en haut tant que ce geste
  // dure, jusqu'à une courte pause ; ensuite le défilement redevient normal.
  // Heure du dernier événement de molette (horodatage de l'événement, pas de son traitement : juste après
  // l'introduction, le navigateur est occupé et les événements arrivent en paquet, avec du retard).
  const derniereMolette = useRef(0);
  useEffect(() => {
    if (!introAffichee) return;
    const noter = (evenement: WheelEvent) => {
      derniereMolette.current = evenement.timeStamp;
    };
    window.addEventListener("wheel", noter, { passive: true });
    return () => window.removeEventListener("wheel", noter);
  }, [introAffichee]);

  function retenirEnHaut() {
    let pause: ReturnType<typeof setTimeout>;
    function liberer() {
      clearTimeout(pause);
      clearTimeout(limite);
      window.removeEventListener("scroll", remonter);
      window.removeEventListener("wheel", prolonger);
      window.removeEventListener("touchmove", prolonger);
      window.removeEventListener("touchend", liberer);
    }
    // Le navigateur refuse d'annuler une molette déjà lancée (preventDefault est ignoré en cours de geste).
    // On corrige donc après coup : dès que la page a bougé, elle est remise tout en haut.
    function remonter() {
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    }
    // Chaque nouvel événement du geste repousse la libération.
    const debut = performance.now();
    // Plus petit pas de molette vu depuis l'arrivée : l'inertie ne fait que ralentir, ses pas diminuent.
    let plusPetitPas = Infinity;
    function prolonger(evenement: Event) {
      if (evenement instanceof WheelEvent) {
        const ecart = evenement.timeStamp - derniereMolette.current;
        derniereMolette.current = evenement.timeStamp;
        const pas = Math.abs(evenement.deltaY);
        // Un pas nettement plus grand que pendant le ralentissement = les doigts relancent un nouveau geste
        // sur le pavé tactile (sans silence entre les deux, l'écart de temps ne suffit pas à le voir).
        const relance = pas > Math.max(8, plusPetitPas * 3);
        plusPetitPas = Math.min(plusPetitPas, pas);
        // Nouveau cran après un silence, ou geste relancé : celui d'arrivée est fini, la page défile normalement.
        if (ecart > ECART_NOUVEAU_GESTE || relance) {
          liberer();
          return;
        }
        // Élan du geste d'arrivée : on l'annule quand le navigateur le permet (pas de saccade), sinon remonter()
        // corrige après coup.
        if (evenement.cancelable) evenement.preventDefault();
      }
      clearTimeout(pause);
      // Plus rien depuis un instant = le geste est fini. Mais jamais avant RETENUE_MIN depuis le début.
      const resteMinimum = RETENUE_MIN - (performance.now() - debut);
      pause = setTimeout(liberer, Math.max(PAUSE_FIN_DE_GESTE, resteMinimum));
    }
    window.addEventListener("scroll", remonter);
    // passive: false : pour pouvoir annuler l'élan de la molette (jamais plus de RETENUE_MAX).
    window.addEventListener("wheel", prolonger, { passive: false });
    window.addEventListener("touchmove", prolonger, { passive: true });
    window.addEventListener("touchend", liberer); // le doigt quitte l'écran : fini
    pause = setTimeout(liberer, RETENUE_MIN);
    // Sécurité : quoi qu'il arrive, la page est rendue au visiteur au bout de RETENUE_MAX.
    const limite = setTimeout(liberer, RETENUE_MAX);
  }

  // « Blocage » en haut de page : une fois dans le site, remonter s'arrête en haut de la page, comme sur
  // n'importe quel site. Pour revoir l'introduction à l'envers, il faut d'abord S'ARRÊTER tout en haut, puis
  // INSISTER longuement avec la molette (ou le pavé tactile). Un coup de molette, ou l'élan d'une remontée
  // rapide de la page, ne suffit pas.
  useEffect(() => {
    if (introAffichee || animationsReduites) return;
    let cumul = 0;
    // « arme » : vrai une fois que le visiteur est resté immobile en haut de page. Au départ, c'est le cas
    // seulement si la page est déjà tout en haut.
    let arme = window.scrollY === 0;
    let minuterie: ReturnType<typeof setTimeout> | undefined;
    function surMolette(evenement: WheelEvent) {
      // Après REPOS_AVANT_EFFORT sans aucun geste : le cumul retombe à zéro, et le blocage se désarme si l'on
      // est bien tout en haut. Chaque nouveau geste repousse ce moment.
      clearTimeout(minuterie);
      minuterie = setTimeout(() => {
        cumul = 0;
        arme = window.scrollY === 0;
      }, REPOS_AVANT_EFFORT);

      if (window.scrollY > 0) {
        // On n'est pas en haut : rien ne compte, et il faudra de nouveau marquer un temps d'arrêt en haut.
        cumul = 0;
        arme = false;
        return;
      }
      if (!arme || evenement.deltaY >= 0) {
        cumul = 0;
        return;
      }
      cumul -= evenement.deltaY;
      if (cumul >= EFFORT_POUR_ROUVRIR) {
        cumul = 0;
        arme = false;
        changerEtat("intro");
      }
    }
    // passive : on ne bloque jamais le défilement, on se contente de l'observer.
    window.addEventListener("wheel", surMolette, { passive: true });
    return () => {
      window.removeEventListener("wheel", surMolette);
      clearTimeout(minuterie);
    };
  }, [introAffichee, animationsReduites]);

  return (
    <>
      {introAffichee && (
        <ScenePokedex
          page={page}
          valeurs={{ opacite, taille, x, y, decoupe, clics }}
          // Fin de la plongée : on referme l'introduction. La page devient une page normale, dont le haut est
          // le vrai haut du site : la pagination, le logo ou « Tous » n'y ramènent plus le Pokédex.
          surFin={() => {
            changerEtat("page");
            retenirEnHaut();
          }}
        />
      )}

      {/* La vraie page. Elle reste TOUJOURS le même élément, que l'introduction soit affichée ou non : son contenu
          (champ de recherche, filtres, grille) n'est donc jamais recréé. z-10 : au-dessus de l'appareil.
          origin-top : pendant la plongée, elle grossit à partir de son bord haut, posé sur le haut de l'écran.
          Pendant l'introduction elle est FIXE (position: fixed) : collée à la fenêtre, elle ne défile pas, et sa
          place ne dépend que des transformations calculées par la scène. Avant, elle défilait avec le navigateur
          et le code la « rattrapait » avec une image de retard : elle tremblait dans le cadre de l'appareil.
          inset-x-0 mx-auto w-full max-w-7xl px-4 : mêmes largeur et marges que <main>, donc même mise en page. */}
      <motion.div
        ref={page}
        className={`z-10 flex origin-top flex-col gap-6 ${introAffichee ? "fixed inset-x-0 top-0 mx-auto w-full max-w-7xl px-4" : "relative"}`}
        style={{ opacity: opacite, scale: taille, x, y, clipPath: decoupe, pointerEvents: clics }}
      >
        {children}
      </motion.div>
    </>
  );
}

/* ------------------------------------------------------------------ */

type PropsScene = {
  page: RefObject<HTMLDivElement | null>;
  valeurs: ValeursPage;
  surFin: () => void;
};

// L'appareil et son animation. Ce composant n'existe que pendant l'introduction : à chaque fois qu'il est
// (re)créé, ses hooks de défilement repartent de zéro sur le bon élément.
function ScenePokedex({ page, valeurs, surFin }: PropsScene) {
  const zone = useRef<HTMLDivElement>(null);
  const cadre = useRef<HTMLDivElement>(null); // le bloc collé en haut de l'écran, qui contient le canvas
  const toile = useRef<HTMLDivElement>(null);
  // La scène 3D, une fois chargée : une fonction qui la dessine pour un avancement donné et renvoie le
  // rectangle de l'écran de l'appareil. Rangée dans un ref : elle ne déclenche pas de rendu React.
  const dessiner = useRef<((avancement: number) => Rectangle | null) | null>(null);
  const [pret, setPret] = useState(false);

  const { scrollYProgress } = useScroll({ target: zone, offset: ["start start", "end end"] });

  // Traits de vitesse : ils apparaissent pendant la plongée et s'écartent du centre.
  // Opacité de la scène 3D, réglée par calerPage.
  const fonduScene = useMotionValue(1);
  const traitsCourbe = useTransform(scrollYProgress, [0.32, 0.43, 0.54], [0, 0.55, 0]);
  // … multipliée par celle de la scène : les traits s'effacent avec l'appareil, en fin de plongée.
  const traitsOpacite = useTransform(() => traitsCourbe.get() * fonduScene.get());
  const traitsTaille = useTransform(scrollYProgress, [0.32, 0.54], [0.7, 2.6]);
  const invitationOpacite = useTransform(scrollYProgress, [0, 0.03], [1, 0]);
  // Lumière de scène derrière l'appareil : elle s'éteint au moment de plonger. Elle reste au centre de la
  // fenêtre : fermé, l'appareil y est ; ouvert, il se décale justement pour que l'ensemble volet + corps y soit.
  const lumiereOpacite = useTransform(scrollYProgress, [0.24, 0.34], [1, 0]);
  // « Début » de l'introduction : tant que l'appareil est seul en scène (avant la plongée), l'en-tête du site est
  // masqué pour le mettre en valeur. C'est un état React et non une motion value : il ne change que deux fois.
  const [debut, setDebut] = useState(true);

  // ---- La page calée dans l'écran ----
  // Place la vraie page pour qu'elle occupe exactement l'écran de l'appareil : sa taille (échelle), ses
  // décalages, et la « fenêtre » qui la découpe au format de l'écran.
  function calerPage(avancement: number, ecran: Rectangle) {
    const p = page.current;
    const c = cadre.current;
    if (!p || !c) return;
    // Position et taille de la page SANS ses transformations (mesurées à l'avance, voir mesurer). La page est
    // fixe : sa position ne dépend pas du défilement.
    const { largeurPage, hauteurPage, gauche, haut } = mesures.current;
    if (largeurPage === 0) return;
    const zoneCadre = c.getBoundingClientRect();

    // La page est réduite pour avoir la largeur de l'écran ; jamais plus grande que sa taille normale.
    const echelle = Math.min(1, ecran.largeur / largeurPage);
    // Quand la page approche de sa taille normale, on efface l'appareil et on ouvre la découpe en douceur.
    // La page, elle, reste COLLÉE à l'écran jusqu'au bout (avant, on la relâchait
    // vers sa place dans le site, qui dépend du défilement : elle faisait de petits bonds dans le cadre).
    // La fin se joue en deux temps, pour que la page ne déborde jamais sur un appareil encore visible :
    //   - « efface » (échelle de 0,6 à 0,85) : l'appareil disparaît, la page reste dans son cadre ;
    //   - « fini » (échelle de 0,85 à 1) : le cadre s'ouvre sur toute la page.
    // (echelle >= 1 est testé à part : un calcul comme (1 - 0,85) / 0,15 peut donner 0,9999999999999998 et non 1,
    // à cause des arrondis des nombres à virgule.)
    const efface = entre0et1((echelle - 0.6) / 0.25);
    const fini = echelle >= 1 ? 1 : entre0et1((echelle - 0.85) / 0.15);
    pageEnPlace.current = echelle >= 1;

    // Décalages pour poser le milieu de la page sur celui de l'écran, et son haut sur le haut de l'écran.
    const milieuEcran = zoneCadre.left + ecran.gauche + ecran.largeur / 2;
    const hautEcran = zoneCadre.top + ecran.haut;
    valeurs.taille.set(echelle);
    // L'appareil s'efface à mesure que la page atteint sa taille normale. Sans cela, sur un téléphone (écran en
    // hauteur), la page arrivait à sa taille avant que l'écran de l'appareil ne couvre toute la fenêtre : une
    // bande de plastique rouge restait visible sous les cartes.
    fonduScene.set(1 - efface);
    valeurs.x.set(milieuEcran - (gauche + largeurPage / 2));
    valeurs.y.set(hautEcran - haut);

    // Fenêtre de découpe (clip-path), exprimée dans le repère de la page AVANT mise à l'échelle :
    // on garde une bande centrée de la largeur de l'écran, et la hauteur de l'écran depuis le haut.
    // × (1 - fini) : en fin de plongée, le cadre s'ouvre progressivement au lieu de disparaître d'un coup.
    const cote = Math.max(0, (largeurPage - ecran.largeur / echelle) / 2) * (1 - fini);
    const bas = Math.max(0, hauteurPage - ecran.hauteur / echelle) * (1 - fini);
    // Plongée finie : plus aucune découpe, la page est une page normale.
    // Exception assumée à la règle « n'animer que transform et opacity » : clip-path est indispensable pour que
    // la page ne dépasse pas de l'écran de l'appareil. Elle ne sert que pendant la plongée.
    valeurs.decoupe.set(fini >= 1 ? "none" : `inset(0px ${cote}px ${bas}px ${cote}px round ${6 / echelle}px)`);
    // La page apparaît dans l'écran une fois le volet ouvert et l'appareil de face (entre 24 % et 29 %).
    valeurs.opacite.set(entre0et1((avancement - 0.24) / 0.05));
    // Tant qu'elle n'a pas atteint sa taille normale, la page ne reçoit pas de clics (elle est en miniature,
    // posée par-dessus l'appareil).
    valeurs.clics.set(echelle >= 1 ? "auto" : "none");
  }

  // Mesures de la page dans le document. Les lire oblige le navigateur à recalculer la mise en page : on ne le
  // fait donc pas à chaque image, seulement quand une taille change (voir adapter).
  const mesures = useRef({ largeurPage: 0, hauteurPage: 0, haut: 0, gauche: 0, hautDansLeSite: 0 });
  // Vrai quand la page a atteint sa taille normale (noté par calerPage) : c'est le signal de fin de la plongée.
  const pageEnPlace = useRef(false);
  const enPlacePrecedent = useRef(false);
  function mesurer() {
    const p = page.current;
    if (!p) return;
    // La page est fixe : offsetTop et offsetLeft donnent sa place dans la fenêtre, SANS les transformations.
    const haut = p.offsetTop;
    const gauche = p.offsetLeft;
    // Place du haut de la page dans le site, une fois l'introduction refermée et le défilement tout en haut :
    // le haut de <main> (juste sous l'en-tête) plus sa marge intérieure haute.
    const principal = p.parentElement;
    const marges = principal ? getComputedStyle(principal) : null;
    const hautDansLeSite = principal && marges ? principal.offsetTop + parseFloat(marges.paddingTop) : 0;
    mesures.current = { largeurPage: p.offsetWidth, hauteurPage: p.offsetHeight, haut, gauche, hautDansLeSite };
  }

  // Redessine la scène pour l'avancement du moment, puis recale la page. Tout est fait dans le même appel :
  // la page n'a jamais une image de retard sur l'appareil.
  function actualiser() {
    const avancement = scrollYProgress.get();
    const ecran = dessiner.current?.(avancement);
    if (ecran) calerPage(avancement, ecran);
  }

  // Création de la scène 3D (une seule fois). three.js et le modèle sont importés ici : ils ne sont
  // téléchargés que si l'introduction est affichée.
  useEffect(() => {
    const conteneur = toile.current;
    if (!conteneur) return;
    let annule = false;
    let nettoyer = () => {};

    (async () => {
      const [THREE, modele, { preparerScenePokedex }] = await Promise.all([
        import("three"),
        import("@/lib/labo/pokedex3d"),
        import("@/lib/labo/scene-pokedex"),
      ]);
      if (annule) return;

      let rendu: import("three").WebGLRenderer;
      try {
        // alpha: true → fond transparent : on voit le fond du site derrière l'appareil.
        rendu = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch {
        surFin(); // pas de 3D sur cet appareil : on affiche directement la page
        return;
      }
      // Densité de pixels plafonnée à 1,5 : sur un écran très dense, dessiner 4 fois plus de pixels à chaque
      // défilement faisait saccader la plongée, pour un gain de netteté invisible en mouvement. Elle est fixée
      // dans adapter (plus bas), avec aussi un budget de pixels (lib/qualite.ts) pour les grands écrans Retina.
      rendu.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      conteneur.appendChild(rendu.domElement);
      rendu.domElement.style.cssText = "display:block;width:100%;height:100%";

      const { scene, pokedex, ecran, liberer } = await preparerScenePokedex(THREE, modele, rendu);
      const camera = new THREE.PerspectiveCamera(CHAMP, 1, 0.05, 200);
      // Les shaders (les programmes de la carte graphique) sont compilés EN ARRIÈRE-PLAN avant le premier dessin.
      // Sans cela, le premier render() les compilait d'un coup et figeait la page (150 ms et plus mesurées).
      await rendu.compileAsync(scene, camera);
      if (annule) {
        // Le composant a été retiré pendant la préparation : on libère tout de suite.
        liberer();
        rendu.dispose();
        rendu.domElement.remove();
        return;
      }
      const demiChamp = Math.tan(THREE.MathUtils.degToRad(CHAMP / 2));
      const taille = { largeur: 0, hauteur: 0 };
      const coin = new THREE.Vector3();
      const centre = new THREE.Vector3();
      // Largeur de l'écran du modèle, en unités de la scène (largeur de sa plaque × son agrandissement).
      const largeurEcran = ecran ? (ecran.geometry as import("three").PlaneGeometry).parameters.width * ecran.scale.x : 1;
      const hauteurEcran = ecran ? (ecran.geometry as import("three").PlaneGeometry).parameters.height * ecran.scale.y : 1;

      dessiner.current = (avancement) => {
        // Taille de la zone, mémorisée par adapter (pas de lecture de mise en page à chaque image).
        const { largeur, hauteur } = taille;
        if (!ecran || largeur === 0 || hauteur === 0) return null;

        // 1. Le volet s'ouvre (de 3 % à 24 %) : rotation autour de la charnière, jusqu'à 178°.
        pokedex.lidPivotGroup.rotation.y = -THREE.MathUtils.degToRad(transform(avancement, [0.03, 0.24], [0, 178]));
        // 2. L'appareil, d'abord légèrement de biais (16°), se redresse face à nous.
        pokedex.rootGroup.rotation.y = -THREE.MathUtils.degToRad(transform(avancement, [0, 0.24], [16, 0]));
        pokedex.rootGroup.updateMatrixWorld(true);

        // 3. Taille à l'écran. hauteurCadre = le cadre des photos, min(70svh, 62vw). On en déduit combien de
        //    pixels doit mesurer une unité du modèle pour que son écran ait la largeur de celui des photos,
        //    multipliée par le grossissement du moment.
        const hauteurCadre = Math.min(0.7 * hauteur, 0.62 * largeur);
        const largeurCadre = hauteurCadre * PROPORTIONS;
        const grossissement = transform(avancement, COURBE_TAILLE.avancement, COURBE_TAILLE.valeur);
        const pixelsParUnite = ((ECRAN.largeur * largeurCadre) / largeurEcran) * grossissement;
        // À zoom 1, une unité placée à DISTANCE mesure hauteur / (2 × DISTANCE × tan(champ / 2)) pixels.
        camera.zoom = pixelsParUnite / (hauteur / (2 * DISTANCE * demiChamp));

        // 4. Place à l'écran. Au début, comme avec les photos, le centre de l'écran de l'appareil reste à
        //    (décalage ; léger écart vertical) du centre de la fenêtre. Puis, à mesure que la page grandit dans
        //    l'écran (« arrivee » de 0 à 1), on fait glisser l'écran pour que, pile quand la page atteint sa
        //    taille normale, son haut soit sous l'en-tête (hautDansLeSite) et son milieu au milieu : exactement la place de la
        //    page dans le site. La page n'a donc jamais à quitter l'écran de l'appareil.
        //    On déplace la caméra SANS la tourner : l'écran reste de face, donc parfaitement rectangulaire.
        const decalage = transform(avancement, COURBE_DECALAGE.avancement, COURBE_DECALAGE.valeur);
        const { largeurPage, hautDansLeSite } = mesures.current;
        const echelleDepart = (ECRAN.largeur * largeurCadre) / Math.max(largeurPage, 1); // quand grossissement = 1
        const echellePage = Math.min(1, (pixelsParUnite * largeurEcran) / Math.max(largeurPage, 1));
        const lineaire = echelleDepart >= 1 ? 1 : entre0et1((echellePage - echelleDepart) / (1 - echelleDepart));
        const arrivee = lineaire * lineaire * (3 - 2 * lineaire); // départ et arrivée en douceur
        const hauteurEcranPixels = pixelsParUnite * hauteurEcran;
        // Haut de l'écran tant que la plongée n'a pas commencé : l'écran grossit autour de son centre.
        const milieuDepart = hauteur / 2 + (ECRAN.centreY - 0.5) * hauteurCadre;
        const hautDepart = milieuDepart - hauteurEcranPixels / 2;
        // Pendant la plongée : le haut de l'écran va, en ligne droite, de sa position au grossissement 1 jusqu'à
        // sa place dans le site. (Partir du haut « autour du centre » le faisait d'abord remonter, puis
        // redescendre : la page avait un léger aller-retour dans le cadre.)
        const hautAuRepos = milieuDepart - hauteurEcranPixels / grossissement / 2;
        const hautVoulu = arrivee === 0 ? hautDepart : hautAuRepos + (hautDansLeSite - hautAuRepos) * arrivee;
        const ecartX = ((ECRAN.centreX - 0.5) * (1 - arrivee) + decalage) * largeurCadre;
        const ecartY = hautVoulu + hauteurEcranPixels / 2 - hauteur / 2;
        ecran.getWorldPosition(centre);
        camera.aspect = largeur / hauteur;
        camera.position.set(centre.x - ecartX / pixelsParUnite, centre.y + ecartY / pixelsParUnite, centre.z + DISTANCE);
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld(true);

        rendu.render(scene, camera);

        // 5. Où l'écran tombe-t-il dans la zone ? On projette deux coins opposés de sa plaque : project()
        //    donne des coordonnées de -1 à 1, que l'on convertit en pixels.
        const { width, height } = (ecran.geometry as import("three").PlaneGeometry).parameters;
        coin.set(-width / 2, height / 2, 0).applyMatrix4(ecran.matrixWorld).project(camera);
        const gauche = ((coin.x + 1) / 2) * largeur;
        const haut = ((1 - coin.y) / 2) * hauteur;
        coin.set(width / 2, -height / 2, 0).applyMatrix4(ecran.matrixWorld).project(camera);
        return { gauche, haut, largeur: ((coin.x + 1) / 2) * largeur - gauche, hauteur: ((1 - coin.y) / 2) * hauteur - haut };
      };

      // Taille du canvas : au départ, puis à chaque changement de taille de la zone ou de la page.
      const adapter = () => {
        taille.largeur = conteneur.clientWidth;
        taille.hauteur = conteneur.clientHeight;
        rendu.setPixelRatio(ratioPixels(taille.largeur, taille.hauteur, 1.5));
        rendu.setSize(taille.largeur, taille.hauteur, false);
        mesurer();
        actualiser();
      };
      const observateur = new ResizeObserver(adapter);
      observateur.observe(conteneur);
      if (page.current) observateur.observe(page.current);
      adapter();
      setPret(true);

      nettoyer = () => {
        observateur.disconnect();
        dessiner.current = null;
        liberer();
        rendu.dispose();
        rendu.domElement.remove();
      };
      if (annule) nettoyer();
    })();

    return () => {
      annule = true;
      nettoyer();
    };
    // Effet joué une seule fois, à la création de la scène : actualiser lit toujours les valeurs du moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // À chaque défilement : on redessine, et on surveille la fin de la plongée.
  // null tant qu'aucun défilement n'a été vu : le premier ne sert qu'à prendre un point de départ. (Quand
  // l'introduction est ROUVERTE, on arrive directement en fin de plongée : sans cela, le premier geste, même
  // vers le haut, passait pour une descente et la refermait aussitôt.)
  const avancementPrecedent = useRef<number | null>(null);
  useMotionValueEvent(scrollYProgress, "change", (avancement) => {
    actualiser();
    setDebut(avancement < SEUIL_ENTETE);
    const precedent = avancementPrecedent.current;
    avancementPrecedent.current = avancement;
    const enPlace = pageEnPlace.current;
    const vientDArriver = enPlace && !enPlacePrecedent.current;
    enPlacePrecedent.current = enPlace;
    if (precedent === null) return;
    // Fin de la plongée : la page vient d'atteindre sa taille normale, à sa place. On ne referme l'introduction
    // qu'en DESCENDANT (pas en remontant). SEUIL_FIN reste en secours, si l'écran n'a pas pu être mesuré.
    if (avancement > precedent && (vientDArriver || (avancement >= SEUIL_FIN && precedent < SEUIL_FIN))) {
      try {
        sessionStorage.setItem(CLE_VUE, "1");
      } catch {
        // sessionStorage indisponible : tant pis, l'introduction rejouera à la prochaine arrivée.
      }
      surFin();
    }
  });

  return (
    // Zone haute de 3,6 écrans (2,6 écrans de défilement). Elle ne sert qu'à donner de la hauteur à faire
    // défiler : la page, fixe pendant l'introduction, n'est pas dans le flux. pointer-events-none : la zone ne
    // bloque pas les clics. -mt-6 : annule la marge haute de <main>, pour centrer l'appareil dès l'arrivée.
    // data-intro-debut : lu par une règle de globals.css (body:has(…)) qui masque l'en-tête du site.
    <div
      ref={zone}
      aria-hidden="true"
      data-intro-debut={debut ? "oui" : "non"}
      // 250svh de défilement (360 auparavant, jugé un peu long : ~11 crans de molette, ~6 maintenant). Toutes les
      // étapes de la chorégraphie sont des fractions de cette course : elles suivent sans autre réglage.
      className="pointer-events-none relative -mt-6 h-[250svh]"
    >
      {/* sticky top-0 : ce bloc reste collé en haut de l'écran tant qu'on défile dans la zone. */}
      <div ref={cadre} className="sticky top-0 flex h-svh items-center justify-center overflow-hidden">
        {/* Projecteurs : deux faisceaux doux qui descendent des coins de la scène vers l'appareil, derrière lui.
            Ils suivent l'opacité de la lumière de scène : ils s'éteignent avec elle quand on plonge dans l'écran.
            Le masque les fond sur les côtés (la scène a la largeur de la colonne : sans lui, ils seraient coupés
            net), en haut (sinon une ligne nette marquait le bord de la scène) et vers le bas. opacity-60 sur téléphone : l'écran est étroit, les deux faisceaux se recouvrent. */}
        <motion.div className="absolute inset-0" style={{ opacity: lumiereOpacite }}>
          <div className="absolute inset-0 overflow-hidden opacity-60 [mask-composite:intersect] [mask-image:linear-gradient(to_bottom,transparent,black_7rem,black_60%,transparent),linear-gradient(to_right,transparent,black_4rem,black_calc(100%-4rem),transparent)] sm:opacity-100">
            <Projecteurs />
          </div>
        </motion.div>

        {/* Lumière de scène. Un cadre invisible, de la taille et à la place de l'appareil, porte un calque bien
            plus grand que lui : une lueur derrière l'appareil et une tache de lumière au sol. (Un faisceau en cône a
            été essayé puis retiré : ses bords dessinaient deux bandes obliques de chaque côté.) */}
        <motion.div className="absolute aspect-[1210/1834] h-[min(70svh,62vw)]" style={{ opacity: lumiereOpacite }}>
          <span className="halo-scene absolute left-1/2 top-1/2 h-[220%] w-[300%] -translate-x-1/2 -translate-y-1/2" />
        </motion.div>

        {/* Le canvas de la scène 3D : il occupe tout le bloc, et apparaît en fondu (0,5 s) quand il est prêt. */}
        <div className={`absolute inset-0 transition-opacity duration-500 ${pret ? "opacity-100" : "opacity-0"}`}>
          <motion.div ref={toile} className="absolute inset-0" style={{ opacity: fonduScene }} />
        </div>

        {/* Traits de vitesse : de fins rayons qui partent du centre (dégradé conique répété). Un masque radial
            les efface au centre : on ne les voit que sur le pourtour, comme un effet de tunnel. */}
        <motion.span
          className="absolute aspect-square w-[160vmax] bg-[repeating-conic-gradient(from_0deg,transparent_0deg_5deg,color-mix(in_srgb,var(--color-texte)_55%,transparent)_5deg_5.4deg)] [mask-image:radial-gradient(circle,transparent_18%,black_60%)]"
          style={{ opacity: traitsOpacite, scale: traitsTaille }}
        />

        <motion.p className="etiquette absolute bottom-8 flex flex-col items-center gap-2" style={{ opacity: invitationOpacite }}>
          Fais défiler
          <span className="flex h-8 w-5 justify-center rounded-full border border-texte-doux pt-1.5">
            <span className="size-1 rounded-full bg-texte-doux motion-safe:animate-bounce" />
          </span>
        </motion.p>
      </div>
    </div>
  );
}

"use client";

// Introduction de la page d'accueil — un Pokédex géant, fermé à l'arrivée : en défilant, son volet s'ouvre,
// puis on plonge dans son écran, qui devient la page du site.
// L'appareil est fait de PHOTOS (images générées par l'utilisateur, détourées, dans public/pokedex) :
//   - ouvert.webp    : le corps de l'appareil, écran noir et vide ;
//   - ferme.webp     : le volet vu de l'extérieur ;
//   - volet-dos.webp : la face intérieure du volet (la même plaque en miroir, assombrie).
// Les trois ont exactement le même cadrage : on peut donc les superposer au pixel près.
//
// Technique : useScroll donne l'avancement du défilement (0 → 1) et useTransform le convertit en mouvement.
// Le volet tourne autour de sa charnière (rotateY) dans un espace en perspective, comme l'écran du MacBook
// du composant d'origine (Aceternity UI) tournait autour de la sienne.
//
// L'idée forte : ce que l'on voit dans l'écran de l'appareil est LA VRAIE PAGE du site, réduite à la taille de
// la dalle. Quand on plonge, elle grossit exactement comme l'écran, jusqu'à sa taille normale.
//
// Deux composants dans ce fichier :
//   - IntroPokedex (le parent) décide si l'introduction est affichée, et porte la vraie page ;
//   - ScenePokedex (l'enfant) dessine l'appareil et pilote l'animation tant que l'introduction est affichée.

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import Image from "next/image";
import { motion, useMotionValue, useMotionValueEvent, useScroll, useTransform, type MotionValue } from "motion/react";

type Props = {
  // La vraie page (titre, recherche, grille…), rendue par le serveur et transmise ici.
  children: ReactNode;
};

// Position de la dalle (l'écran noir) dans la photo, en parts de la largeur et de la hauteur de l'image.
// Valeurs mesurées sur ouvert.webp.
const DALLE = { gauche: 0.1733, haut: 0.2999, largeur: 0.6933, hauteur: 0.3614 };
// Centre de la dalle : c'est le point fixe de la plongée (transform-origin de l'appareil).
const CENTRE = { x: DALLE.gauche + DALLE.largeur / 2, y: DALLE.haut + DALLE.hauteur / 2 };

// Clé du sessionStorage : retient, le temps de la visite, que l'introduction a déjà été vue.
// (sessionStorage est vidé à la fermeture de l'onglet : à la visite suivante, elle rejoue.)
const CLE_VUE = "pokedex-intro-vue";
// Rien à écouter : la valeur n'est lue qu'une fois, à l'arrivée sur la page.
const sansAbonnement = () => () => {};

// À partir de cet avancement, la plongée est finie : on est dans le site, l'introduction se referme.
const SEUIL_FIN = 0.62;
// Pour ROUVRIR l'introduction, il faut insister : cumuler ce nombre de pixels de molette vers le haut,
// alors qu'on est déjà tout en haut de la page.
const EFFORT_POUR_ROUVRIR = 500;

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
  function changerEtat(suivant: "page" | "intro") {
    positionAvant.current = page.current?.getBoundingClientRect().top ?? null;
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
      window.scrollBy(0, page.current.getBoundingClientRect().top - positionAvant.current);
      positionAvant.current = null;
    }
  }, [introAffichee, opacite, taille, x, y, decoupe, clics]);

  // « Blocage » en haut de page : une fois dans le site, remonter s'arrête en haut de la page, comme sur
  // n'importe quel site. Pour revoir l'introduction à l'envers, il faut INSISTER avec la molette (ou le pavé
  // tactile) alors qu'on est déjà tout en haut. Un geste isolé ne suffit pas : le cumul retombe à zéro après
  // 300 ms sans mouvement.
  useEffect(() => {
    if (introAffichee || animationsReduites) return;
    let cumul = 0;
    let minuterie: ReturnType<typeof setTimeout> | undefined;
    function surMolette(evenement: WheelEvent) {
      if (window.scrollY > 0 || evenement.deltaY >= 0) {
        cumul = 0;
        return;
      }
      cumul -= evenement.deltaY;
      clearTimeout(minuterie);
      minuterie = setTimeout(() => (cumul = 0), 300);
      if (cumul >= EFFORT_POUR_ROUVRIR) {
        cumul = 0;
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
          surFin={() => changerEtat("page")}
        />
      )}

      {/* La vraie page. Elle reste TOUJOURS le même élément, que l'introduction soit affichée ou non : son contenu
          (champ de recherche, filtres, grille) n'est donc jamais recréé. relative z-10 : au-dessus de l'appareil.
          origin-top : pendant la plongée, elle grossit à partir de son bord haut, posé sur le haut de la dalle. */}
      <motion.div
        ref={page}
        className="relative z-10 flex origin-top flex-col gap-6"
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
  const appareil = useRef<HTMLDivElement>(null);

  // Dimensions lues dans la page (en pixels), nécessaires aux calculs. Rangées dans un ref : les mettre à jour
  // ne provoque pas de nouveau rendu.
  const mesures = useRef({ largeurAppareil: 0, hauteurAppareil: 0, hauteurFenetre: 0, largeurPage: 1, hauteurPage: 0, hautPage: 0 });

  const { scrollYProgress } = useScroll({ target: zone, offset: ["start start", "end end"] });

  // Le défilement est découpé en deux temps :
  //   1. de 3 % à 28 %  : le volet s'ouvre, l'appareil se redresse et se recentre ; l'écran s'allume ;
  //   2. de 30 % à 52 % : on PLONGE dans l'écran, de plus en plus vite, avec des traits de vitesse.

  // Le volet pivote sur sa charnière gauche : 0° fermé, -178° rabattu à plat sur le côté.
  const voletAngle = useTransform(scrollYProgress, [0.03, 0.24], [0, -178]);
  // Volet ouvert, l'appareil est presque deux fois plus large : on le décale à droite de 44 % de sa largeur
  // pour garder l'ensemble centré, puis on le ramène au centre AVANT la plongée.
  // (decalage est une part de la largeur de l'appareil ; appareilX en fait un pourcentage pour le style.)
  const decalage = useTransform(scrollYProgress, [0.03, 0.2, 0.28], [0, 0.44, 0]);
  const appareilX = useTransform(decalage, (part) => `${part * 100}%`);
  // Il est d'abord vu légèrement de biais, puis il se redresse face à nous.
  const appareilAngle = useTransform(scrollYProgress, [0, 0.24], [-16, 0]);
  // La plongée : l'appareil grossit jusqu'à 14 fois, lentement puis de plus en plus vite (1 → 3 → 14).
  const appareilTaille = useTransform(scrollYProgress, [0, 0.24, 0.3, 0.41, 0.52], [0.9, 1, 1, 3, 14]);
  // Traits de vitesse : ils apparaissent pendant la plongée et s'écartent du centre.
  const traitsOpacite = useTransform(scrollYProgress, [0.32, 0.43, 0.54], [0, 0.55, 0]);
  const traitsTaille = useTransform(scrollYProgress, [0.32, 0.54], [0.7, 2.6]);
  const invitationOpacite = useTransform(scrollYProgress, [0, 0.03], [1, 0]);

  // ---- La page calée dans l'écran ----
  // Pour l'avancement du moment, place la vraie page pour qu'elle occupe exactement la dalle : sa taille
  // (échelle), ses décalages, et la « fenêtre » qui la découpe au format de l'écran.
  function calerPage() {
    const m = mesures.current;
    if (m.largeurAppareil === 0) return; // pas encore mesuré
    const avancement = scrollYProgress.get();
    const grossissement = appareilTaille.get();
    // Taille de la dalle à l'écran, en pixels.
    const largeurDalle = DALLE.largeur * m.largeurAppareil * grossissement;
    const hauteurDalle = DALLE.hauteur * m.hauteurAppareil * grossissement;
    // La page est réduite pour avoir la largeur de la dalle ; jamais plus grande que sa taille normale.
    const echelle = Math.min(1, largeurDalle / m.largeurPage);
    // « fini » passe de 0 à 1 quand la page approche de sa taille normale : on relâche alors le calage,
    // et la page retrouve en douceur sa place naturelle dans le site.
    // (echelle >= 1 est testé à part : le calcul (1 - 0,8) / 0,2 donne 0,9999999999999998 et non 1, à cause des
    // arrondis des nombres à virgule. La page gardait alors une transformation et une découpe résiduelles.)
    const fini = echelle >= 1 ? 1 : entre0et1((echelle - 0.8) / 0.2);

    // Centre de la dalle dans la fenêtre : l'appareil est centré dans un bloc haut d'un écran.
    const centreY = m.hauteurFenetre / 2 + (CENTRE.y - 0.5) * m.hauteurAppareil;
    // Écart horizontal entre le milieu de la dalle et le milieu de la fenêtre : la dalle n'est pas tout à fait au
    // milieu de la photo, et l'appareil est encore décalé tant qu'il n'est pas revenu au centre.
    const decalageX = (CENTRE.x - 0.5 + decalage.get()) * m.largeurAppareil;
    const hautDalle = centreY - hauteurDalle / 2;
    // Position du haut de la page dans la fenêtre, à cause du défilement (sans transformation).
    const hautPage = m.hautPage - window.scrollY;

    // Fenêtre de découpe (clip-path), exprimée dans le repère de la page AVANT mise à l'échelle :
    // on garde une bande centrée de la largeur de la dalle, et la hauteur de la dalle depuis le haut.
    const cote = Math.max(0, (m.largeurPage - largeurDalle / echelle) / 2);
    const bas = Math.max(0, m.hauteurPage - hauteurDalle / echelle);

    valeurs.taille.set(echelle);
    // Décalages pour poser le haut de la page sur le haut de la dalle, et son milieu sur celui de la dalle.
    valeurs.x.set(decalageX * (1 - fini));
    valeurs.y.set((hautDalle - hautPage) * (1 - fini));
    // Plongée finie : plus aucune découpe, la page est une page normale.
    // Exception assumée à la règle « n'animer que transform et opacity » : clip-path est indispensable pour que
    // la page ne dépasse pas de l'écran de l'appareil. Elle ne sert que pendant la plongée.
    valeurs.decoupe.set(fini >= 1 ? "none" : `inset(0px ${cote}px ${bas}px ${cote}px round ${12 / echelle}px)`);
    // La page apparaît dans l'écran une fois l'appareil redressé (entre 24 % et 29 % du défilement).
    valeurs.opacite.set(entre0et1((avancement - 0.24) / 0.05));
    // Tant qu'elle n'a pas atteint sa taille normale, la page ne reçoit pas de clics (elle est en miniature,
    // posée par-dessus l'appareil).
    valeurs.clics.set(echelle >= 1 ? "auto" : "none");
  }

  // Mesures : au départ, puis à chaque changement de taille de la fenêtre ou de la page.
  useEffect(() => {
    function mesurer() {
      const a = appareil.current;
      const p = page.current;
      if (!a || !p) return;
      // offsetTop additionnés jusqu'en haut du document : position de la page SANS tenir compte de ses transformations.
      let haut = 0;
      for (let element: HTMLElement | null = p; element; element = element.offsetParent as HTMLElement | null) haut += element.offsetTop;
      mesures.current = {
        largeurAppareil: a.offsetWidth,
        hauteurAppareil: a.offsetHeight,
        hauteurFenetre: window.innerHeight,
        largeurPage: p.offsetWidth,
        hauteurPage: p.offsetHeight,
        hautPage: haut,
      };
      calerPage();
    }
    mesurer();
    // ResizeObserver : on remesure si la page change de taille (images chargées, résultats d'une recherche…).
    const observateur = new ResizeObserver(mesurer);
    if (page.current) observateur.observe(page.current);
    window.addEventListener("resize", mesurer);
    return () => {
      observateur.disconnect();
      window.removeEventListener("resize", mesurer);
    };
    // Effet joué une seule fois, à la création de la scène : calerPage lit toujours les valeurs du moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // À chaque défilement : on recale la page, et on surveille la fin de la plongée.
  const avancementPrecedent = useRef(0);
  useMotionValueEvent(scrollYProgress, "change", (avancement) => {
    calerPage();
    const precedent = avancementPrecedent.current;
    avancementPrecedent.current = avancement;
    // On ne referme l'introduction qu'en DESCENDANT au-delà du seuil (pas en le retraversant vers le haut).
    if (avancement >= SEUIL_FIN && precedent < SEUIL_FIN) {
      try {
        sessionStorage.setItem(CLE_VUE, "1");
      } catch {
        // sessionStorage indisponible : tant pis, l'introduction rejouera à la prochaine arrivée.
      }
      surFin();
    }
  });

  return (
    // Zone haute de 3 écrans (2 écrans de défilement). -mb-[190svh] : la vraie page, placée juste après, REMONTE
    // de presque deux écrans par-dessus la zone. Elle est donc déjà en haut de la fenêtre quand la plongée se
    // termine : elle n'a plus qu'à finir de grossir. pointer-events-none : la zone ne bloque pas les clics.
    // -mt-6 : annule la marge haute de la page, pour que l'appareil soit centré dans la fenêtre dès l'arrivée.
    <div ref={zone} aria-hidden="true" className="pointer-events-none relative -mb-[190svh] -mt-6 h-[300svh]">
      {/* perspective : donne la profondeur aux rotations des enfants (sans elle, le volet s'aplatirait). */}
      <div className="sticky top-0 flex h-svh items-center justify-center overflow-hidden [perspective:1800px]">
        {/* L'appareil : mêmes proportions que les photos (1210 × 1834). Sa hauteur est bornée par la largeur de
            l'écran (62vw) : volet ouvert, il est deux fois plus large et doit encore tenir sur un téléphone.
            transformOrigin : le centre de la dalle, point qui reste immobile pendant la plongée.
            preserve-3d : ses enfants (le volet) tournent dans le même espace 3D que lui. */}
        <motion.div
          ref={appareil}
          className="relative aspect-[1210/1834] h-[min(70svh,62vw)] [transform-style:preserve-3d]"
          style={{ x: appareilX, rotateY: appareilAngle, scale: appareilTaille, transformOrigin: `${CENTRE.x * 100}% ${CENTRE.y * 100}%` }}
        >
          {/* Ombre portée au sol */}
          <span className="absolute -bottom-[5%] left-[10%] h-[5%] w-[84%] rounded-[100%] bg-encre opacity-90 blur-xl" />

          {/* ---- Le corps : la photo de l'appareil ouvert. sizes="100vw" : on demande la grande version de
              l'image, car elle est très agrandie pendant la plongée. ---- */}
          <Image src="/pokedex/ouvert.webp" alt="" fill sizes="100vw" priority className="object-contain" />

          {/* La dalle : un calque posé exactement sur l'écran noir de la photo. Il a la couleur de fond du site
              (bg-fond) : la vraie page, affichée par-dessus, a ainsi le même fond qu'en vrai. */}
          <span
            className="absolute rounded-[1.5%] bg-fond"
            style={{ left: `${DALLE.gauche * 100}%`, top: `${DALLE.haut * 100}%`, width: `${DALLE.largeur * 100}%`, height: `${DALLE.hauteur * 100}%` }}
          />

          {/* ---- Le volet : la photo de l'appareil fermé, posée sur le corps ----
              origin-[5.6%_50%] : il tourne autour de la charnière (à 5,6 % du bord gauche de l'image). */}
          <motion.div className="absolute inset-0 origin-[5.6%_50%] [transform-style:preserve-3d]" style={{ rotateY: voletAngle }}>
            {/* Face extérieure. backface-visibility: hidden → elle disparaît dès qu'on la voit de dos. */}
            <Image src="/pokedex/ferme.webp" alt="" fill sizes="(min-width: 640px) 450px, 45vw" priority className="object-contain [backface-visibility:hidden]" />
            {/* Face intérieure : visible seulement de dos. L'image est déjà en miroir ; rotateY(180°) la remet à l'endroit. */}
            <Image
              src="/pokedex/volet-dos.webp"
              alt=""
              fill
              sizes="(min-width: 640px) 450px, 45vw"
              className="object-contain [backface-visibility:hidden] [transform:rotateY(180deg)]"
            />
          </motion.div>
        </motion.div>

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

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
// la dalle. Quand on plonge, elle grossit exactement comme l'écran, jusqu'à sa taille normale : on n'entre pas
// dans une image, on entre dans le site.

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import Image from "next/image";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "motion/react";

type Props = {
  // La vraie page (titre, grille…), rendue par le serveur et transmise ici : c'est elle qu'on affiche dans l'écran.
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

// Borne une valeur entre 0 et 1.
const entre0et1 = (valeur: number) => Math.min(1, Math.max(0, valeur));

export default function IntroPokedex({ children }: Props) {
  const zone = useRef<HTMLDivElement>(null);
  const appareil = useRef<HTMLDivElement>(null);
  const page = useRef<HTMLDivElement>(null);
  const animationsReduites = useReducedMotion();

  // L'introduction ne joue qu'UNE fois par visite. Revenir sur l'accueil (depuis une fiche, par exemple) affiche
  // directement la page : il serait pénible de retraverser le Pokédex à chaque fois.
  // useSyncExternalStore (comme pour les stores du site) : le serveur ne connaît pas le sessionStorage, il répond
  // donc toujours « pas encore vue » ; le navigateur lit la vraie valeur juste après, sans erreur d'hydratation.
  // La valeur lue est gardée dans un ref : elle ne change plus tant que cette page reste affichée, même quand
  // on la marque comme vue un peu plus bas (sinon l'introduction disparaîtrait sous les yeux du visiteur).
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

  // Dimensions lues dans la page (en pixels), nécessaires aux calculs. Rangées dans un ref : les mettre à jour
  // ne provoque pas de nouveau rendu.
  const mesures = useRef({ largeurAppareil: 0, hauteurAppareil: 0, hauteurFenetre: 0, largeurPage: 1, hauteurPage: 0, hautPage: 0 });
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
    }
    mesurer();
    // ResizeObserver : on remesure si la fenêtre ou la page change de taille (images chargées, rotation du téléphone…).
    const observateur = new ResizeObserver(mesurer);
    if (page.current) observateur.observe(page.current);
    window.addEventListener("resize", mesurer);
    return () => {
      observateur.disconnect();
      window.removeEventListener("resize", mesurer);
    };
  }, []);

  const { scrollYProgress } = useScroll({ target: zone, offset: ["start start", "end end"] });

  // Une fois la plongée terminée (60 % du défilement), on note que l'introduction a été vue.
  useMotionValueEvent(scrollYProgress, "change", (avancement) => {
    if (avancement < 0.6) return;
    try {
      sessionStorage.setItem(CLE_VUE, "1");
    } catch {
      // sessionStorage indisponible : tant pis, l'introduction rejouera.
    }
  });

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
  // La vraie page apparaît dans l'écran une fois l'appareil redressé et recentré.
  const pageOpacite = useTransform(scrollYProgress, [0.24, 0.29], [0, 1]);

  // ---- La page calée dans l'écran ----
  // Pour un avancement donné, calcule comment placer la vraie page pour qu'elle occupe exactement la dalle :
  // sa taille (échelle), son décalage vertical, et la « fenêtre » qui la découpe au format de l'écran.
  function calerPage() {
    const m = mesures.current;
    // Sur le serveur (premier rendu), il n'y a ni fenêtre ni mesures : la page est rendue telle quelle.
    if (typeof window === "undefined" || m.largeurAppareil === 0) return { echelle: 1, x: 0, y: 0, decoupe: "none" };
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
    // Décalages pour poser le haut de la page sur le haut de la dalle, et son milieu sur celui de la dalle.
    const y = (hautDalle - hautPage) * (1 - fini);
    const x = decalageX * (1 - fini);

    // Fenêtre de découpe (clip-path), exprimée dans le repère de la page AVANT mise à l'échelle :
    // on garde une bande centrée de la largeur de la dalle, et la hauteur de la dalle depuis le haut.
    const visibleL = largeurDalle / echelle;
    const visibleH = hauteurDalle / echelle;
    const cote = Math.max(0, (m.largeurPage - visibleL) / 2);
    const bas = Math.max(0, m.hauteurPage - visibleH);
    // Plongée finie : plus aucune découpe, la page est une page normale.
    const decoupe = fini >= 1 ? "none" : `inset(0px ${cote}px ${bas}px ${cote}px round ${12 / echelle}px)`;
    return { echelle, x, y, decoupe };
  }
  // useTransform(fonction) : recalculé à chaque changement des valeurs lues avec .get() (ici le défilement).
  const pageTaille = useTransform(() => (scrollYProgress.get(), calerPage().echelle));
  const pageX = useTransform(() => (scrollYProgress.get(), calerPage().x));
  const pageY = useTransform(() => (scrollYProgress.get(), calerPage().y));
  // Exception assumée à la règle « n'animer que transform et opacity » : clip-path est indispensable pour que la
  // page ne dépasse pas de l'écran de l'appareil. Elle ne sert que pendant la plongée.
  const pageDecoupe = useTransform(() => (scrollYProgress.get(), calerPage().decoupe));
  // Tant que la page n'a pas atteint sa taille normale, elle ne reçoit pas de clics (elle est posée par-dessus
  // l'appareil, en miniature). Dès qu'elle est à sa taille, tout redevient cliquable — y compris quand on remonte
  // en haut de la page pour utiliser la recherche et les filtres.
  const pageClics = useTransform(() => (scrollYProgress.get(), calerPage().echelle >= 1 ? "auto" : "none"));

  // Animations réduites, ou introduction déjà vue pendant cette visite : la page est affichée directement.
  // (Même mise en page que le bloc animé du bas : une colonne avec des espaces de 6.)
  if (animationsReduites || dejaVue) return <div className="flex flex-col gap-6">{children}</div>;

  return (
    <>
      {/* Zone haute de 3 écrans (2 écrans de défilement). -mb-[190svh] : la vraie page, placée juste après, REMONTE
          de presque deux écrans par-dessus la zone. Elle est donc déjà en haut de la fenêtre quand la plongée se
          termine : elle n'a plus qu'à finir de grossir. pointer-events-none : la zone ne bloque pas les clics.
          -mt-6 : annule la marge haute de la page, pour que l'appareil soit centré dans la fenêtre dès l'arrivée. */}
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

      {/* La vraie page. relative z-10 : au-dessus de l'appareil. origin-top : elle grossit à partir de son bord haut,
          que le calage pose sur le haut de la dalle. */}
      <motion.div
        ref={page}
        className="relative z-10 flex origin-top flex-col gap-6"
        style={{ opacity: pageOpacite, scale: pageTaille, x: pageX, y: pageY, clipPath: pageDecoupe, pointerEvents: pageClics }}
      >
        {children}
      </motion.div>
    </>
  );
}

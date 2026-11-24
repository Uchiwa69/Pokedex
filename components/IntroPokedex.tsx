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
  const cadre = useRef<HTMLDivElement>(null); // le bloc collé en haut de l'écran, qui contient le canvas
  const toile = useRef<HTMLDivElement>(null);
  // La scène 3D, une fois chargée : une fonction qui la dessine pour un avancement donné et renvoie le
  // rectangle de l'écran de l'appareil. Rangée dans un ref : elle ne déclenche pas de rendu React.
  const dessiner = useRef<((avancement: number) => Rectangle | null) | null>(null);
  const [pret, setPret] = useState(false);

  const { scrollYProgress } = useScroll({ target: zone, offset: ["start start", "end end"] });

  // Traits de vitesse : ils apparaissent pendant la plongée et s'écartent du centre.
  const traitsOpacite = useTransform(scrollYProgress, [0.32, 0.43, 0.54], [0, 0.55, 0]);
  const traitsTaille = useTransform(scrollYProgress, [0.32, 0.54], [0.7, 2.6]);
  const invitationOpacite = useTransform(scrollYProgress, [0, 0.03], [1, 0]);
  // Opacité de la scène 3D, réglée par calerPage.
  const fonduScene = useMotionValue(1);
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
    // Position et taille de la page SANS ses transformations (mesurées à l'avance, voir mesurer), moins le défilement.
    const { largeurPage, hauteurPage, gauche } = mesures.current;
    if (largeurPage === 0) return;
    const haut = mesures.current.haut - window.scrollY;
    const zoneCadre = c.getBoundingClientRect();

    // La page est réduite pour avoir la largeur de l'écran ; jamais plus grande que sa taille normale.
    const echelle = Math.min(1, ecran.largeur / largeurPage);
    // « fini » passe de 0 à 1 quand la page approche de sa taille normale : on relâche alors le calage,
    // et la page retrouve en douceur sa place naturelle dans le site.
    // (echelle >= 1 est testé à part : le calcul (1 - 0,8) / 0,2 donne 0,9999999999999998 et non 1, à cause des
    // arrondis des nombres à virgule. La page gardait alors une transformation et une découpe résiduelles.)
    const fini = echelle >= 1 ? 1 : entre0et1((echelle - 0.8) / 0.2);

    // Décalages pour poser le milieu de la page sur celui de l'écran, et son haut sur le haut de l'écran.
    const milieuEcran = zoneCadre.left + ecran.gauche + ecran.largeur / 2;
    const hautEcran = zoneCadre.top + ecran.haut;
    valeurs.taille.set(echelle);
    // L'appareil s'efface à mesure que la page atteint sa taille normale. Sans cela, sur un téléphone (écran en
    // hauteur), la page arrivait à sa taille avant que l'écran de l'appareil ne couvre toute la fenêtre : une
    // bande de plastique rouge restait visible sous les cartes.
    fonduScene.set(1 - fini);
    valeurs.x.set((milieuEcran - (gauche + largeurPage / 2)) * (1 - fini));
    valeurs.y.set((hautEcran - haut) * (1 - fini));

    // Fenêtre de découpe (clip-path), exprimée dans le repère de la page AVANT mise à l'échelle :
    // on garde une bande centrée de la largeur de l'écran, et la hauteur de l'écran depuis le haut.
    const cote = Math.max(0, (largeurPage - ecran.largeur / echelle) / 2);
    const bas = Math.max(0, hauteurPage - ecran.hauteur / echelle);
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
  const mesures = useRef({ largeurPage: 0, hauteurPage: 0, haut: 0, gauche: 0 });
  function mesurer() {
    const p = page.current;
    if (!p) return;
    // offsetTop / offsetLeft additionnés jusqu'en haut du document : position SANS les transformations.
    let haut = 0;
    let gauche = 0;
    for (let element: HTMLElement | null = p; element; element = element.offsetParent as HTMLElement | null) {
      haut += element.offsetTop;
      gauche += element.offsetLeft;
    }
    mesures.current = { largeurPage: p.offsetWidth, hauteurPage: p.offsetHeight, haut, gauche };
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
      // défilement faisait saccader la plongée, pour un gain de netteté invisible en mouvement.
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

        // 4. Place à l'écran. Comme avec les photos, le centre de l'écran de l'appareil est le point fixe de la
        //    plongée : il reste à (décalage ; léger écart vertical) du centre de la fenêtre. On déplace la
        //    caméra SANS la tourner : l'écran reste bien de face, donc parfaitement rectangulaire.
        const decalage = transform(avancement, COURBE_DECALAGE.avancement, COURBE_DECALAGE.valeur);
        const ecartX = (ECRAN.centreX - 0.5 + decalage) * largeurCadre;
        const ecartY = (ECRAN.centreY - 0.5) * hauteurCadre;
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
  const avancementPrecedent = useRef(0);
  useMotionValueEvent(scrollYProgress, "change", (avancement) => {
    actualiser();
    setDebut(avancement < SEUIL_ENTETE);
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
    // data-intro-debut : lu par une règle de globals.css (body:has(…)) qui masque l'en-tête du site.
    <div
      ref={zone}
      aria-hidden="true"
      data-intro-debut={debut ? "oui" : "non"}
      className="pointer-events-none relative -mb-[190svh] -mt-6 h-[300svh]"
    >
      {/* sticky top-0 : ce bloc reste collé en haut de l'écran tant qu'on défile dans la zone. */}
      <div ref={cadre} className="sticky top-0 flex h-svh items-center justify-center overflow-hidden">
        {/* Lumière de scène. Un cadre invisible, de la taille et à la place de l'appareil, porte deux calques bien
            plus grands que lui : le faisceau qui tombe d'en haut, puis le halo et la tache de lumière au sol. */}
        <motion.div className="absolute aspect-[1210/1834] h-[min(70svh,62vw)]" style={{ opacity: lumiereOpacite }}>
          <span className="faisceau-scene absolute left-1/2 top-1/2 h-[220%] w-[300%] -translate-x-1/2 -translate-y-1/2" />
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

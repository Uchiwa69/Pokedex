// Éclat plein écran joué quand on choisit un type dans les filtres de l'accueil : le même shader que la
// carte 3D de la fiche, mais en mode « éclat » (il naît sous la tuile cliquée, envahit l'écran, s'éteint).
//
// Un seul « moteur » pour tout le site : un canvas WebGL posé au-dessus de la page, créé à la première
// demande puis réutilisé. Le recréer à chaque clic coûterait cher (contexte graphique + compilation).
// three.js et les shaders ne sont téléchargés qu'à ce moment-là (import() à la demande).
// Sans WebGL, ou tant que le moteur n'est pas prêt, jouerEclat renvoie false : l'appelant joue alors
// l'effet CSS d'origine (components/EffetType.tsx).

import type { NomType } from "@/lib/types";

type Point = { x: number; y: number }; // en pixels dans la fenêtre

type Moteur = {
  preparer: (type: NomType) => void;
  jouer: (type: NomType, origine: Point, duree: number) => void;
};

// Force de l'éclat (1 = celle de la carte).
const FORCE_ECLAT = 1;
// Distance, en hauteurs d'écran, que l'onde parcourt avant de commencer à s'éteindre (réglage des shaders).
const PORTEE_ONDE = 1.15;

let moteur: Moteur | null = null;
let chargement: Promise<void> | null = null;

async function creerMoteur(): Promise<Moteur> {
  const [THREE, effets] = await Promise.all([import("three"), import("./index")]);

  const toile = document.createElement("canvas");
  toile.setAttribute("aria-hidden", "true"); // purement décoratif
  // Au-dessus de la page mais sous les symboles de EffetType (z-50), et il ne capte aucun clic.
  toile.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:49;display:none";
  // Lève une erreur si la 3D n'est pas disponible : elle est rattrapée dans preparerEclat.
  const rendu = new THREE.WebGLRenderer({ canvas: toile, alpha: true, antialias: false });
  // Un pixel de dessin par pixel CSS, même sur un écran dense : l'éclat est fait de formes douces, et un
  // téléphone a trois fois moins de pixels à calculer.
  rendu.setPixelRatio(1);
  rendu.setClearColor(0x000000, 0); // fond transparent
  document.body.appendChild(toile);

  // Un rectangle qui couvre exactement l'écran, vu par une caméra sans perspective.
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geometrie = new THREE.PlaneGeometry(2, 2);
  const plan = new THREE.Mesh(geometrie);
  scene.add(plan);

  const qualite = window.matchMedia("(pointer: coarse)").matches ? 0.5 : 1;
  const naissance = performance.now();

  // Un matériau par type, fabriqué à la première demande puis gardé.
  function fabriquer(type: NomType) {
    const teinte = getComputedStyle(document.documentElement).getPropertyValue(`--color-type-${type}`).trim() || "#aab6ff";
    const couleur = new THREE.Color(teinte);
    couleur.convertLinearToSRGB(); // valeurs d'écran, comme pour la carte (voir Carte3D)
    const uniformes = { ...effets.creerUniformes([couleur.r, couleur.g, couleur.b], effets.ZONES_FACE), uEchelle: { value: 1 } };
    uniformes.uModeEclat.value = 1;
    uniformes.uAttenuationZones.value = 0;
    uniformes.uQualite.value = qualite;
    uniformes.uForce.value = FORCE_ECLAT;
    const materiau = new THREE.ShaderMaterial({
      ...effets.assemblerEclat(type),
      uniforms: uniformes,
      blending: THREE.NoBlending, // le pixel calculé est écrit tel quel dans le canvas
      depthTest: false,
      depthWrite: false,
    });
    return { materiau, uniformes };
  }
  const materiaux = new Map<NomType, ReturnType<typeof fabriquer>>();
  function materiauDe(type: NomType) {
    let trouve = materiaux.get(type);
    if (!trouve) {
      trouve = fabriquer(type);
      materiaux.set(type, trouve);
    }
    return trouve;
  }

  let image = 0; // numéro de la prochaine image demandée, pour pouvoir l'annuler

  return {
    // Compile le programme du type à l'avance, en arrière-plan, dans une scène à part (pour ne pas
    // toucher à un éclat en cours) : au clic, il n'y a plus rien à attendre.
    preparer(type) {
      if (materiaux.has(type)) return;
      const essai = new THREE.Scene();
      essai.add(new THREE.Mesh(geometrie, materiauDe(type).materiau));
      rendu.compileAsync(essai, camera).catch(() => {});
    },

    jouer(type, origine, duree) {
      cancelAnimationFrame(image); // un clic pendant un éclat : le nouveau le remplace
      const largeur = window.innerWidth;
      const hauteur = window.innerHeight;
      rendu.setSize(largeur, hauteur, false);
      const { materiau, uniformes } = materiauDe(type);
      plan.material = materiau;
      uniformes.uProportions.value = largeur / hauteur;
      // Le point de départ, de 0 à 1 ; l'écran compte de haut en bas, le shader de bas en haut.
      const ox = origine.x / largeur;
      const oy = 1 - origine.y / hauteur;
      uniformes.uOrigine.value = [ox, oy];
      // Distance de l'origine au coin d'écran le plus éloigné, en hauteurs d'écran (d'où « × proportions »
      // sur la largeur). Si elle dépasse la portée de l'onde, on réduit l'échelle d'autant.
      const proportions = largeur / hauteur;
      const plusLoin = Math.hypot(Math.max(ox, 1 - ox) * proportions, Math.max(oy, 1 - oy));
      uniformes.uEchelle.value = Math.min(1, PORTEE_ONDE / plusLoin);
      toile.style.display = "block";

      const debut = performance.now();
      const dessiner = (maintenant: number) => {
        const progression = (maintenant - debut) / duree;
        if (progression >= 1) {
          rendu.clear();
          toile.style.display = "none";
          return;
        }
        uniformes.uProgression.value = Math.max(progression, 0);
        uniformes.uTemps.value = (maintenant - naissance) / 1000;
        rendu.render(scene, camera);
        image = requestAnimationFrame(dessiner);
      };
      image = requestAnimationFrame(dessiner);
    },
  };
}

// Animations réduites : pas d'éclat en shader, l'effet CSS se limite déjà à un fondu de couleur.
function animationsReduites() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// À appeler dès que l'on s'apprête à cliquer (survol, focus) : télécharge et crée le moteur, puis
// compile le programme du type visé.
export function preparerEclat(type?: NomType) {
  if (animationsReduites()) return;
  chargement ??= creerMoteur()
    .then((cree) => {
      moteur = cree;
    })
    .catch(() => {}); // pas de WebGL : moteur reste null, l'effet CSS sert de repli
  if (type) chargement.then(() => moteur?.preparer(type));
}

// Joue l'éclat du type depuis « origine ». Renvoie false s'il n'a pas pu partir (moteur pas encore prêt,
// pas de WebGL, animations réduites) : à l'appelant de jouer l'effet de repli.
export function jouerEclat(type: NomType, origine: Point, duree: number) {
  if (animationsReduites()) return false;
  if (!moteur) {
    preparerEclat(type); // ce sera prêt pour le prochain clic
    return false;
  }
  moteur.jouer(type, origine, duree);
  return true;
}

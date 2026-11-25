"use client";

// Carte holographique en 3D : une carte en volume que l'on fait tourner à 360°, avec des reflets
// irisés qui changent selon l'angle de vue. three.js est utilisé directement : la scène est créée
// dans un useEffect, et la bibliothèque n'est téléchargée que lorsque ce composant s'affiche.

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { TEINTE_OR, type AttaqueCarte, type StyleCarte } from "@/lib/carte-perso";
import { dessinerDos, dessinerFace, HAUTEUR, miseEnPage, type DonneesCarte } from "@/lib/carte3d";
import type { ZonesCarte } from "@/lib/effets-types";
import type { Motif } from "@/lib/effets-types/feuille";
import { estUnType } from "@/lib/types";

type Props = {
  illustration: string | null; // adresse de l'image déjà affichée sur la fiche
  numero: string;
  nom: string;
  types: string[]; // libellés français
  typePrincipal: string; // clé anglaise ("fire"), pour lire la couleur --color-type-fire
  mesures: string;
  // Carte personnalisée (atelier). Absent sur la fiche : la carte reste alors celle d'origine.
  // Quand il change, la carte est mise à jour SUR PLACE (texture redessinée, réglages des shaders),
  // sans recréer la scène 3D : pas de clignotement à chaque modification.
  perso?: PersoCarte;
  // Prévenir le parent quand la carte est affichée, ou quand la 3D est indisponible.
  surPret?: () => void;
  surEchec?: () => void;
};

// Ce que l'atelier peut changer sur la carte.
export type PersoCarte = {
  nom: string; // nom ou surnom écrit sur la carte
  illustration: string | null; // illustration normale ou chromatique
  style: StyleCarte;
  motif: Motif | null; // motif de la feuille holographique ; null = pas de feuille
  typeEffet: string; // clé anglaise du type : il donne l'effet animé et la couleur de la carte
  attaques: AttaqueCarte[];
};

type Commandes = { retourner: () => void; recentrer: () => void; tourner: (degres: number) => void };

// Programme exécuté par la carte graphique pour chaque pixel du reflet (langage GLSL).
// Le reflet est calculé comme un VRAI reflet : une lumière placée près de l'œil, dont l'éclat apparaît
// là où la surface la renvoie vers l'œil. La carte est traitée comme très légèrement bombée (comme une
// vraie carte) : l'éclat forme donc un trait fin, qui glisse sur elle dès qu'elle bouge, au repos
// comme quand on la fait tourner.
const SOMMETS = `
  varying vec2 vUv;
  varying vec3 vNormale;   // direction de la surface, dans la scène
  varying vec3 vAxeX;      // largeur de la carte, dans la scène
  varying vec3 vAxeY;      // hauteur de la carte, dans la scène
  varying vec3 vPosition;  // position du point, dans la scène
  void main() {
    vUv = uv;
    mat3 orientation = mat3(modelMatrix);
    vNormale = orientation * normal;
    vAxeX = orientation * vec3(1.0, 0.0, 0.0);
    vAxeY = orientation * vec3(0.0, 1.0, 0.0);
    vec4 position_scene = modelMatrix * vec4(position, 1.0);
    vPosition = position_scene.xyz;
    gl_Position = projectionMatrix * viewMatrix * position_scene;
  }
`;
const PIXELS = `
  varying vec2 vUv;
  varying vec3 vNormale;
  varying vec3 vAxeX;
  varying vec3 vAxeY;
  varying vec3 vPosition;
  uniform float uForce;
  void main() {
    // Surface légèrement bombée : la normale penche un peu vers les bords. Le terme en vUv.y incline
    // le trait en diagonale.
    float penche = (vUv.x - 0.5) + (vUv.y - 0.5) * 0.35;
    vec3 normale = normalize(vNormale + vAxeX * penche * 0.7 + vAxeY * (vUv.y - 0.5) * 0.1);
    vec3 regard = normalize(cameraPosition - vPosition);   // du point vers l'œil
    // La lumière accompagne le regard : elle est donnée par rapport à la CAMÉRA (un peu à gauche, vers l'œil),
    // puis convertie en direction de la scène (vecteur × matrice = rotation inverse de la caméra).
    // Fixe dans la scène, elle n'éclairait que la face avant : le dos n'avait aucun reflet quand on
    // faisait tourner la carte à la souris.
    vec3 lumiere = normalize(vec3(-0.45, 0.06, 1.0) * mat3(viewMatrix));
    // Le reflet est maximal quand la surface fait face à la direction à mi-chemin entre la lumière
    // et le regard (modèle de Blinn-Phong). Plus l'exposant est grand, plus le trait est fin.
    float alignement = max(dot(normale, normalize(lumiere + regard)), 0.0);
    float eclat = pow(alignement, 420.0);   // le trait
    float voile = pow(alignement, 45.0);    // halo très léger autour
    // Le bord du trait se teinte à peine, comme sur une surface irisée.
    vec3 irise = 0.5 + 0.5 * cos(6.2831 * (penche * 1.5 + vec3(0.0, 0.33, 0.67)));
    vec3 couleur = mix(vec3(1.0), irise, 0.3 * (1.0 - eclat));
    // Un peu de brillance en vue rasante (effet de Fresnel).
    float rasant = pow(1.0 - max(dot(normalize(vNormale), regard), 0.0), 3.0);
    gl_FragColor = vec4(couleur, (eclat * 0.36 + voile * 0.05 + rasant * 0.14) * uForce);
  }
`;

// Rend la main au navigateur un instant. Entre deux étapes lourdes, cela lui laisse le temps de
// réagir à un clic ou à un défilement : la préparation de la carte ne bloque plus la page d'un seul bloc.
const souffler = () => new Promise<void>((resoudre) => setTimeout(resoudre, 0));

// Attend que la page ait fini de se charger : la carte 3D est un plus, ses téléchargements ne doivent
// pas ralentir l'affichage du contenu principal de la fiche.
function attendreChargement() {
  return new Promise<void>((resoudre) => {
    if (document.readyState === "complete") resoudre();
    else window.addEventListener("load", () => resoudre(), { once: true });
  });
}

// Attend que le navigateur soit inoccupé, avant un travail lourd pour le processeur.
function attendreInoccupe() {
  return new Promise<void>((resoudre) => {
    if ("requestIdleCallback" in window) requestIdleCallback(() => resoudre(), { timeout: 1000 });
    else setTimeout(resoudre, 200); // Safari ne connaît pas requestIdleCallback
  });
}

// Charge l'illustration comme une image ordinaire (null si elle est absente ou en erreur).
function chargerImage(adresse: string | null) {
  return new Promise<HTMLImageElement | null>((resoudre) => {
    if (!adresse) return resoudre(null);
    const element = new Image();
    element.onload = () => resoudre(element);
    element.onerror = () => resoudre(null);
    element.src = adresse;
  });
}

// Petit bouton rond de la barre de commandes (44 px : assez grand pour le doigt).
const BOUTON_ROND = "flex size-11 items-center justify-center rounded-full text-texte-doux hover:bg-piste hover:text-texte";

export default function Carte3D({ illustration, numero, nom, types, typePrincipal, mesures, perso, surPret, surEchec }: Props) {
  const refConteneur = useRef<HTMLDivElement>(null);
  const refCommandes = useRef<Commandes | null>(null);
  // La personnalisation est gardée dans un ref (lue par la scène à sa création), et la fonction qui
  // l'applique à une scène déjà créée aussi : à chaque changement, on l'appelle sans rien reconstruire.
  const refPerso = useRef(perso);
  const refAppliquer = useRef<((p: PersoCarte) => Promise<void>) | null>(null);
  useEffect(() => {
    refPerso.current = perso;
    if (perso) refAppliquer.current?.(perso);
  }, [perso]);
  const animationsReduites = useReducedMotion();
  // Les fonctions reçues du parent sont gardées dans un ref : la scène 3D n'est pas recréée quand elles changent.
  const refRappels = useRef({ surPret, surEchec });
  useEffect(() => {
    refRappels.current = { surPret, surEchec };
  }, [surPret, surEchec]);
  const refReduit = useRef(animationsReduites);
  useEffect(() => {
    refReduit.current = animationsReduites;
  }, [animationsReduites]);

  const [etat, setEtat] = useState<"chargement" | "pret" | "erreur">("chargement");
  // Les types sont réunis en une chaîne : une dépendance stable pour l'effet (un tableau serait neuf à chaque rendu).
  const typesTexte = types.join("|");

  useEffect(() => {
    const conteneur = refConteneur.current;
    if (!conteneur) return;
    let annule = false;
    let nettoyer = () => {};

    (async () => {
      await attendreChargement();
      if (annule) return;

      // Couleur du type et police des titres, lues dans les variables CSS du site.
      const styles = getComputedStyle(document.documentElement);
      const teinte = styles.getPropertyValue(`--color-type-${typePrincipal}`).trim() || "#aab6ff";
      const policeTitre = getComputedStyle(document.body).getPropertyValue("--font-chakra").trim() || "system-ui";

      // L'illustration passe par l'optimiseur d'images de Next (/_next/image) : elle vient alors de NOTRE
      // site (pas besoin d'autorisation spéciale pour la recopier dans un canvas), dans un format plus léger,
      // et c'est souvent le fichier déjà téléchargé pour l'illustration d'attente (donc déjà en cache).
      const adresseImage = illustration ? `/_next/image?url=${encodeURIComponent(illustration)}&w=640&q=75` : null;

      // Tout ce qu'il faut télécharger part EN MÊME TEMPS (Promise.all) : three.js, ses contrôles,
      // l'image et la police. Avant, chaque téléchargement attendait la fin du précédent.
      const [THREE, { OrbitControls }, effets, feuilles, image] = await Promise.all([
        import("three"),
        import("three/examples/jsm/controls/OrbitControls.js"),
        import("@/lib/effets-types"), // les effets par type, chargés à la demande comme three.js
        import("@/lib/effets-types/feuille"), // la feuille holographique (cartes de l'atelier)
        chargerImage(adresseImage),
        document.fonts.load(`700 64px ${policeTitre}`).catch(() => {}),
      ]);
      // Créer la scène est un travail lourd : on attend un moment calme pour ne pas gêner un clic ou un défilement.
      await attendreInoccupe();
      if (annule) return;

      let rendu: import("three").WebGLRenderer;
      try {
        rendu = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch {
        setEtat("erreur"); // pas de 3D disponible sur cet appareil
        refRappels.current.surEchec?.();
        return;
      }
      rendu.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      conteneur.appendChild(rendu.domElement);
      rendu.domElement.style.display = "block";
      // Le canvas contient plus de pixels que sa taille affichée sur les écrans denses (téléphones) :
      // sa taille À L'ÉCRAN doit donc être fixée en CSS, sinon il déborde de sa zone et la carte est coupée.
      rendu.domElement.style.width = "100%";
      rendu.domElement.style.height = "100%";

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
      camera.position.set(0, 0, 5); // assez près pour que la carte occupe presque toute la hauteur
      const controles = new OrbitControls(camera, rendu.domElement);
      controles.enableDamping = true;
      controles.enablePan = false; // on tourne et on zoome, mais la carte reste au centre
      // Au doigt : OrbitControls réserve TOUS les gestes à la carte (touch-action: none). Sur téléphone, la carte
      // occupe presque tout l'écran : on ne pouvait plus faire défiler la page pour voir la suite de la fiche.
      // pan-y rend le glissement VERTICAL au navigateur (la page défile) ; le glissement horizontal fait
      // toujours tourner la carte et le pincement la fait zoomer. À la souris, rien ne change.
      rendu.domElement.style.touchAction = "pan-y";
      controles.minDistance = 3;
      controles.maxDistance = 9;

      /* ---------- Géométrie : un rectangle aux coins arrondis, avec une épaisseur ---------- */
      const l = 1.8;
      const h = 2.5;
      const r = 0.13;
      const forme = new THREE.Shape();
      forme.moveTo(-l / 2 + r, -h / 2);
      forme.lineTo(l / 2 - r, -h / 2);
      forme.quadraticCurveTo(l / 2, -h / 2, l / 2, -h / 2 + r);
      forme.lineTo(l / 2, h / 2 - r);
      forme.quadraticCurveTo(l / 2, h / 2, l / 2 - r, h / 2);
      forme.lineTo(-l / 2 + r, h / 2);
      forme.quadraticCurveTo(-l / 2, h / 2, -l / 2, h / 2 - r);
      forme.lineTo(-l / 2, -h / 2 + r);
      forme.quadraticCurveTo(-l / 2, -h / 2, -l / 2 + r, -h / 2);

      const epaisseur = 0.05;
      const tranche = new THREE.Mesh(
        new THREE.ExtrudeGeometry(forme, { depth: epaisseur, bevelEnabled: false, curveSegments: 10 }),
        new THREE.MeshBasicMaterial({ color: 0x0a0e26 }),
      );
      tranche.position.z = -epaisseur / 2;

      // Une face plate : ses coordonnées de texture (uv) sont recalculées pour couvrir toute l'image.
      function creerFace() {
        const geometrie = new THREE.ShapeGeometry(forme, 10);
        const positions = geometrie.attributes.position;
        const uv = new Float32Array(positions.count * 2);
        for (let i = 0; i < positions.count; i++) {
          uv[i * 2] = positions.getX(i) / l + 0.5;
          uv[i * 2 + 1] = positions.getY(i) / h + 0.5;
        }
        geometrie.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
        return geometrie;
      }
      const geometrieFace = creerFace();

      /* ---------- Textures : les deux faces sont dessinées dans des canvas 2D ---------- */
      const donnees: DonneesCarte = { numero, nom, types: typesTexte.split("|"), mesures, teinte, policeTitre };
      const toileFace = document.createElement("canvas");
      const toileDos = document.createElement("canvas");
      // Netteté du texte : la texture est dessinée à peu près à la taille où la carte apparaît à l'écran
      // (hauteur de la zone × densité de pixels de l'écran), avec une petite marge pour le zoom.
      const pixelsAffiches = conteneur.clientHeight * 0.87 * rendu.getPixelRatio();
      const finesse = Math.min(2.4, Math.max(1, (pixelsAffiches * 1.35) / HAUTEUR));
      await souffler();
      dessinerFace(toileFace, donnees, image, finesse);
      await souffler();
      dessinerDos(toileDos, teinte, policeTitre, finesse);
      await souffler();
      if (annule) {
        rendu.dispose();
        rendu.domElement.remove();
        return;
      }
      const textureFace = new THREE.CanvasTexture(toileFace);
      const textureDos = new THREE.CanvasTexture(toileDos);
      for (const texture of [textureFace, textureDos]) {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = rendu.capabilities.getMaxAnisotropy(); // texture nette même vue de biais
        // Pas de versions réduites floues de la texture (« mipmaps ») : elle est déjà à la bonne taille.
        texture.generateMipmaps = false;
        texture.minFilter = THREE.LinearFilter;
      }

      const reflet = new THREE.ShaderMaterial({
        vertexShader: SOMMETS,
        fragmentShader: PIXELS,
        uniforms: { uForce: { value: 1 } },
        transparent: true,
        blending: THREE.AdditiveBlending, // la couleur du reflet s'ajoute à celle de la carte
        depthWrite: false,
      });

      /* ---------- Effet du type : une couche à part, entre la face et le reflet ---------- */
      // Le reflet ci-dessus n'est pas modifié. L'effet (flammes, caustiques, givre…) est un second
      // matériau additif, propre au type principal du Pokémon. Chaque face a le sien, car chacune a sa
      // propre inclinaison face au regard et ses propres zones à laisser lisibles.
      const couleurType = new THREE.Color(teinte);
      // three.js range les couleurs en valeurs « linéaires » ; notre programme écrit directement à l'écran,
      // on lui redonne donc les valeurs d'écran (sRGB), sinon la teinte serait trop sombre.
      couleurType.convertLinearToSRGB();
      const programme = effets.assemblerEffet(estUnType(typePrincipal) ? typePrincipal : "normal");
      const creerEffet = (zones: ZonesCarte) =>
        new THREE.ShaderMaterial({
          ...programme,
          uniforms: effets.creerUniformes([couleurType.r, couleurType.g, couleurType.b], zones),
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
      const effetFace = creerEffet(effets.ZONES_FACE);
      const effetDos = creerEffet(effets.ZONES_DOS);
      // Écran tactile = téléphone ou tablette : moins de détails, pour rester fluide.
      const qualite = window.matchMedia("(pointer: coarse)").matches ? 0.5 : 1;
      effetFace.uniforms.uQualite.value = qualite;
      effetDos.uniforms.uQualite.value = qualite;

      /* ---------- Feuille holographique : le motif brillant des cartes rares, sur la face avant ---------- */
      // Elle n'existe QUE sur une carte personnalisée dans l'atelier, qui choisit son motif (étoiles, rayons,
      // or…). Sur la fiche, la couche reste cachée : la carte n'a que le reflet et l'effet de son type.
      // La couche est posée
      // juste au-dessus de la face, SOUS l'effet du type et le reflet. premultipliedAlpha : three.js mélange
      // alors « carte × (1 − alpha) + couleur », ce qui permet à la feuille de recouvrir la carte par endroits.
      const feuille = new THREE.ShaderMaterial({
        ...feuilles.assemblerFeuille("arc-en-ciel"),
        transparent: true,
        premultipliedAlpha: true,
        depthWrite: false,
      });
      // Les axes de la caméra, pour placer la lampe de la feuille par rapport à l'écran.
      const droite = new THREE.Vector3();
      const haut = new THREE.Vector3();
      const versOeil = new THREE.Vector3();

      const carte = new THREE.Group();
      const avant = new THREE.Mesh(geometrieFace, new THREE.MeshBasicMaterial({ map: textureFace }));
      avant.position.z = epaisseur / 2 + 0.001;
      const feuilleAvant = new THREE.Mesh(geometrieFace, feuille);
      feuilleAvant.position.z = epaisseur / 2 + 0.0015;
      feuilleAvant.visible = false; // cachée tant que l'atelier n'a pas choisi de motif (un objet caché n'est pas dessiné)
      const effetAvant = new THREE.Mesh(geometrieFace, effetFace);
      effetAvant.position.z = epaisseur / 2 + 0.002;
      const effetArriere = new THREE.Mesh(geometrieFace, effetDos);
      effetArriere.position.z = -epaisseur / 2 - 0.002;
      effetArriere.rotation.y = Math.PI;
      const refletAvant = new THREE.Mesh(geometrieFace, reflet);
      refletAvant.position.z = epaisseur / 2 + 0.003;
      const arriere = new THREE.Mesh(geometrieFace, new THREE.MeshBasicMaterial({ map: textureDos }));
      arriere.position.z = -epaisseur / 2 - 0.001;
      arriere.rotation.y = Math.PI;
      // Le dos est plus clair et plus chargé que la face : son reflet est un peu renforcé pour rester visible.
      const refletDos = reflet.clone();
      refletDos.uniforms.uForce.value = 1.6;
      const refletArriere = new THREE.Mesh(geometrieFace, refletDos);
      refletArriere.position.z = -epaisseur / 2 - 0.003;
      refletArriere.rotation.y = Math.PI;
      carte.add(tranche, avant, feuilleAvant, effetAvant, refletAvant, arriere, effetArriere, refletArriere);
      scene.add(carte);
      // Ordre de dessin des couches transparentes, de la plus basse à la plus haute. Elles sont presque à la
      // même distance de la caméra : sans cet ordre imposé, three.js pourrait dessiner la feuille en dernier,
      // et elle voilerait l'effet du type et le reflet.
      feuilleAvant.renderOrder = 1;
      effetAvant.renderOrder = effetArriere.renderOrder = 2;
      refletAvant.renderOrder = refletArriere.renderOrder = 3;

      // Inclinaison d'une face par rapport au regard, de -1 à 1 sur chaque axe : c'est elle qui fait glisser
      // les reflets et la profondeur de l'effet. On exprime la direction de la caméra dans le repère de la
      // face (rotation inverse de la face) : de face elle vaut (0, 0, 1) ; ses parts x et y grandissent
      // quand la carte pivote ou bascule.
      const orientationFace = new THREE.Quaternion();
      const versCamera = new THREE.Vector3();
      const mesurerInclinaison = (face: import("three").Mesh, materiau: import("three").ShaderMaterial) => {
        face.getWorldQuaternion(orientationFace).invert();
        versCamera.copy(camera.position).sub(carte.position).normalize().applyQuaternion(orientationFace);
        const inclinaison = materiau.uniforms.uInclinaison.value as number[];
        inclinaison[0] = THREE.MathUtils.clamp(-versCamera.x * 1.4, -1, 1);
        inclinaison[1] = THREE.MathUtils.clamp(-versCamera.y * 1.8, -1, 1);
      };

      const adapter = () => {
        rendu.setSize(conteneur.clientWidth, conteneur.clientHeight, false);
        camera.aspect = conteneur.clientWidth / Math.max(conteneur.clientHeight, 1);
        camera.updateProjectionMatrix();
      };
      const observateur = new ResizeObserver(adapter);
      observateur.observe(conteneur);
      adapter();

      // Rotation demandée par le bouton « Retourner » : la carte la rejoint en douceur.
      let rotationCible = 0;
      refCommandes.current = {
        retourner: () => {
          rotationCible += Math.PI;
        },
        recentrer: () => {
          rotationCible = Math.round(rotationCible / (Math.PI * 2)) * Math.PI * 2;
          controles.reset();
        },
        tourner: (degres) => {
          rotationCible += THREE.MathUtils.degToRad(degres);
        },
      };

      /* ---------- Personnalisation (atelier) : mise à jour de la carte sur place ---------- */
      const lireCouleur = (type: string) => styles.getPropertyValue(`--color-type-${type}`).trim() || "#aab6ff";
      let illustrationAffichee = illustration;
      let imageAffichee = image;
      let typeAffiche: string = estUnType(typePrincipal) ? typePrincipal : "normal";
      let tour = 0; // numéro de la dernière demande : une demande plus ancienne, encore en attente, est abandonnée
      const appliquer = async (p: PersoCarte) => {
        const monTour = ++tour;
        // 1. L'illustration, seulement si elle a changé (passage en chromatique) : il faut la télécharger.
        if (p.illustration !== illustrationAffichee) {
          const adresse = p.illustration ? `/_next/image?url=${encodeURIComponent(p.illustration)}&w=640&q=75` : null;
          const nouvelle = await chargerImage(adresse);
          if (annule || monTour !== tour) return;
          illustrationAffichee = p.illustration;
          imageAffichee = nouvelle;
        }

        // 2. Les deux faces sont redessinées dans leurs canvas, puis renvoyées à la carte graphique.
        const type = estUnType(p.typeEffet) ? p.typeEffet : "normal";
        const teinteType = lireCouleur(type);
        const teinteCarte = p.style === "or" ? TEINTE_OR : teinteType;
        const attaques = p.attaques.map((a) => ({ nomFr: a.nomFr, couleur: lireCouleur(a.type), puissance: a.puissance }));
        dessinerFace(toileFace, { ...donnees, nom: p.nom, teinte: teinteCarte, style: p.style, attaques }, imageAffichee, finesse);
        dessinerDos(toileDos, teinteCarte, policeTitre, finesse);
        textureFace.needsUpdate = true;
        textureDos.needsUpdate = true;

        // 3. L'effet du type : un autre type = un autre programme, que three.js recompile (needsUpdate).
        if (type !== typeAffiche) {
          typeAffiche = type;
          const nouveau = effets.assemblerEffet(type);
          for (const materiau of [effetFace, effetDos]) {
            materiau.fragmentShader = nouveau.fragmentShader;
            materiau.needsUpdate = true;
          }
        }
        couleurType.set(teinteType).convertLinearToSRGB();
        for (const materiau of [effetFace, effetDos]) materiau.uniforms.uTeinte.value = [couleurType.r, couleurType.g, couleurType.b];

        // 4. Les zones calmes suivent la nouvelle mise en page, et la feuille prend le motif choisi.
        const zones = effets.zonesDeLaFace(miseEnPage(p.style, attaques.length));
        for (const materiau of [effetFace, feuille]) {
          materiau.uniforms.uZonesCalmes.value = zones.textes.flat();
          materiau.uniforms.uZoneIllustration.value = zones.illustration;
        }
        feuilleAvant.visible = p.motif !== null;
        if (p.motif) feuille.uniforms.uMotif.value = feuilles.MOTIFS.indexOf(p.motif);
      };
      refAppliquer.current = appliquer;
      // Une carte déjà personnalisée (relue dans le navigateur) est appliquée avant le premier affichage.
      if (refPerso.current) await appliquer(refPerso.current);

      const horloge = new THREE.Clock();
      let rotation = 0;
      let temps = 0;
      rendu.setAnimationLoop(() => {
        const dt = Math.min(horloge.getDelta(), 0.1);
        const reduit = refReduit.current;
        // Animations réduites : la carte passe directement à la position demandée, sans balancement.
        rotation = reduit ? rotationCible : rotation + (rotationCible - rotation) * Math.min(1, dt * 7);
        temps += dt;
        // Au repos, la carte se balance : elle pivote de gauche à droite, s'incline et flotte.
        carte.rotation.y = rotation + (reduit ? 0 : Math.sin(temps * 0.9) * 0.34);
        carte.rotation.x = reduit ? 0 : Math.sin(temps * 0.7) * 0.1;
        carte.rotation.z = reduit ? 0 : Math.sin(temps * 0.5) * 0.025;
        carte.position.y = reduit ? 0 : Math.sin(temps * 1.3) * 0.07;
        controles.update();
        // L'effet du type reçoit l'heure, l'inclinaison de sa face, et se fige en animations réduites.
        for (const [face, materiau] of [[effetAvant, effetFace], [effetArriere, effetDos]] as const) {
          materiau.uniforms.uTemps.value = temps;
          materiau.uniforms.uCalme.value = reduit ? 1 : 0;
          mesurerInclinaison(face, materiau);
        }
        // Feuille holographique. « Penche » : de combien la face avant est tournée par rapport au regard
        // (0 = bien de face) ; la feuille dort de face et s'éveille quand la carte penche.
        feuilleAvant.getWorldQuaternion(orientationFace).invert();
        versCamera.copy(camera.position).sub(carte.position).normalize().applyQuaternion(orientationFace);
        feuille.uniforms.uPenche.value = Math.hypot(versCamera.x, versCamera.y);
        // Sa lampe est devant la carte, côté caméra, et se promène lentement (immobile en animations réduites).
        // Elle est placée avec les axes de la caméra : droite, haut, et vers l'œil.
        droite.set(1, 0, 0).applyQuaternion(camera.quaternion);
        haut.set(0, 1, 0).applyQuaternion(camera.quaternion);
        versOeil.set(0, 0, 1).applyQuaternion(camera.quaternion);
        const lampeX = reduit ? -0.14 : Math.sin(temps * 0.41) * 0.42;
        const lampeY = reduit ? 0.24 : 0.12 - Math.sin(temps * 0.33 + 0.6) * 0.3;
        versCamera
          .copy(carte.position)
          .addScaledVector(droite, lampeX * 1.1 * l)
          .addScaledVector(haut, lampeY * 1.1 * h)
          .addScaledVector(versOeil, 0.9 * l);
        (feuille.uniforms.uLampe.value as number[]).splice(0, 3, versCamera.x, versCamera.y, versCamera.z);
        rendu.render(scene, camera);
      });
      setEtat("pret");
      refRappels.current.surPret?.();

      nettoyer = () => {
        rendu.setAnimationLoop(null);
        observateur.disconnect();
        controles.dispose();
        // Libération de la mémoire de la carte graphique.
        tranche.geometry.dispose();
        (tranche.material as import("three").Material).dispose();
        geometrieFace.dispose();
        textureFace.dispose();
        textureDos.dispose();
        (avant.material as import("three").Material).dispose();
        (arriere.material as import("three").Material).dispose();
        reflet.dispose();
        refletDos.dispose();
        effetFace.dispose();
        effetDos.dispose();
        feuille.dispose();
        rendu.dispose();
        rendu.domElement.remove();
        refCommandes.current = null;
        refAppliquer.current = null;
      };
      if (annule) nettoyer();
    })();

    return () => {
      annule = true;
      nettoyer();
    };
  }, [illustration, numero, nom, typesTexte, typePrincipal, mesures]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative h-[26rem] overflow-hidden rounded-3xl sm:h-[30rem]">
        {/* role="img" : la zone 3D est annoncée comme une image, avec une description. */}
        <div
          ref={refConteneur}
          role="img"
          aria-label={`Carte holographique de ${nom}, orientable à la souris, au doigt ou avec les boutons ci-dessous`}
          className="absolute inset-0 touch-pan-y"
        />
        {etat === "erreur" && (
          <p role="alert" className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-texte-doux">
            La 3D n&apos;est pas disponible sur cet appareil.
          </p>
        )}
      </div>

      {/* Les boutons donnent au clavier ce que la souris fait en faisant glisser la carte.
          Une seule barre compacte en verre, centrée sous la carte : icônes rondes + le bouton principal. */}
      <div className="mx-auto flex w-fit items-center gap-1 rounded-full border border-bordure-verre bg-surface p-1">
        <button type="button" className={BOUTON_ROND} onClick={() => refCommandes.current?.tourner(-30)} aria-label="Tourner vers la gauche" title="Tourner vers la gauche">
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5">
            <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />
          </svg>
        </button>
        <button
          type="button"
          className="flex min-h-11 items-center rounded-full bg-accent-plein px-5 text-sm font-semibold text-sur-accent shadow-lueur"
          onClick={() => refCommandes.current?.retourner()}
        >
          Retourner
        </button>
        <button type="button" className={BOUTON_ROND} onClick={() => refCommandes.current?.tourner(30)} aria-label="Tourner vers la droite" title="Tourner vers la droite">
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5">
            <path d="M21 12a9 9 0 1 1-3-6.7M21 4v5h-5" />
          </svg>
        </button>
        <button type="button" className={BOUTON_ROND} onClick={() => refCommandes.current?.recentrer()} aria-label="Recentrer la carte" title="Recentrer la carte">
          {/* Une cible */}
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-5">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
          </svg>
        </button>
      </div>
      {/* Le conseil dépend de l'appareil : pointer-coarse = écran tactile (doigt), pointer-fine = souris. */}
      <p className="etiquette text-center pointer-coarse:hidden">Glisse pour tourner · molette ou pincement pour zoomer</p>
      <p className="etiquette hidden text-center pointer-coarse:block">Glisse de côté pour tourner · pince pour zoomer</p>
    </div>
  );
}

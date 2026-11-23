"use client";

// Carte holographique en 3D : une carte en volume que l'on fait tourner à 360°, avec des reflets
// irisés qui changent selon l'angle de vue. three.js est utilisé directement : la scène est créée
// dans un useEffect, et la bibliothèque n'est téléchargée que lorsque ce composant s'affiche.

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { dessinerDos, dessinerFace, HAUTEUR, type DonneesCarte } from "@/lib/carte3d";

type Props = {
  illustration: string | null; // adresse de l'image déjà affichée sur la fiche
  numero: string;
  nom: string;
  types: string[]; // libellés français
  typePrincipal: string; // clé anglaise ("fire"), pour lire la couleur --color-type-fire
  mesures: string;
  // Prévenir le parent quand la carte est affichée, ou quand la 3D est indisponible.
  surPret?: () => void;
  surEchec?: () => void;
};

type Commandes = { retourner: () => void; recentrer: () => void; tourner: (degres: number) => void };

// Programme exécuté par la carte graphique pour chaque pixel du reflet (langage GLSL).
// Le reflet est calculé comme un VRAI reflet : une lumière fixe dans la scène, dont l'éclat apparaît
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
    vec3 lumiere = normalize(vec3(-0.45, 0.06, 1.0));      // vers la source, fixe dans la scène
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

export default function Carte3D({ illustration, numero, nom, types, typePrincipal, mesures, surPret, surEchec }: Props) {
  const refConteneur = useRef<HTMLDivElement>(null);
  const refCommandes = useRef<Commandes | null>(null);
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
      const THREE = await import("three");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      if (annule) return;

      // Couleur du type et police des titres, lues dans les variables CSS du site.
      const styles = getComputedStyle(document.documentElement);
      const teinte = styles.getPropertyValue(`--color-type-${typePrincipal}`).trim() || "#aab6ff";
      const policeTitre = getComputedStyle(document.body).getPropertyValue("--font-chakra").trim() || "system-ui";
      await document.fonts.load(`700 64px ${policeTitre}`).catch(() => {});

      // L'illustration est chargée comme une image ordinaire. crossOrigin : nécessaire pour
      // pouvoir la recopier dans un canvas puis s'en servir comme texture.
      const image = await new Promise<HTMLImageElement | null>((resoudre) => {
        if (!illustration) return resoudre(null);
        const element = new Image();
        element.crossOrigin = "anonymous";
        element.onload = () => resoudre(element);
        element.onerror = () => resoudre(null);
        element.src = illustration;
      });
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
      dessinerFace(toileFace, donnees, image, finesse);
      dessinerDos(toileDos, teinte, policeTitre, finesse);
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

      const carte = new THREE.Group();
      const avant = new THREE.Mesh(geometrieFace, new THREE.MeshBasicMaterial({ map: textureFace }));
      avant.position.z = epaisseur / 2 + 0.001;
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
      carte.add(tranche, avant, refletAvant, arriere, refletArriere);
      scene.add(carte);

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
        rendu.dispose();
        rendu.domElement.remove();
        refCommandes.current = null;
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
      <div className="relative h-[30rem] overflow-hidden rounded-3xl sm:h-[34rem]">
        {/* role="img" : la zone 3D est annoncée comme une image, avec une description. */}
        <div
          ref={refConteneur}
          role="img"
          aria-label={`Carte holographique de ${nom}, orientable à la souris, au doigt ou avec les boutons ci-dessous`}
          className="absolute inset-0 touch-none"
        />
        {etat === "chargement" && (
          <p role="status" className="etiquette absolute inset-0 flex items-center justify-center">
            Préparation de la carte…
          </p>
        )}
        {etat === "erreur" && (
          <p role="alert" className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-texte-doux">
            La 3D n&apos;est pas disponible sur cet appareil.
          </p>
        )}
      </div>

      {/* Les boutons donnent au clavier ce que la souris fait en faisant glisser la carte. */}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="bouton bouton-principal" onClick={() => refCommandes.current?.retourner()}>
          Retourner
        </button>
        <button type="button" className="bouton bouton-secondaire" onClick={() => refCommandes.current?.tourner(-30)} aria-label="Tourner vers la gauche">
          ↺
        </button>
        <button type="button" className="bouton bouton-secondaire" onClick={() => refCommandes.current?.tourner(30)} aria-label="Tourner vers la droite">
          ↻
        </button>
        <button type="button" className="bouton bouton-secondaire" onClick={() => refCommandes.current?.recentrer()}>
          Recentrer
        </button>
      </div>
      <p className="etiquette">Fais glisser pour tourner · molette ou pincement pour zoomer</p>
    </div>
  );
}

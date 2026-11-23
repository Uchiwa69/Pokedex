"use client";

// Carte holographique en 3D : une carte en volume que l'on fait tourner à 360°, avec des reflets
// irisés qui changent selon l'angle de vue. three.js est utilisé directement : la scène est créée
// dans un useEffect, et la bibliothèque n'est téléchargée que lorsque ce composant s'affiche.

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { dessinerDos, dessinerFace, HAUTEUR, LARGEUR, type DonneesCarte } from "@/lib/carte3d";

type Props = {
  illustration: string | null; // adresse de l'image déjà affichée sur la fiche
  numero: string;
  nom: string;
  types: string[]; // libellés français
  typePrincipal: string; // clé anglaise ("fire"), pour lire la couleur --color-type-fire
  mesures: string;
};

type Commandes = { retourner: () => void; recentrer: () => void; tourner: (degres: number) => void };

// Programme exécuté par la carte graphique pour chaque pixel du reflet (langage GLSL).
// La lumière dépend de l'angle entre la surface et le regard : en inclinant la carte,
// une bande de reflet la traverse, comme sur une carte brillante.
const SOMMETS = `
  varying vec2 vUv;
  varying vec3 vNormale;
  varying vec3 vRegard;
  void main() {
    vUv = uv;
    vec4 position_vue = modelViewMatrix * vec4(position, 1.0);
    vNormale = normalize(normalMatrix * normal);
    vRegard = normalize(-position_vue.xyz);
    gl_Position = projectionMatrix * position_vue;
  }
`;
const PIXELS = `
  varying vec2 vUv;
  varying vec3 vNormale;
  varying vec3 vRegard;
  uniform float uForce;
  void main() {
    float angle = dot(normalize(vNormale), normalize(vRegard)); // 1 = vue de face, 0 = vue rasante
    // Une seule bande de lumière, en diagonale, qui glisse sur la carte quand on l'incline.
    float position = vUv.x * 0.7 + vUv.y * 0.5 + (1.0 - angle) * 2.2;
    float bande = smoothstep(0.86, 1.0, sin(position * 3.7)); // plus le seuil est élevé, plus la bande est fine
    // Lumière presque blanche, à peine teintée : c'est ce qui la rend naturelle.
    vec3 irise = 0.5 + 0.5 * cos(6.2831 * (position * 0.35 + vec3(0.0, 0.33, 0.67)));
    vec3 couleur = mix(vec3(1.0), irise, 0.3);
    // Un peu plus de brillance quand la carte est vue de biais, comme une surface vernie.
    float rasant = pow(1.0 - angle, 2.0);
    gl_FragColor = vec4(couleur, (bande * 0.19 + rasant * 0.2) * uForce);
  }
`;

export default function Carte3D({ illustration, numero, nom, types, typePrincipal, mesures }: Props) {
  const refConteneur = useRef<HTMLDivElement>(null);
  const refCommandes = useRef<Commandes | null>(null);
  const animationsReduites = useReducedMotion();
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
        return;
      }
      rendu.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      conteneur.appendChild(rendu.domElement);
      rendu.domElement.style.display = "block";

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
      camera.position.set(0, 0, 6.2);
      const controles = new OrbitControls(camera, rendu.domElement);
      controles.enableDamping = true;
      controles.enablePan = false; // on tourne et on zoome, mais la carte reste au centre
      controles.minDistance = 3.4;
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
      dessinerFace(toileFace, donnees, image);
      dessinerDos(toileDos, teinte, policeTitre);
      const textureFace = new THREE.CanvasTexture(toileFace);
      const textureDos = new THREE.CanvasTexture(toileDos);
      for (const texture of [textureFace, textureDos]) {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = rendu.capabilities.getMaxAnisotropy(); // texture nette même vue de biais
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
      const refletArriere = new THREE.Mesh(geometrieFace, reflet);
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
        carte.rotation.y = rotation + (reduit ? 0 : Math.sin(temps * 0.8) * 0.16);
        carte.rotation.x = reduit ? 0 : Math.sin(temps * 0.6) * 0.05;
        carte.position.y = reduit ? 0 : Math.sin(temps * 1.2) * 0.04;
        controles.update();
        rendu.render(scene, camera);
      });
      setEtat("pret");

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
      <div className="relative h-[26rem] overflow-hidden rounded-3xl">
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
      <p className="etiquette">
        Texture de {LARGEUR} × {HAUTEUR} px · fais glisser pour tourner, molette ou pincement pour zoomer
      </p>
    </div>
  );
}

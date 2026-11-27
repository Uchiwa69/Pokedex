"use client";

// La Pokéball 3D de l'accueil, écrite avec React Three Fiber : la scène three.js se décrit en JSX (<mesh>, <group>…)
// et `useFrame` s'exécute à chaque image. Elle est MODÉLISÉE EN CODE (aucun fichier 3D) : deux demi-sphères, une
// bande, un bouton. Elle ne décide de rien : à chaque image, elle lit la pose (lib/pokeball/pose.ts) et s'y place.

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { pointeur, pose } from "@/lib/pokeball/pose";
import { Cadence, ratioPixels } from "@/lib/qualite";

// 60 images par seconde au plus. Le canvas est en mode « demand » : il ne dessine que lorsqu'on le lui demande
// (invalidate). Ce petit composant le lui demande à chaque rafraîchissement de l'écran, une fois sur deux sur un
// écran à 120 Hz (Mac ProMotion), où la Pokéball était sinon dessinée 120 fois par seconde.
function Cadence60() {
  const invalidate = useThree((etat) => etat.invalidate);
  useEffect(() => {
    const cadence = new Cadence();
    let image = 0;
    const boucle = (maintenant: number) => {
      image = requestAnimationFrame(boucle);
      if (cadence.aDessiner(maintenant)) invalidate();
    };
    image = requestAnimationFrame(boucle);
    return () => cancelAnimationFrame(image);
  }, [invalidate]);
  return null;
}

const JEU = 0.05; // demi-épaisseur de la bande noire entre les deux moitiés (le rayon vaut 1)
const DEMI_TOUR = Math.PI / 2;
// Un cylindre est « debout » par défaut : cette rotation le couche, face ronde vers nous (pour le bouton).
const FACE_A_NOUS: [number, number, number] = [DEMI_TOUR, 0, 0];

function Pokeball() {
  // viewport : la taille de l'écran exprimée dans les unités de la scène (pour convertir les fractions d'écran).
  const viewport = useThree((etat) => etat.viewport);
  const racine = useRef<THREE.Group>(null);
  const couvercle = useRef<THREE.Group>(null);
  const lueur = useRef<THREE.Sprite>(null);
  const lampe = useRef<THREE.PointLight>(null);
  const pointeurLisse = useRef({ x: 0, y: 0 });

  // Matériaux créés une seule fois (useMemo). clearcoat = vernis brillant par-dessus la couleur.
  const matieres = useMemo(() => {
    const plastique = (couleur: string, rugosite: number) =>
      new THREE.MeshPhysicalMaterial({ color: couleur, roughness: rugosite, clearcoat: 1, clearcoatRoughness: 0.18 });
    return {
      rouge: plastique("#dc2626", 0.32),
      blanc: plastique("#f1f5f9", 0.36),
      noir: plastique("#0b0c10", 0.45),
      // L'intérieur : sombre et mat, visible sur les deux faces (les demi-sphères sont creuses).
      interieur: new THREE.MeshStandardMaterial({ color: "#1b1410", roughness: 0.9, side: THREE.DoubleSide }),
    };
  }, []);

  // Le halo de lumière : un dégradé rond dessiné une fois dans un canvas 2D, utilisé comme image.
  const imageLueur = useMemo(() => {
    const toile = document.createElement("canvas");
    toile.width = toile.height = 128;
    const ctx = toile.getContext("2d")!;
    const degrade = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    degrade.addColorStop(0, "rgba(255, 250, 235, 1)");
    degrade.addColorStop(0.3, "rgba(255, 200, 120, 0.6)");
    degrade.addColorStop(1, "rgba(255, 120, 40, 0)");
    ctx.fillStyle = degrade;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(toile);
  }, []);

  useFrame((etat, ecoule) => {
    const t = etat.clock.elapsedTime;
    // Lissage : le regard rattrape le pointeur en douceur (même formule que la brûlure de fin de page).
    const part = 1 - Math.exp(-ecoule * 4);
    pointeurLisse.current.x += (pointeur.x - pointeurLisse.current.x) * part;
    pointeurLisse.current.y += (pointeur.y - pointeurLisse.current.y) * part;
    const px = pointeurLisse.current.x;
    const py = pointeurLisse.current.y;

    const rayon = (pose.taille * viewport.height) / 2;
    if (racine.current) {
      // Fractions d'écran → unités de la scène. Le sinus la fait flotter doucement.
      racine.current.position.set(pose.fx * viewport.width, pose.fy * viewport.height + Math.sin(t * 1.1) * 0.06 * rayon, 0);
      racine.current.rotation.set(pose.rx + py * 0.18, pose.ry + px * 0.35, pose.rz + Math.sin(t * 0.8) * 0.03);
      racine.current.scale.setScalar(rayon);
    }
    // Le couvercle pivote autour de sa charnière, à l'arrière.
    if (couvercle.current) couvercle.current.rotation.x = -pose.ouverture * 1.05;
    // La lumière sort quand elle s'ouvre, et palpite légèrement.
    const eclat = pose.ouverture * (1 + Math.sin(t * 6) * 0.06);
    if (lueur.current) {
      lueur.current.scale.setScalar(0.001 + eclat * 2.6);
      lueur.current.material.opacity = Math.min(1, pose.ouverture * 1.2);
    }
    if (lampe.current) lampe.current.intensity = eclat * 5;
  });

  return (
    <group ref={racine}>
      {/* Moitié basse, blanche : elle porte la bande noire et le bouton. */}
      <mesh material={matieres.blanc}>
        {/* Les deux derniers nombres découpent la sphère : on ne garde que le bas, sous la bande. */}
        <sphereGeometry args={[1, 64, 32, 0, Math.PI * 2, DEMI_TOUR + JEU, DEMI_TOUR - JEU]} />
      </mesh>
      <mesh material={matieres.noir}>
        <cylinderGeometry args={[0.985, 0.985, JEU * 2, 64, 1, true]} />
      </mesh>
      {/* Le fond visible quand elle est ouverte. */}
      <mesh material={matieres.interieur} rotation={[-DEMI_TOUR, 0, 0]} position={[0, -JEU, 0]}>
        <circleGeometry args={[0.985, 64]} />
      </mesh>
      {/* Le bouton, sur la face avant : un socle noir, le bouton blanc, un anneau. */}
      <mesh material={matieres.noir} rotation={FACE_A_NOUS} position={[0, 0, 0.955]}>
        <cylinderGeometry args={[0.3, 0.3, 0.1, 48]} />
      </mesh>
      <mesh material={matieres.blanc} rotation={FACE_A_NOUS} position={[0, 0, 0.99]}>
        <cylinderGeometry args={[0.19, 0.2, 0.1, 48]} />
      </mesh>
      <mesh material={matieres.noir} position={[0, 0, 1.04]}>
        <torusGeometry args={[0.115, 0.012, 12, 48]} />
      </mesh>

      {/* Le couvercle rouge. Son groupe est posé sur la charnière (à l'arrière, z = -1) et son contenu est décalé
          d'autant vers l'avant : tourner le groupe fait donc pivoter le couvercle autour de la charnière. */}
      <group ref={couvercle} position={[0, 0, -1]}>
        <group position={[0, 0, 1]}>
          <mesh material={matieres.rouge}>
            <sphereGeometry args={[1, 64, 32, 0, Math.PI * 2, 0, DEMI_TOUR - JEU]} />
          </mesh>
          <mesh material={matieres.interieur} rotation={[DEMI_TOUR, 0, 0]} position={[0, JEU, 0]}>
            <circleGeometry args={[0.985, 64]} />
          </mesh>
        </group>
      </group>

      {/* La lumière qui s'échappe : une vraie lampe (elle éclaire l'intérieur) et un halo toujours tourné vers
          nous (sprite), en fusion additive : il ajoute de la lumière au lieu de masquer ce qui est derrière. */}
      <pointLight ref={lampe} color="#ffc27a" position={[0, 0.25, 0.2]} distance={4} intensity={0} />
      <sprite ref={lueur} position={[0, 0.3, 0.25]}>
        <spriteMaterial map={imageLueur} blending={THREE.AdditiveBlending} depthWrite={false} transparent toneMapped={false} />
      </sprite>
    </group>
  );
}

// `actif` vaut faux quand la Pokéball est invisible : la scène ne dessine alors plus rien (frameloop « never »).
export default function ScenePokeball({ actif }: { actif: boolean }) {
  // Densité de pixels : jusqu'à 1,75 pour une Pokéball nette, mais le canvas couvre TOUT l'écran : sur un grand
  // écran Retina, on reste dans un budget de 3,5 millions de pixels (lib/qualite.ts).
  const densite = useMemo(() => ratioPixels(window.innerWidth, window.innerHeight, 1.75, 3_500_000), []);
  return (
    <Canvas
      frameloop={actif ? "demand" : "never"}
      dpr={densite}
      camera={{ position: [0, 0, 6], fov: 35 }}
      gl={{ antialias: true, alpha: true }}
      // pointerEvents: none — React Three Fiber rend son canvas cliquable par défaut : il interceptait alors les
      // clics sur le pied de page (liens « À propos » et « PokéAPI » inaccessibles en bas de l'accueil).
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 4, 5]} intensity={1.5} />
      <directionalLight position={[-4, -1, 2]} intensity={0.45} color="#ff9a8a" />
      {/* Environnement : de grands panneaux lumineux invisibles, que le vernis de la Pokéball reflète.
          frames={1} : ces reflets sont calculés une seule fois. */}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.4} position={[0, 4, 3]} scale={[8, 2, 1]} />
        <Lightformer form="rect" intensity={1.4} position={[-5, 1, 2]} rotation-y={Math.PI / 2} scale={[4, 6, 1]} />
        <Lightformer form="rect" intensity={1.1} position={[5, -1, 2]} rotation-y={-Math.PI / 2} scale={[4, 6, 1]} color="#ffd0c0" />
        <Lightformer form="ring" intensity={1.8} position={[2, 2, 6]} scale={2} />
      </Environment>
      <Pokeball />
      {actif && <Cadence60 />}
    </Canvas>
  );
}

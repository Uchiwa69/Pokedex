"use client";

// PROTOTYPE (/labo/pokedex-3d) — affiche le modèle 3D du Pokédex pour juger son rendu.
// Le modèle lui-même est construit par lib/labo/pokedex3d.ts (code repris d'un fichier fourni). Ce composant
// crée la scène autour : rendu, caméra, lumières, et deux commandes (ouverture du volet, écran allumé).
// Comme pour la carte holographique, three.js est importé dans un useEffect : il n'est téléchargé que si cette
// page est ouverte.

import { useEffect, useRef, useState } from "react";

type Commandes = { ouvrir: (degres: number) => void; allumer: (allume: boolean) => void };

export default function Pokedex3D() {
  const conteneur = useRef<HTMLDivElement>(null);
  const commandes = useRef<Commandes | null>(null);
  const [ouverture, setOuverture] = useState(145); // en degrés : 0 = fermé
  const [allume, setAllume] = useState(false);
  const [etat, setEtat] = useState<"chargement" | "pret" | "erreur">("chargement");

  useEffect(() => {
    const zone = conteneur.current;
    if (!zone) return;
    let annule = false;
    let nettoyer = () => {};

    (async () => {
      const THREE = await import("three");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      const modele = await import("@/lib/labo/pokedex3d");
      if (annule) return;

      let rendu: import("three").WebGLRenderer;
      try {
        rendu = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch {
        setEtat("erreur"); // pas de 3D disponible sur cet appareil
        return;
      }
      rendu.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      // Rendu « cinéma » : compresse les fortes lumières comme un appareil photo (reflets moins brûlés).
      rendu.toneMapping = THREE.ACESFilmicToneMapping;
      rendu.toneMappingExposure = 0.95;
      rendu.shadowMap.enabled = true;
      zone.appendChild(rendu.domElement);
      rendu.domElement.style.cssText = "display:block;width:100%;height:100%";

      const scene = new THREE.Scene();
      // Environnement de studio : c'est lui que le plastique laqué reflète.
      const generateur = new THREE.PMREMGenerator(rendu);
      const environnement = modele.createStudioEnvironment(generateur);
      scene.environment = environnement;
      // 0.4 au lieu de 0.95 : les reflets du studio sont nettement atténués (ils blanchissaient le plastique).
      scene.environmentIntensity = 0.4;

      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
      camera.position.set(-1.15, 0.1, 11.5); // assez loin pour voir tout l'appareil, volet ouvert
      const controles = new OrbitControls(camera, rendu.domElement);
      controles.target.set(-1.05, 0, 0);
      controles.enableDamping = true;
      controles.enablePan = false;
      controles.minDistance = 4;
      controles.maxDistance = 14;

      // Éclairage de studio à trois points (valeurs du fichier d'origine).
      scene.add(new THREE.AmbientLight(0xffffff, 0.14));
      const principale = new THREE.DirectionalLight(0xffffff, 1.5);
      principale.position.set(4.5, 6.5, 6.5);
      principale.castShadow = true;
      const appoint = new THREE.DirectionalLight(0xe0ecff, 0.75);
      appoint.position.set(-6, 2, 4.5);
      const contreJour = new THREE.DirectionalLight(0xffffff, 0.5);
      contreJour.position.set(0, 4.5, -6);
      scene.add(principale, appoint, contreJour);

      const pokedex = modele.buildPokedexAssembly();
      scene.add(pokedex.rootGroup);

      // Reflets adoucis : le fichier d'origine donne aux plastiques un vernis miroir (clearcoat à 1, rugosité
      // très faible). On réduit le vernis et on augmente la rugosité : la surface reste brillante, mais les
      // reflets sont plus larges et moins éclatants. On ne touche qu'aux matériaux « physiques » (plastiques, verre).
      pokedex.rootGroup.traverse((objet) => {
        const materiau = (objet as import("three").Mesh).material as import("three").MeshPhysicalMaterial | undefined;
        if (!materiau || !("clearcoat" in materiau) || materiau.transmission > 0) return;
        materiau.clearcoat = Math.min(materiau.clearcoat, 0.35);
        materiau.clearcoatRoughness = Math.max(materiau.clearcoatRoughness, 0.3);
        materiau.roughness = Math.max(materiau.roughness, 0.38);
      });

      // Angle demandé pour le volet : la boucle de rendu le rejoint en douceur.
      let angleCible = -THREE.MathUtils.degToRad(145);
      pokedex.lidPivotGroup.rotation.y = angleCible;
      commandes.current = {
        ouvrir: (degres) => {
          angleCible = -THREE.MathUtils.degToRad(degres);
        },
        allumer: (oui) => {
          const texture = modele.createScreenCanvasTexture(oui);
          pokedex.screenDisplayMat.map?.dispose();
          pokedex.screenDisplayMat.map = texture;
          pokedex.screenDisplayMat.emissiveMap = texture;
          pokedex.screenDisplayMat.emissiveIntensity = oui ? 1.15 : 0;
          pokedex.screenDisplayMat.needsUpdate = true;
          for (const voyant of pokedex.ledMeshes) voyant.material.emissiveIntensity = oui ? 1.6 : 0.25;
        },
      };

      const adapter = () => {
        rendu.setSize(zone.clientWidth, zone.clientHeight, false);
        camera.aspect = zone.clientWidth / Math.max(zone.clientHeight, 1);
        camera.updateProjectionMatrix();
      };
      const observateur = new ResizeObserver(adapter);
      observateur.observe(zone);
      adapter();

      const horloge = new THREE.Clock();
      rendu.setAnimationLoop(() => {
        const dt = Math.min(horloge.getDelta(), 0.1);
        const volet = pokedex.lidPivotGroup.rotation;
        volet.y += (angleCible - volet.y) * Math.min(1, dt * 9);
        controles.update();
        rendu.render(scene, camera);
      });
      setEtat("pret");

      nettoyer = () => {
        rendu.setAnimationLoop(null);
        observateur.disconnect();
        controles.dispose();
        environnement.dispose();
        generateur.dispose();
        // Libération de la mémoire de la carte graphique : géométries et matériaux de toutes les pièces.
        scene.traverse((objet) => {
          const maillage = objet as import("three").Mesh;
          maillage.geometry?.dispose();
          const materiaux = Array.isArray(maillage.material) ? maillage.material : maillage.material ? [maillage.material] : [];
          for (const materiau of materiaux) materiau.dispose();
        });
        rendu.dispose();
        rendu.domElement.remove();
        commandes.current = null;
      };
      if (annule) nettoyer();
    })();

    return () => {
      annule = true;
      nettoyer();
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="verre relative h-[32rem] overflow-hidden sm:h-[40rem]">
        {/* role="img" : la zone 3D est annoncée comme une image, avec une description. */}
        <div ref={conteneur} role="img" aria-label="Modèle 3D du Pokédex, orientable à la souris ou au doigt" className="absolute inset-0 touch-none" />
        {etat !== "pret" && (
          <p role="status" className="etiquette absolute inset-0 flex items-center justify-center">
            {etat === "erreur" ? "La 3D n'est pas disponible sur cet appareil." : "Préparation du modèle 3D…"}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex min-w-64 flex-1 items-center gap-3">
          <span className="etiquette shrink-0">Ouverture du volet</span>
          <input
            type="range"
            min={0}
            max={178}
            value={ouverture}
            onChange={(evenement) => {
              const degres = Number(evenement.target.value);
              setOuverture(degres);
              commandes.current?.ouvrir(degres);
            }}
            className="min-h-11 flex-1 accent-(--color-accent)"
          />
          <span className="w-12 font-titre text-sm font-semibold tabular-nums">{ouverture}°</span>
        </label>
        <button
          type="button"
          aria-pressed={allume}
          onClick={() => {
            setAllume(!allume);
            commandes.current?.allumer(!allume);
          }}
          className="bouton bouton-secondaire"
        >
          Écran : {allume ? "allumé" : "éteint"}
        </button>
      </div>
      <p className="etiquette">Fais glisser pour tourner autour · molette ou pincement pour zoomer</p>
    </div>
  );
}

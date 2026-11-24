"use client";

// PROTOTYPE (branche feature/pokemon-3d-viewer) — visionneuse 3D d'un Pokémon.
// three.js est utilisé directement (sans surcouche React) : la scène est créée dans un useEffect,
// et React ne gère que les boutons et les informations autour.
// La bibliothèque three n'est téléchargée que lorsque ce composant s'affiche (import() dynamique).

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import type { RoleAnimation, RolesAnimation } from "@/lib/labo/modeles3d";

type Props = {
  url: string;
  nom: string;
  roles: RolesAnimation;
  animations: string[];
  ko: number; // poids du fichier, pour la barre de progression
  compacte?: boolean; // version réduite pour la fiche : zone plus petite, moins de boutons
};

// Ce que la scène three.js met à disposition des boutons React.
type Commandes = {
  jouer: (clip: string, boucle: boolean) => void;
  recadrer: () => void;
  tourner: (degres: number) => void;
  zoomer: (facteur: number) => void;
};

type Chargement = { etat: "chargement" | "pret" | "erreur"; progression: number; ms: number };

const LIBELLES_ROLES: Partial<Record<RoleAnimation, string>> = {
  attente: "Attente",
  physique: "Attaque physique",
  speciale: "Attaque à distance",
  degat: "Coup reçu",
  ko: "K.O.",
  marche: "Marche",
  rugissement: "Rugissement",
};
// Animations jouées en boucle ; les autres sont jouées une fois, puis retour à l'attente.
const ROLES_EN_BOUCLE: RoleAnimation[] = ["attente", "marche"];

// "pm0150_00_00_00001_battlewait01_loop" → "battlewait01_loop"
function nomCourt(clip: string): string {
  return clip.split("|").pop()!.replace(/^pm\d{4}_\d\d_\d\d_\d+_/, "");
}

export default function Visionneuse3D({ url, nom, roles, animations, ko, compacte = false }: Props) {
  const refConteneur = useRef<HTMLDivElement>(null);
  const refCommandes = useRef<Commandes | null>(null);
  const animationsReduites = useReducedMotion();

  const [chargement, setChargement] = useState<Chargement>({ etat: "chargement", progression: 0, ms: 0 });
  const [mesures, setMesures] = useState({ ips: 0, triangles: 0 });
  const [clipActif, setClipActif] = useState<string | null>(null);
  const [rotationAuto, setRotationAuto] = useState(false);
  const [generique, setGenerique] = useState(true);
  const [pause, setPause] = useState(false);

  // Les réglages sont lus par la boucle de rendu à travers des refs : les changer ne recrée pas la scène.
  const refReglages = useRef({ rotationAuto, generique, pause, animationsReduites, roles });
  useEffect(() => {
    refReglages.current = { rotationAuto, generique, pause, animationsReduites, roles };
  }, [rotationAuto, generique, pause, animationsReduites, roles]);

  useEffect(() => {
    const conteneur = refConteneur.current;
    if (!conteneur) return;
    let annule = false;
    let nettoyer = () => {};

    (async () => {
      // Téléchargés seulement ici : les pages sans 3D ne paient pas le poids de three.js.
      const THREE = await import("three");
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      const { DRACOLoader } = await import("three/examples/jsm/loaders/DRACOLoader.js");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      if (annule) return;

      /* ---------- Scène, caméra, lumières : identiques pour tous les Pokémon ---------- */
      const rendu = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // fond transparent
      rendu.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // au-delà de 2, coût élevé pour un gain invisible
      conteneur.appendChild(rendu.domElement);
      rendu.domElement.style.display = "block";

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 100);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x8090c8, 1.7)); // lumière d'ambiance (ciel / sol)
      const principale = new THREE.DirectionalLight(0xffffff, 2.2); // lumière principale, de face en haut
      principale.position.set(3, 5, 4);
      scene.add(principale);
      const contre = new THREE.DirectionalLight(0xbfd0ff, 0.9); // contre-jour : détache la silhouette
      contre.position.set(-4, 3, -3);
      scene.add(contre);

      // Rotation libre à 360°, zoom et déplacement de la caméra (souris, molette, doigts).
      const controles = new OrbitControls(camera, rendu.domElement);
      controles.enableDamping = true; // mouvement amorti, plus agréable

      // "socle" reçoit l'animation générique ; "pivot" reçoit la mise à l'échelle et le centrage.
      const socle = new THREE.Group();
      const pivot = new THREE.Group();
      socle.add(pivot);
      scene.add(socle);

      const adapter = () => {
        const largeur = conteneur.clientWidth;
        const hauteur = conteneur.clientHeight;
        rendu.setSize(largeur, hauteur, false);
        camera.aspect = largeur / Math.max(hauteur, 1);
        camera.updateProjectionMatrix();
      };
      const observateur = new ResizeObserver(adapter);
      observateur.observe(conteneur);
      adapter();

      nettoyer = () => {
        rendu.setAnimationLoop(null);
        observateur.disconnect();
        controles.dispose();
        // On libère la mémoire de la carte graphique : géométries, matériaux et textures.
        scene.traverse((objet) => {
          const maillage = objet as import("three").Mesh;
          if (!maillage.isMesh) return;
          maillage.geometry.dispose();
          const materiaux = Array.isArray(maillage.material) ? maillage.material : [maillage.material];
          for (const materiau of materiaux) {
            for (const valeur of Object.values(materiau)) {
              if (valeur && typeof valeur === "object" && "isTexture" in valeur) (valeur as import("three").Texture).dispose();
            }
            materiau.dispose();
          }
        });
        rendu.dispose();
        rendu.domElement.remove();
        refCommandes.current = null;
      };

      /* ---------- Chargement du modèle ---------- */
      // Les modèles sont compressés avec Draco. Pour ce prototype, le décodeur vient du CDN de Google ;
      // à l'intégration, il faudra le servir depuis notre site (dossier public/) pour ne dépendre de personne.
      const draco = new DRACOLoader().setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
      const chargeur = new GLTFLoader().setDRACOLoader(draco);
      const debut = performance.now();
      let gltf;
      try {
        gltf = await chargeur.loadAsync(url, (evenement) => {
          // total est parfois inconnu : on se rabat sur le poids noté dans le catalogue.
          const total = evenement.total || ko * 1024;
          if (!annule && total > 0) setChargement({ etat: "chargement", progression: Math.min(1, evenement.loaded / total), ms: 0 });
        });
      } catch {
        if (!annule) setChargement({ etat: "erreur", progression: 0, ms: 0 });
        return;
      } finally {
        draco.dispose();
      }
      if (annule) return; // le composant a disparu pendant le téléchargement (nettoyer a déjà été appelé)

      const objet = gltf.scene;
      pivot.add(objet);
      const melangeur = new THREE.AnimationMixer(objet);
      const clips = new Map(gltf.animations.map((clip) => [clip.name, clip]));
      let action: import("three").AnimationAction | null = null;
      let roleActif: RoleAnimation | null = null;

      function jouer(nomClip: string, boucle: boolean) {
        const clip = clips.get(nomClip);
        if (!clip) return;
        const suivante = melangeur.clipAction(clip);
        suivante.reset();
        suivante.setLoop(boucle ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
        suivante.clampWhenFinished = true; // une animation jouée une fois reste sur sa dernière image
        if (action && action !== suivante) suivante.crossFadeFrom(action, 0.18, false); // fondu enchaîné
        suivante.play();
        action = suivante;
        const reglages = refReglages.current.roles;
        roleActif = (Object.keys(reglages) as RoleAnimation[]).find((role) => reglages[role] === nomClip) ?? null;
        setClipActif(nomClip);
      }

      // À la fin d'une animation jouée une fois : le K.O. enchaîne sur sa boucle, le reste revient à l'attente.
      melangeur.addEventListener("finished", () => {
        const r = refReglages.current.roles;
        if (roleActif === "ko") {
          if (r.koBoucle) jouer(r.koBoucle, true);
        } else if (r.attente) {
          jouer(r.attente, true);
        }
      });

      /* ---------- Expérience homogène : même taille, même cadrage pour tous ---------- */
      // La pose de départ est celle de l'animation d'attente (la pose « de construction » de certains
      // modèles est déformée), sauf en animations réduites où rien ne démarre tout seul.
      const attente = refReglages.current.roles.attente;
      if (attente) {
        jouer(attente, true);
        melangeur.update(0);
        // Animations réduites : le modèle prend sa pose d'attente mais reste immobile tant qu'on ne clique pas « Reprendre ».
        if (refReglages.current.animationsReduites) setPause(true);
      }
      objet.updateMatrixWorld(true);
      objet.traverse((enfant) => {
        // Pour un maillage à squelette, la boîte englobante doit tenir compte de la pose des os.
        const maillage = enfant as import("three").SkinnedMesh;
        if (maillage.isSkinnedMesh) maillage.computeBoundingBox();
      });
      const boite = new THREE.Box3().setFromObject(objet);
      const taille = boite.getSize(new THREE.Vector3());
      // Tous les modèles sont ramenés à 2 unités dans leur plus grande dimension utile.
      const echelle = 2 / Math.max(taille.y, taille.x * 0.8, taille.z * 0.8, 0.0001);
      const centre = boite.getCenter(new THREE.Vector3());
      pivot.scale.setScalar(echelle);
      pivot.position.set(-centre.x * echelle, -boite.min.y * echelle, -centre.z * echelle); // centré, pieds au sol

      const hauteur = taille.y * echelle;
      const rayon = (Math.max(taille.x, taille.y, taille.z) * echelle) / 2;
      const cible = new THREE.Vector3(0, hauteur / 2, 0);
      const distance = (rayon / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.2;

      function recadrer() {
        const angle = THREE.MathUtils.degToRad(28); // vue de trois quarts
        camera.position.set(Math.sin(angle) * distance, cible.y + distance * 0.16, Math.cos(angle) * distance);
        controles.target.copy(cible);
        controles.minDistance = distance * 0.35;
        controles.maxDistance = distance * 2.5;
        controles.update();
      }
      recadrer();

      // Ombre au sol : un disque dont la texture est un dégradé dessiné dans un petit <canvas>.
      const dessin = document.createElement("canvas");
      dessin.width = dessin.height = 128;
      const contexte = dessin.getContext("2d")!;
      const degrade = contexte.createRadialGradient(64, 64, 4, 64, 64, 64);
      degrade.addColorStop(0, "rgba(10,14,40,0.55)");
      degrade.addColorStop(1, "rgba(10,14,40,0)");
      contexte.fillStyle = degrade;
      contexte.fillRect(0, 0, 128, 128);
      const largeurOmbre = Math.max(taille.x, taille.z) * echelle * 1.5;
      const ombre = new THREE.Mesh(
        new THREE.PlaneGeometry(largeurOmbre, largeurOmbre),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(dessin), transparent: true, depthWrite: false }),
      );
      ombre.rotation.x = -Math.PI / 2;
      ombre.position.y = 0.002;
      scene.add(ombre);

      refCommandes.current = {
        jouer,
        recadrer,
        // Tourne la caméra autour du Pokémon (équivalent clavier du glisser à la souris).
        tourner: (degres) => {
          const decalage = camera.position.clone().sub(controles.target);
          decalage.applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(degres));
          camera.position.copy(controles.target).add(decalage);
        },
        zoomer: (facteur) => {
          const decalage = camera.position.clone().sub(controles.target);
          const longueur = THREE.MathUtils.clamp(decalage.length() * facteur, controles.minDistance, controles.maxDistance);
          camera.position.copy(controles.target).add(decalage.setLength(longueur));
        },
      };

      let triangles = 0;
      objet.traverse((enfant) => {
        const maillage = enfant as import("three").Mesh;
        if (maillage.isMesh) triangles += (maillage.geometry.index?.count ?? maillage.geometry.attributes.position.count) / 3;
      });
      setChargement({ etat: "pret", progression: 1, ms: Math.round(performance.now() - debut) });

      /* ---------- Boucle de rendu ---------- */
      const horloge = new THREE.Clock();
      let temps = 0;
      let images = 0;
      let derniereSeconde = performance.now();
      rendu.setAnimationLoop(() => {
        const dt = Math.min(horloge.getDelta(), 0.1);
        const reglages = refReglages.current;
        if (!reglages.pause) melangeur.update(dt);

        // Animation générique pour un modèle sans animation d'origine : il flotte, respire et oscille
        // légèrement. On bouge le modèle entier (aucun os), donc cela marche avec n'importe quel modèle.
        const generiqueActive = reglages.generique && !reglages.animationsReduites && !reglages.pause && action === null;
        if (generiqueActive) {
          temps += dt;
          socle.position.y = Math.sin(temps * 1.6) * 0.03 + 0.03;
          socle.rotation.y = Math.sin(temps * 0.7) * 0.14;
          socle.scale.y = 1 + Math.sin(temps * 1.6) * 0.012;
        } else if (action === null) {
          socle.position.y = 0;
          socle.rotation.y = 0;
          socle.scale.y = 1;
        }

        controles.autoRotate = reglages.rotationAuto && !reglages.animationsReduites;
        controles.update();
        rendu.render(scene, camera);

        images += 1;
        const maintenant = performance.now();
        if (maintenant - derniereSeconde >= 1000) {
          setMesures({ ips: images, triangles: Math.round(triangles) });
          images = 0;
          derniereSeconde = maintenant;
        }
      });
    })();

    return () => {
      annule = true;
      nettoyer();
    };
    // La scène n'est recréée que si le modèle change.
  }, [url, ko]);

  const commandes = refCommandes;
  const boutonsRoles = (Object.keys(LIBELLES_ROLES) as RoleAnimation[]).filter((role) => roles[role]);
  const clipsDesRoles = new Set(Object.values(roles));
  const autresClips = animations.filter((clip) => !clipsDesRoles.has(clip));

  return (
    <div className="flex flex-col gap-4">
      <div className={`verre relative overflow-hidden ${compacte ? "h-72" : "h-[26rem] sm:h-[30rem]"}`}>
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_70%,var(--teinte,var(--color-accent)),transparent_62%)] opacity-25" />
        {/* role="img" + libellé : la zone 3D est annoncée comme une image par les lecteurs d'écran. */}
        <div ref={refConteneur} role="img" aria-label={`Modèle 3D de ${nom}, orientable à la souris ou avec les boutons ci-dessous`} className="absolute inset-0 touch-none" />

        {chargement.etat === "chargement" && (
          <div role="status" className="absolute inset-x-6 bottom-6 flex flex-col gap-2">
            <p className="etiquette">Chargement du modèle… {Math.round(chargement.progression * 100)} %</p>
            <div className="h-2 overflow-hidden rounded-full bg-piste">
              <div className="h-full origin-left rounded-full bg-accent" style={{ transform: `scaleX(${chargement.progression})` }} />
            </div>
          </div>
        )}
        {chargement.etat === "erreur" && (
          <p role="alert" className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-danger">
            Le modèle 3D n&apos;a pas pu être chargé.
          </p>
        )}
      </div>

      {/* Mesures en direct : utiles pour juger les performances sur l'appareil utilisé. */}
      {!compacte && (
        <p className="etiquette">
          {chargement.etat === "pret"
            ? `${mesures.ips} images/s · ${mesures.triangles.toLocaleString("fr-FR")} triangles · chargé en ${chargement.ms} ms · ${(ko / 1024).toFixed(1)} Mo`
            : " "}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" className="bouton bouton-secondaire" onClick={() => commandes.current?.tourner(-30)} aria-label="Tourner vers la gauche">
          ↺
        </button>
        <button type="button" className="bouton bouton-secondaire" onClick={() => commandes.current?.tourner(30)} aria-label="Tourner vers la droite">
          ↻
        </button>
        {!compacte && (
          <>
            <button type="button" className="bouton bouton-secondaire" onClick={() => commandes.current?.zoomer(0.8)} aria-label="Zoomer">
              +
            </button>
            <button type="button" className="bouton bouton-secondaire" onClick={() => commandes.current?.zoomer(1.25)} aria-label="Dézoomer">
              −
            </button>
          </>
        )}
        <button type="button" className="bouton bouton-secondaire" onClick={() => commandes.current?.recadrer()}>
          Recentrer
        </button>
        <button type="button" className="bouton bouton-secondaire" aria-pressed={rotationAuto} onClick={() => setRotationAuto((v) => !v)}>
          Rotation auto : {rotationAuto ? "oui" : "non"}
        </button>
        {animations.length > 0 ? (
          <button type="button" className="bouton bouton-secondaire" aria-pressed={pause} onClick={() => setPause((v) => !v)}>
            {pause ? "Reprendre" : "Pause"}
          </button>
        ) : (
          <button type="button" className="bouton bouton-secondaire" aria-pressed={generique} onClick={() => setGenerique((v) => !v)}>
            Animation générique : {generique ? "oui" : "non"}
          </button>
        )}
      </div>

      {animations.length > 0 && (
        <section aria-labelledby="titre-animations" className="flex flex-col gap-2">
          <h3 id="titre-animations" className="etiquette">
            Animations d&apos;origine ({animations.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {boutonsRoles.map((role) => (
              <button
                key={role}
                type="button"
                aria-pressed={clipActif === roles[role]}
                onClick={() => commandes.current?.jouer(roles[role]!, ROLES_EN_BOUCLE.includes(role))}
                className={`bouton ${clipActif === roles[role] ? "bouton-principal" : "bouton-secondaire"}`}
              >
                {LIBELLES_ROLES[role]}
              </button>
            ))}
          </div>
          {!compacte && autresClips.length > 0 && (
            <details className="text-sm">
              <summary className="etiquette min-h-11 cursor-pointer py-3">Toutes les autres animations ({autresClips.length})</summary>
              <div className="flex flex-wrap gap-2 pt-2">
                {autresClips.map((clip) => (
                  <button
                    key={clip}
                    type="button"
                    onClick={() => commandes.current?.jouer(clip, /loop/i.test(clip))}
                    className={`rounded-full border px-3 py-1 text-xs ${clipActif === clip ? "border-accent text-accent" : "border-bordure text-texte-doux"}`}
                  >
                    {nomCourt(clip)}
                  </button>
                ))}
              </div>
            </details>
          )}
        </section>
      )}
    </div>
  );
}

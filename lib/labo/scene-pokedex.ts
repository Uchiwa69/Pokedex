// Prépare la scène three.js du Pokédex 3D : environnement de studio, lumières, modèle, reflets adoucis.
// Utilisée par l'introduction de l'accueil (components/IntroPokedex.tsx). Les réglages de lumière et de reflets
// sont ceux validés par l'utilisateur sur la page de test /labo/pokedex-3d.
// THREE et le modèle sont reçus en paramètres : ils sont chargés à la demande (import dynamique) par l'appelant.

type Trois = typeof import("three");
type Modele = typeof import("@/lib/labo/pokedex3d");

// Couleur de fond du site (--color-fond). L'écran de l'appareil la reprend : la vraie page, affichée par-dessus,
// a ainsi le même fond qu'en vrai.
const FOND = 0x070a1c;

export function preparerScenePokedex(THREE: Trois, modele: Modele, rendu: import("three").WebGLRenderer) {
  // Rendu « cinéma » : compresse les fortes lumières comme un appareil photo (reflets moins brûlés).
  rendu.toneMapping = THREE.ACESFilmicToneMapping;
  rendu.toneMappingExposure = 0.95;

  const scene = new THREE.Scene();
  // Environnement de studio : c'est lui que le plastique reflète. Intensité basse : reflets discrets.
  const generateur = new THREE.PMREMGenerator(rendu);
  const environnement = modele.createStudioEnvironment(generateur);
  scene.environment = environnement;
  scene.environmentIntensity = 0.28;

  // Éclairage de studio à trois points, plus une lumière d'ambiance.
  scene.add(new THREE.AmbientLight(0xffffff, 0.3));
  const principale = new THREE.DirectionalLight(0xffffff, 1.05);
  principale.position.set(4.5, 6.5, 6.5);
  const appoint = new THREE.DirectionalLight(0xe0ecff, 0.75);
  appoint.position.set(-6, 2, 4.5);
  const contreJour = new THREE.DirectionalLight(0xffffff, 0.35);
  contreJour.position.set(0, 4.5, -6);
  scene.add(principale, appoint, contreJour);

  const pokedex = modele.buildPokedexAssembly();
  scene.add(pokedex.rootGroup);

  // L'écran : on retrouve la plaque qui porte le matériau de l'écran, et on lui donne un aplat de la couleur
  // du site (MeshBasicMaterial = aucune lumière, aucun reflet ; toneMapped: false = couleur exacte).
  let ecran: import("three").Mesh | null = null;
  // Reflets adoucis : le fichier d'origine donne aux plastiques un vernis miroir. On réduit le vernis et on
  // augmente la rugosité : la surface reste brillante, mais les reflets sont plus larges et moins éclatants.
  pokedex.rootGroup.traverse((objet: import("three").Object3D) => {
    const maillage = objet as import("three").Mesh;
    const materiau = maillage.material as import("three").MeshPhysicalMaterial | undefined;
    if (!materiau) return;
    if (materiau === pokedex.screenDisplayMat) {
      ecran = maillage;
      return;
    }
    if (!("clearcoat" in materiau) || materiau.transmission > 0) return;
    materiau.clearcoat = Math.min(materiau.clearcoat, 0.25);
    materiau.clearcoatRoughness = Math.max(materiau.clearcoatRoughness, 0.3);
    materiau.roughness = Math.max(materiau.roughness, 0.38);
  });
  const plaqueEcran = ecran as import("three").Mesh | null;
  if (plaqueEcran) plaqueEcran.material = new THREE.MeshBasicMaterial({ color: FOND, toneMapped: false });

  // Libération de la mémoire de la carte graphique : géométries et matériaux de toutes les pièces.
  function liberer() {
    environnement.dispose();
    generateur.dispose();
    scene.traverse((objet) => {
      const maillage = objet as import("three").Mesh;
      maillage.geometry?.dispose();
      const materiaux = Array.isArray(maillage.material) ? maillage.material : maillage.material ? [maillage.material] : [];
      for (const materiau of materiaux) materiau.dispose();
    });
  }

  return { scene, pokedex, ecran: plaqueEcran, liberer };
}

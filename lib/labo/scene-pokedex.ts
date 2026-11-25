// Prépare la scène three.js du Pokédex 3D : environnement de studio, lumières, modèle, reflets adoucis.
// Utilisée par l'introduction de l'accueil (components/IntroPokedex.tsx). Les réglages de lumière et de reflets
// sont ceux validés par l'utilisateur sur la page de test /labo/pokedex-3d.
// THREE et le modèle sont reçus en paramètres : ils sont chargés à la demande (import dynamique) par l'appelant.

type Trois = typeof import("three");
type Modele = typeof import("@/lib/labo/pokedex3d");

// Couleur de fond du site (--color-fond). L'écran de l'appareil la reprend : la vraie page, affichée par-dessus,
// a ainsi le même fond qu'en vrai.
const FOND_PAR_DEFAUT = "#0f1115"; // si le jeton est illisible : le fond du thème sombre

// Rend la main au navigateur un instant : la préparation est découpée en étapes pour ne pas figer la page
// d'un seul bloc (il peut dessiner et répondre au visiteur entre deux étapes).
const ceder = () => new Promise<void>((suite) => setTimeout(suite, 0));

export async function preparerScenePokedex(THREE: Trois, modele: Modele, rendu: import("three").WebGLRenderer) {
  // Rendu « cinéma » : compresse les fortes lumières comme un appareil photo (reflets moins brûlés).
  rendu.toneMapping = THREE.ACESFilmicToneMapping;
  rendu.toneMappingExposure = 0.95;

  const scene = new THREE.Scene();
  // Environnement de studio : c'est lui que le plastique reflète. Intensité basse : reflets discrets.
  const generateur = new THREE.PMREMGenerator(rendu);
  const environnement = modele.createStudioEnvironment(generateur);
  scene.environment = environnement;
  scene.environmentIntensity = 0.28;

  await ceder();

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
  await ceder();

  // L'écran : on retrouve la plaque qui porte le matériau de l'écran, et on lui donne un aplat de la couleur
  // du site (MeshBasicMaterial = aucune lumière, aucun reflet ; toneMapped: false = couleur exacte).
  let ecran: import("three").Mesh | null = null;
  // Reflets adoucis : le fichier d'origine donne aux plastiques un vernis miroir. On retire le vernis et on
  // augmente la rugosité : la surface reste brillante, mais les reflets sont plus larges et moins éclatants.
  pokedex.rootGroup.traverse((objet: import("three").Object3D) => {
    const maillage = objet as import("three").Mesh;
    const materiau = maillage.material as import("three").MeshPhysicalMaterial | undefined;
    if (!materiau) return;
    if (materiau === pokedex.screenDisplayMat) {
      ecran = maillage;
      return;
    }
    if (!("clearcoat" in materiau)) return;
    // Performance : un matériau « transmission » (le verre de la lentille) oblige three.js à dessiner TOUTE la
    // scène une seconde fois à chaque image, pour calculer ce qu'on voit à travers. On le remplace par une
    // simple transparence, presque identique à l'œil, et on coupe l'irisation (calcul coûteux par pixel).
    materiau.iridescence = 0;
    if (materiau.transmission > 0) {
      materiau.transmission = 0;
      materiau.transparent = true;
      materiau.opacity = 0.35;
      return;
    }
    // Performance : le vernis (clearcoat) est coupé. Il faisait calculer un second reflet pour CHAQUE pixel de
    // plastique, à chaque image du défilement ; à 0, three.js fabrique un shader bien plus léger. La rugosité
    // est un peu baissée en échange, pour garder un plastique brillant.
    materiau.clearcoat = 0;
    materiau.roughness = Math.max(materiau.roughness, 0.32);
  });
  const plaqueEcran = ecran as import("three").Mesh | null;
  if (plaqueEcran) {
    // La couleur est lue sur le jeton --color-fond : elle suit le thème (sombre ou clair) en cours.
    const fond = getComputedStyle(document.documentElement).getPropertyValue("--color-fond").trim() || FOND_PAR_DEFAUT;
    plaqueEcran.material = new THREE.MeshBasicMaterial({ color: fond, toneMapped: false });
    // Le cadre gris clair autour de l'écran est retiré (choix de l'utilisateur) : dans le groupe de l'écran, on ne
    // garde visible que la plaque. Elle est agrandie pour occuper la place du cadre (2,16 × 1,66 → 2,42 × 1,92).
    for (const piece of plaqueEcran.parent?.children ?? []) piece.visible = piece === plaqueEcran;
    plaqueEcran.scale.set(2.42 / 2.16, 1.92 / 1.66, 1);
  }

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

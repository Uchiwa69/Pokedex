// Séquence d'ouverture « la page brûle » (components/ScenesElements.tsx) : Dracaufeu crache un souffle de
// flammes qui envahit l'écran, puis l'écran se consume comme une feuille de papier et laisse voir la vraie page.
//
// Le dessin est fait par UN shader, sur un rectangle qui couvre l'écran. Il reçoit « uProgression », un nombre
// de 0 à 1 qui vient du défilement. Le canvas est posé PAR-DESSUS la page : là où le shader écrit un pixel
// transparent (le papier a brûlé), on voit la page derrière.
// Cinq variantes du shader, fournies par l'utilisateur (générées avec Gemini) : une par fichier de ce dossier.
// « plaques » et « erosion » sont la version 2 (le souffle retombe avant que la page se désintègre).
// three.js est chargé à la demande (import()) : il ne pèse rien tant que la séquence n'est pas affichée.

export const IMAGE_DRACAUFEU =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png";

export const VARIANTES_FEU = ["plaques", "erosion", "cinema", "pyroclastique", "leger"] as const;
export type VarianteFeu = (typeof VARIANTES_FEU)[number];

const FOND_PAR_DEFAUT = "#0f1115"; // si le jeton --color-fond est illisible : le fond du thème sombre

const SHADER_SOMMETS = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  // Le rectangle (de -1 à 1) couvre exactement l'écran : pas de caméra, pas de perspective.
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// Chaque variante est dans son fichier, téléchargé seulement si on la demande (table de correspondance).
const CHARGER_SHADER: Record<VarianteFeu, () => Promise<string>> = {
  plaques: () => import("./plaques").then((module) => module.SHADER_PLAQUES),
  erosion: () => import("./erosion").then((module) => module.SHADER_EROSION),
  cinema: () => import("./cinema").then((module) => module.SHADER_CINEMA),
  pyroclastique: () => import("./pyroclastique").then((module) => module.SHADER_PYROCLASTIQUE),
  leger: () => import("./leger").then((module) => module.SHADER_LEGER),
};

export type SceneFeu = {
  dessiner: (progression: number) => void;
  redimensionner: (largeur: number, hauteur: number) => void;
  actualiserTheme: () => void;
  liberer: () => void;
};

// Prépare la scène dans le canvas donné. Lève une erreur si WebGL ou l'image est indisponible :
// l'appelant retire alors la séquence et la page s'affiche normalement.
export async function creerSceneFeu(toile: HTMLCanvasElement, variante: VarianteFeu): Promise<SceneFeu> {
  const [THREE, shaderPixels] = await Promise.all([import("three"), CHARGER_SHADER[variante]()]);
  const image = await new THREE.TextureLoader().loadAsync(IMAGE_DRACAUFEU);
  // Pas de versions réduites (mipmaps) : l'illustration est affichée à peu près à sa taille.
  image.generateMipmaps = false;
  image.minFilter = THREE.LinearFilter;

  // alpha: true = le canvas peut être transparent. premultipliedAlpha (vrai par défaut) : les shaders écrivent
  // déjà leurs couleurs multipliées par leur opacité.
  const rendu = new THREE.WebGLRenderer({ canvas: toile, alpha: true, antialias: false });
  // Un pixel de dessin par pixel CSS, même sur un écran dense : flammes et fumée sont des formes douces,
  // et un téléphone a trois fois moins de pixels à calculer.
  rendu.setPixelRatio(1);
  rendu.setClearColor(0x000000, 0);

  const uniformes = {
    uTemps: { value: 0 },
    uProgression: { value: 0 },
    uProportions: { value: 1 },
    uQualite: { value: window.matchMedia("(pointer: coarse)").matches ? 0.5 : 1 },
    uIntensiteSecousse: { value: 0.015 }, // amplitude du tremblement (valeur conseillée avec les shaders)
    uImage: { value: image },
    uFond: { value: [0, 0, 0] },
    uCentre: { value: [0, 0] },
    uTaille: { value: 0.6 },
  };
  const materiau = new THREE.ShaderMaterial({
    vertexShader: SHADER_SOMMETS,
    fragmentShader: shaderPixels,
    uniforms: uniformes,
    blending: THREE.NoBlending, // le pixel calculé est écrit tel quel dans le canvas
    depthTest: false,
    depthWrite: false,
  });
  const geometrie = new THREE.PlaneGeometry(2, 2);
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(geometrie, materiau));
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const naissance = performance.now();

  // La couleur de la page est lue sur le jeton --color-fond : la séquence suit le thème (sombre ou clair).
  function actualiserTheme() {
    const fond = getComputedStyle(document.documentElement).getPropertyValue("--color-fond").trim() || FOND_PAR_DEFAUT;
    const couleur = new THREE.Color(fond);
    couleur.convertLinearToSRGB(); // valeurs d'écran : le shader écrit ses couleurs telles quelles
    uniformes.uFond.value = [couleur.r, couleur.g, couleur.b];
  }
  actualiserTheme();

  return {
    dessiner(progression) {
      uniformes.uProgression.value = progression;
      uniformes.uTemps.value = (performance.now() - naissance) / 1000;
      rendu.render(scene, camera);
    },

    redimensionner(largeur, hauteur) {
      rendu.setSize(largeur, hauteur, false);
      const proportions = largeur / hauteur;
      uniformes.uProportions.value = proportions;
      // Écran large : Dracaufeu à droite (le texte est à gauche). Téléphone : au milieu, un peu plus petit.
      uniformes.uTaille.value = Math.min(0.66, proportions * 0.92);
      uniformes.uCentre.value = proportions > 1.2 ? [proportions * 0.2, -0.06] : [0, -0.1];
    },

    actualiserTheme,

    liberer() {
      image.dispose();
      geometrie.dispose();
      materiau.dispose();
      rendu.dispose();
    },
  };
}

// Séquence de fin de page « l'écran brûle » (components/SequenceFeu.tsx) : Dracaufeu crache un souffle de flammes
// qui envahit l'écran, puis l'écran se consume et laisse voir ce qui est derrière lui.
//
// Le dessin est fait par UN shader (erosion.ts), sur un rectangle qui couvre l'écran. Il reçoit « uProgression »,
// un nombre de 0 à 1 qui vient du défilement. Le canvas est posé PAR-DESSUS la page : là où le shader écrit un
// pixel transparent (tout a brûlé), on voit la page derrière.
// three.js et le shader sont chargés à la demande (import()) : ils ne pèsent rien tant que la séquence est loin.

// Trois images superposables de Dracaufeu (repos, inspiration, souffle) : même pose, seule la tête change.
// Générées par IA (Gemini) à la demande de l'utilisateur, détourées, rangées dans public/dracaufeu.
const IMAGES = ["/dracaufeu/repos.webp", "/dracaufeu/inspiration.webp", "/dracaufeu/souffle.webp"];

const FOND_PAR_DEFAUT = "#0f1115"; // si le jeton --color-fond est illisible : le fond du thème sombre

const SHADER_SOMMETS = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  // Le rectangle (de -1 à 1) couvre exactement l'écran : pas de caméra, pas de perspective.
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export type SceneFeu = {
  // capture : où est la Pokéball 3D (fractions d'écran, comme dans lib/pokeball/pose.ts) et à quel point elle aspire.
  dessiner: (progression: number, capture: { fx: number; fy: number; force: number }) => void;
  redimensionner: (largeur: number, hauteur: number) => void;
  liberer: () => void;
};

// Prépare la scène dans le canvas donné. Lève une erreur si WebGL ou l'image est indisponible :
// l'appelant retire alors la séquence et la page s'affiche normalement.
export async function creerSceneFeu(toile: HTMLCanvasElement): Promise<SceneFeu> {
  // Promise.all : three.js et le shader sont téléchargés en même temps.
  const [THREE, { SHADER_EROSION }] = await Promise.all([import("three"), import("./erosion")]);
  const chargeur = new THREE.TextureLoader();
  const images = await Promise.all(IMAGES.map((adresse) => chargeur.loadAsync(adresse)));
  for (const image of images) {
    // Pas de versions réduites (mipmaps) : l'image est affichée à peu près à sa taille.
    image.generateMipmaps = false;
    image.minFilter = THREE.LinearFilter;
  }

  // alpha: true = le canvas peut être transparent. premultipliedAlpha (vrai par défaut) : les shaders écrivent
  // déjà leurs couleurs multipliées par leur opacité.
  const rendu = new THREE.WebGLRenderer({ canvas: toile, alpha: true, antialias: false });
  // Téléphone : un pixel de dessin par pixel CSS (trois fois moins de pixels à calculer). Ordinateur : on suit
  // la densité de l'écran jusqu'à 1,5, sinon les fins liserés de braise sont agrandis et paraissent en escalier.
  const tactile = window.matchMedia("(pointer: coarse)").matches;
  rendu.setPixelRatio(tactile ? 1 : Math.min(window.devicePixelRatio, 1.5));
  rendu.setClearColor(0x000000, 0);

  const uniformes = {
    uTemps: { value: 0 },
    uProgression: { value: 0 },
    uProportions: { value: 1 },
    uQualite: { value: tactile ? 0.5 : 1 },
    uIntensiteSecousse: { value: 0.015 }, // amplitude du tremblement (valeur conseillée avec les shaders)
    uImage: { value: images[0] },
    uImage2: { value: images[1] },
    uImage3: { value: images[2] },
    uFond: { value: [0, 0, 0] },
    uCentre: { value: [0, 0] },
    uTaille: { value: 0.6 },
    uPokeball: { value: [0, 0] },
    uAspiration: { value: 0 },
  };
  const materiau = new THREE.ShaderMaterial({
    vertexShader: SHADER_SOMMETS,
    fragmentShader: SHADER_EROSION,
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

  // La couleur de la page est lue sur le jeton --color-fond (app/globals.css), une fois : le site n'a qu'un thème.
  const fond = getComputedStyle(document.documentElement).getPropertyValue("--color-fond").trim() || FOND_PAR_DEFAUT;
  const couleur = new THREE.Color(fond);
  couleur.convertLinearToSRGB(); // valeurs d'écran : le shader écrit ses couleurs telles quelles
  uniformes.uFond.value = [couleur.r, couleur.g, couleur.b];

  return {
    dessiner(progression, capture) {
      uniformes.uProgression.value = progression;
      // Fractions d'écran → unités du shader (1 = la hauteur de l'écran, d'où « × proportions » sur la largeur).
      uniformes.uPokeball.value = [capture.fx * uniformes.uProportions.value, capture.fy];
      uniformes.uAspiration.value = capture.force;
      uniformes.uTemps.value = (performance.now() - naissance) / 1000;
      rendu.render(scene, camera);
    },

    redimensionner(largeur, hauteur) {
      rendu.setSize(largeur, hauteur, false);
      const proportions = largeur / hauteur;
      uniformes.uProportions.value = proportions;
      // Écran large : Dracaufeu à droite (le texte est à gauche). Téléphone : au milieu, un peu plus petit.
      uniformes.uTaille.value = Math.min(0.82, proportions * 0.98);
      uniformes.uCentre.value = proportions > 1.2 ? [proportions * 0.2, -0.06] : [0, -0.1];
    },

    liberer() {
      for (const image of images) image.dispose();
      geometrie.dispose();
      materiau.dispose();
      rendu.dispose();
    },
  };
}

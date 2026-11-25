// Séquence « feu contre eau » jouée au défilement (components/ScenesElements.tsx) : Dracaufeu crache une boule
// de feu qui envahit l'écran, l'écran part en cendres, puis Tortank le lave avec ses canons.
//
// Tout est dessiné par UN SEUL shader, sur un rectangle qui couvre l'écran. Il reçoit « uProgression », un
// nombre de 0 à 1 qui vient du défilement : chaque étape de la séquence correspond à une tranche de ce nombre.
// Les deux illustrations sont des textures : le shader peut ainsi les recouvrir de flammes, de cendres ou d'eau.
// three.js est chargé à la demande (import()) : il ne pèse rien tant que la séquence n'est pas affichée.

import { GLSL_COMMUN } from "@/lib/effets-types/commun";

const ARTWORK = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork";
export const IMAGE_DRACAUFEU = `${ARTWORK}/6.png`;
export const IMAGE_TORTANK = `${ARTWORK}/9.png`;

const FOND_PAR_DEFAUT = "#0f1115"; // si le jeton --color-fond est illisible : le fond du thème sombre

const SHADER_SOMMETS = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  // Le rectangle (de -1 à 1) couvre exactement l'écran : pas de caméra, pas de perspective.
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// GLSL_COMMUN apporte uTemps, uProportions, uProgression, uQualite et les outils de bruit (fbm, hachage…).
const SHADER_PIXELS = /* glsl */ `
${GLSL_COMMUN}
uniform sampler2D uImageFeu;
uniform sampler2D uImageEau;
uniform vec3 uFond;        // couleur de la page (jeton --color-fond)
uniform vec2 uCentreFeu;   // centre de Dracaufeu (l'unité est la hauteur de l'écran, 0 = milieu)
uniform vec2 uCentreEau;   // centre de Tortank
uniform float uTaille;     // côté des illustrations
varying vec2 vUv;

// Lit une illustration posée en « centre ». En dehors de son carré, elle est transparente.
vec4 lireImage(sampler2D image, vec2 p, vec2 centre) {
  vec2 uv = (p - centre) / uTaille + 0.5;
  vec2 dedans = step(vec2(0.0), uv) * step(uv, vec2(1.0));
  vec4 pixel = texture2D(image, clamp(uv, 0.0, 1.0));
  pixel.a *= dedans.x * dedans.y;
  return pixel;
}

// Couleur d'une flamme selon sa chaleur : rouge sombre, orange, jaune, puis presque blanc.
vec3 rampeFeu(float chaleur) {
  vec3 c = mix(vec3(0.45, 0.02, 0.0), vec3(1.0, 0.30, 0.02), smoothstep(0.0, 0.40, chaleur));
  c = mix(c, vec3(1.0, 0.72, 0.16), smoothstep(0.35, 0.75, chaleur));
  return mix(c, vec3(1.0, 0.96, 0.82), smoothstep(0.78, 1.10, chaleur));
}

// Flocons de cendre qui tombent : une grille invisible, un flocon au hasard dans certaines cases.
float cendresVolantes(vec2 p, float t) {
  float total = 0.0;
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    vec2 g = p * (9.0 + fi * 7.0) + vec2(sin(t * 0.3 + fi) * 0.6, t * (0.5 + fi * 0.3));
    vec2 hasard = hachage22(floor(g) + fi * 31.0);
    float taille = 0.04 + 0.05 * hasard.x;
    float flocon = smoothstep(taille, taille * 0.4, length(fract(g) - 0.5 - (hasard - 0.5) * 0.7));
    total += flocon * step(0.72, hasard.y);
  }
  return total;
}

// Jet d'eau parti du point « a » dans la direction « dir » : renvoie sa matière (0 = rien) et, dans
// « ecume », la part de blanc. Il s'élargit en s'éloignant, et des stries filent le long du jet.
float jetEau(vec2 p, vec2 a, vec2 dir, float longueur, float t, out float ecume) {
  vec2 rel = p - a;
  float le = dot(rel, dir);                       // distance le long du jet
  float tr = dot(rel, vec2(-dir.y, dir.x));       // écart par rapport à son axe
  float largeur = 0.035 * uTaille + le * 0.17;
  float stries = fbm(vec2(le * 7.0 - t * 5.0, tr * 26.0), 3.0);
  float matiere = 1.0 - abs(tr) / max(largeur, 0.0001) + (stries - 0.5) * 0.7;
  matiere *= step(0.0, le) * (1.0 - smoothstep(longueur * 0.8, longueur, le));
  ecume = smoothstep(0.35, 0.75, stries);
  return clamp(matiere, 0.0, 1.0);
}

void main() {
  float P = uProgression;
  float t = uTemps;
  float octaves = mix(3.0, 4.0, step(0.75, uQualite));   // bruit moins fin sur téléphone
  // Coordonnées « carrées » : 1 = la hauteur de l'écran dans les deux sens (un cercle reste rond).
  vec2 p = (vUv - 0.5) * vec2(uProportions, 1.0);
  float diagonale = length(vec2(uProportions, 1.0));

  // Les étapes de la séquence : chacune passe de 0 à 1 sur sa tranche du défilement.
  float boule   = clamp((P - 0.06) / 0.34, 0.0, 1.0);   // la boule de feu grossit (régulièrement)
  float cendres = smoothstep(0.42, 0.58, P);   // le feu laisse place aux cendres
  float arrivee = smoothstep(0.54, 0.63, P);   // Tortank apparaît
  float jet     = smoothstep(0.62, 0.74, P) * (1.0 - smoothstep(0.90, 0.99, P));
  float lavage  = smoothstep(0.70, 0.94, P);   // la vague nettoie l'écran

  // 1. La page propre, avec Dracaufeu.
  vec3 couleur = uFond;
  vec4 dracaufeu = lireImage(uImageFeu, p, uCentreFeu);
  couleur = mix(couleur, dracaufeu.rgb, dracaufeu.a);

  // 2. La boule de feu : elle naît dans la gueule, avance vers le milieu de l'écran et grossit jusqu'à tout
  //    couvrir. Son bord est déformé par du bruit qui monte : ce sont les flammes.
  vec2 gueule = uCentreFeu + vec2(-0.10, 0.31) * uTaille;
  vec2 centre = mix(gueule, vec2(0.0), smoothstep(0.0, 0.8, boule));
  // Croissance « en pourcentage » (le rayon est multiplié, pas additionné) : régulière à l'œil du début à la fin.
  float rayon = 0.05 * uTaille * pow(1.8 * diagonale / (0.05 * uTaille), boule) * (1.0 + 0.06 * sin(t * 7.0));
  vec2 q = p - centre;
  // Bruit plus serré quand la boule est petite, pour qu'elle ait déjà des flammes.
  float finesse = 3.2 / pow(clamp(rayon, 0.08, 1.0), 0.75);
  // Bruit étiré en hauteur (y compte moitié moins) : des langues de feu qui montent, pas des taches rondes.
  vec2 qf = q * vec2(1.0, 0.5) * finesse;
  float remous = fbm(qf * 1.3 - vec2(0.0, t * 0.7), octaves);
  float bruit = fbm(qf + vec2(remous * 1.4, -t * 1.1), octaves);
  float eloignement = length(q) / rayon;
  float feu = 1.0 - eloignement + (bruit - 0.5);
  // Le souffle : une traînée de flammes entre la gueule et la boule, qui s'efface quand la boule est grande.
  float souffle = 1.0 - distanceSegment(p, gueule, centre) / (rayon * 0.55 + 0.012) + (bruit - 0.5) * 0.9;
  feu = max(feu, souffle * (1.0 - smoothstep(0.5, 0.9, boule)));
  // Au cœur, la chaleur suit le bruit : sans cela, l'intérieur serait un aplat blanc.
  float chaleur = min(feu, 0.25 + smoothstep(0.2, 0.8, bruit) * 0.85);
  float opaciteFeu = smoothstep(0.0, 0.16, feu);
  float halo = exp(-max(eloignement - 1.0, 0.0) * 2.5) * 0.4 * (1.0 - opaciteFeu);
  couleur = mix(couleur, vec3(1.0, 0.5, 0.12), halo);
  couleur = mix(couleur, rampeFeu(chaleur), opaciteFeu);

  // 3. Les cendres : un bruit fixe sert de « carte » ; un seuil qui monte décide quels pixels ont fini de
  //    brûler. La frontière avance donc en taches irrégulières, comme un papier qui se consume.
  float grain = fbm(p * 2.2 + 11.0, octaves) * 0.75 + fbm(p * 9.0 + 3.0, 3.0) * 0.25;
  float ecart = grain - (cendres * 1.25 - 0.12);          // négatif = déjà brûlé
  float brule = 1.0 - smoothstep(-0.02, 0.02, ecart);
  vec3 charbon = vec3(0.07, 0.065, 0.06) + fbm(p * 16.0, 3.0) * 0.05;
  // Fissures encore rouges, plus vives juste derrière la frontière, et un liseré de braise sur la frontière.
  float fissures = pow(1.0 - abs(fbm(p * 5.0 + 20.0, octaves) - 0.5) * 2.0, 10.0);
  float tiedeur = exp(min(ecart, 0.0) * 7.0);
  charbon += vec3(1.0, 0.32, 0.05) * fissures * (0.2 + 0.8 * tiedeur) * (0.7 + 0.3 * sin(t * 2.0 + grain * 20.0));
  charbon += vec3(1.0, 0.5, 0.1) * exp(min(ecart, 0.0) * 28.0) * 1.2;
  couleur = mix(couleur, charbon, brule);

  // 4. Le lavage : une vague ronde part de Tortank et rend à l'écran la couleur de la page.
  float distanceEau = length(p - uCentreEau) + (fbm(p * 4.0 + vec2(0.0, t * 0.4), octaves) - 0.5) * 0.22;
  float derriere = lavage * (diagonale * 1.15 + 0.35) - 0.12 - distanceEau;   // positif = déjà lavé
  float lave = smoothstep(0.0, 0.05, derriere);

  // Les flocons de cendre flottent tant que l'endroit n'est pas lavé.
  float flocons = cendresVolantes(p, t) * cendres * (1.0 - lave);
  couleur = mix(couleur, vec3(0.50, 0.48, 0.46), min(flocons, 1.0) * 0.55);

  couleur = mix(couleur, uFond, lave);
  // Derrière la vague, un film d'eau qui s'amincit ; sur la vague, une ligne d'écume.
  vec3 eau = mix(vec3(0.08, 0.40, 0.85), vec3(0.60, 0.85, 1.0), fbm(p * 8.0 + vec2(t * 0.6, -t * 0.4), 3.0));
  couleur = mix(couleur, eau, lave * exp(-derriere * 2.2) * 0.75 * (1.0 - smoothstep(0.8, 1.0, lavage)));
  couleur = mix(couleur, vec3(0.92, 0.97, 1.0), exp(-abs(derriere) * 14.0) * 0.9 * step(0.001, lavage));

  // 5. Tortank, par-dessus les cendres puis par-dessus la page lavée.
  vec4 tortank = lireImage(uImageEau, p, uCentreEau);
  couleur = mix(couleur, tortank.rgb, tortank.a * arrivee);

  // 6. Les deux jets, un par canon.
  float ecumeD;
  float ecumeG;
  float jetD = jetEau(p, uCentreEau + vec2(0.32, 0.17) * uTaille, normalize(vec2(1.0, 0.05)), jet * 3.0, t, ecumeD);
  float jetG = jetEau(p, uCentreEau + vec2(-0.32, 0.24) * uTaille, normalize(vec2(-1.0, 0.28)), jet * 3.0, t, ecumeG);
  vec3 bleu = vec3(0.10, 0.45, 0.92);
  vec3 blanc = vec3(0.88, 0.96, 1.0);
  couleur = mix(couleur, mix(bleu, blanc, ecumeD), smoothstep(0.0, 0.25, jetD) * step(0.001, jet));
  couleur = mix(couleur, mix(bleu, blanc, ecumeG), smoothstep(0.0, 0.25, jetG) * step(0.001, jet));

  gl_FragColor = vec4(couleur, 1.0);
}
`;

export type SceneElements = {
  dessiner: (progression: number) => void;
  redimensionner: (largeur: number, hauteur: number) => void;
  actualiserTheme: () => void;
  liberer: () => void;
};

// Prépare la scène dans le canvas donné. Lève une erreur si WebGL ou une image est indisponible :
// l'appelant affiche alors la version fixe.
export async function creerSceneElements(toile: HTMLCanvasElement): Promise<SceneElements> {
  const THREE = await import("three");
  const chargeur = new THREE.TextureLoader();
  const [imageFeu, imageEau] = await Promise.all([chargeur.loadAsync(IMAGE_DRACAUFEU), chargeur.loadAsync(IMAGE_TORTANK)]);
  for (const image of [imageFeu, imageEau]) {
    // Pas de versions réduites (mipmaps) : l'illustration est affichée à peu près à sa taille.
    image.generateMipmaps = false;
    image.minFilter = THREE.LinearFilter;
  }

  const rendu = new THREE.WebGLRenderer({ canvas: toile, antialias: false });
  // Un pixel de dessin par pixel CSS, même sur un écran dense : flammes et eau sont des formes douces,
  // et un téléphone a trois fois moins de pixels à calculer.
  rendu.setPixelRatio(1);

  const uniformes = {
    uTemps: { value: 0 },
    uProgression: { value: 0 },
    uProportions: { value: 1 },
    uQualite: { value: window.matchMedia("(pointer: coarse)").matches ? 0.5 : 1 },
    uImageFeu: { value: imageFeu },
    uImageEau: { value: imageEau },
    uFond: { value: [0, 0, 0] },
    uCentreFeu: { value: [0, 0] },
    uCentreEau: { value: [0, 0] },
    uTaille: { value: 0.6 },
  };
  const materiau = new THREE.ShaderMaterial({
    vertexShader: SHADER_SOMMETS,
    fragmentShader: SHADER_PIXELS,
    uniforms: uniformes,
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
      // Écran large : Dracaufeu à droite, Tortank à gauche (son canon tire vers la droite, à travers l'écran).
      // Écran étroit (téléphone) : les deux au milieu, un peu plus petits.
      const large = proportions > 1.2;
      uniformes.uTaille.value = Math.min(0.66, proportions * 0.92);
      uniformes.uCentreFeu.value = large ? [proportions * 0.2, -0.06] : [0, -0.1];
      uniformes.uCentreEau.value = large ? [-proportions * 0.2, -0.06] : [0, -0.1];
    },

    actualiserTheme,

    liberer() {
      imageFeu.dispose();
      imageEau.dispose();
      geometrie.dispose();
      materiau.dispose();
      rendu.dispose();
    },
  };
}

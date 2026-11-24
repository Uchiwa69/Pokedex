// commun.ts
// Boîte à outils GLSL partagée par les 18 types.
// Compatible WebGL 1 et WebGL 2 via ShaderMaterial de three.js (sans #version ni extension).

export const GLSL_COMMUN = /* glsl */ `
uniform float uTemps;
uniform float uProportions;
uniform vec2 uInclinaison;
uniform float uProgression;
uniform vec2 uOrigine;
uniform vec3 uTeinte;
uniform float uForce;
uniform float uQualite;
uniform float uCalme;
uniform float uModeEclat;
uniform vec4 uZonesCalmes[2];
uniform vec4 uZoneIllustration;
uniform float uAttenuationZones;

#define PI 3.14159265359
#define DEUX_PI 6.28318530718

// Rotation 2D classique pour orienter les grilles de bruit et éviter les alignements artificiels
mat2 rotation2D(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

// Hachage scalaire déterministe sans sinus (évite les artefacts de précision sur GPU mobile)
float hachage11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float hachage21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hachage22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

// Bruit de valeur 2D lissé par courbe quintique (dérivée continue, zéro facette visible)
float bruitValeur(vec2 p) {
  vec2 cellule = floor(p);
  vec2 fraction = fract(p);
  vec2 lissage = fraction * fraction * fraction * (fraction * (fraction * 6.0 - 15.0) + 10.0);

  float a = hachage21(cellule);
  float b = hachage21(cellule + vec2(1.0, 0.0));
  float c = hachage21(cellule + vec2(0.0, 1.0));
  float d = hachage21(cellule + vec2(1.0, 1.0));

  return mix(mix(a, b, lissage.x), mix(c, d, lissage.x), lissage.y);
}

// Mouvement brownien fractionnaire (FBM) borné à 4 octaves maximum.
// Le paramètre octavesActives permet d'adapter la finesse selon uQualite sans changer l'énergie globale.
float fbm(vec2 p, float octavesActives) {
  float somme = 0.0;
  float amplitude = 0.5;
  float normalisation = 0.0;
  mat2 rot = mat2(0.80, -0.60, 0.60, 0.80);

  for (int i = 0; i < 4; i++) {
    if (float(i) >= octavesActives) break;
    somme += amplitude * bruitValeur(p);
    normalisation += amplitude;
    p = rot * p * 2.03 + vec2(17.1, 31.7);
    amplitude *= 0.5;
  }
  return somme / max(normalisation, 0.0001);
}

// Palette cosinus d'Inigo Quilez pour les irisations holographiques maîtrisées
vec3 paletteCosinus(float t, vec3 biais, vec3 amplitude, vec3 frequence, vec3 phase) {
  return biais + amplitude * cos(DEUX_PI * (frequence * t + phase));
}

// Distance analytique d'un point p à un segment [a, b]
float distanceSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.00001), 0.0, 1.0);
  return length(pa - ba * h);
}

// Distance à un hexagone régulier centré en (0, 0) de rayon r
float distanceHexagone(vec2 p, float r) {
  const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
  p = abs(p);
  p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
  p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
  return length(p) * sign(p.y);
}

// Masque doux de bordure de carte : 1.0 sur le cadre périphérique, atténué au centre
float masqueCadreCarte(vec2 uv, float epaisseur) {
  vec2 d = min(uv, 1.0 - uv);
  float bord = min(d.x, d.y);
  return 1.0 - smoothstep(0.0, epaisseur, bord);
}

// Indique si l'appel courant est en mode éclat (1.0) ou en mode carte (0.0)
float estModeEclat(float progression) {
  return max(uModeEclat, 1.0 - step(0.9999, progression));
}

// Enveloppe temporelle de l'éclat : strictement 0.0 à progression = 0 et progression = 1,
// et toujours 1.0 en mode carte.
float enveloppeEclat(float progression) {
  float modeEclat = estModeEclat(progression);
  if (modeEclat < 0.5) return 1.0;
  float p = clamp(progression, 0.0, 1.0);
  float entree = smoothstep(0.0, 0.14, p);
  float sortie = 1.0 - smoothstep(0.58, 1.0, p);
  return entree * sortie;
}

// Coordonnées normalisées tenant compte du ratio largeur/hauteur pour préserver les cercles et angles
vec2 coordonneesIsotropes(vec2 uv, vec2 centre, float proportions) {
  return (uv - centre) * vec2(proportions, 1.0);
}

// Temps effectif respectant l'accessibilité (uCalme = 1 fige le mouvement sur une pose esthétique)
float tempsAnime(float temps) {
  return mix(temps, 14.2, uCalme);
}

// Inclinaison effective adoucie en mode réduit
vec2 inclinaisonAnimee(vec2 inclinaison) {
  return inclinaison * mix(1.0, 0.22, uCalme);
}

// Masque d'accessibilité pour l'éclat : remplace les ondes violentes par un halo calme respirant
vec4 eclatAccessible(vec2 uv, float proportions, float progression, vec2 origine, vec3 teinte) {
  float env = enveloppeEclat(progression);
  if (env <= 0.0001) return vec4(0.0);
  float dist = length(coordonneesIsotropes(uv, origine, proportions));
  float halo = exp(-dist * 1.4) * 0.65 + 0.35;
  float intensite = env * halo * 0.55;
  vec3 couleur = mix(teinte, vec3(1.0), 0.22);
  return vec4(couleur * intensite, intensite);
}

// Atténuation douce sur les zones de texte (uZonesCalmes) et l'illustration centrale
float calculerAttenuationLisibilite(vec2 uv, float modeEclat) {
  if (modeEclat > 0.5 || uAttenuationZones <= 0.001) return 1.0;

  float reduction = 0.0;
  for (int i = 0; i < 2; i++) {
    vec4 z = uZonesCalmes[i];
    vec2 entree = smoothstep(z.xy - 0.03, z.xy + 0.02, uv);
    vec2 sortie = 1.0 - smoothstep(z.zw - 0.02, z.zw + 0.03, uv);
    float dansZone = entree.x * entree.y * sortie.x * sortie.y;
    reduction = max(reduction, dansZone);
  }

  // Protection légère de l'illustration centrale : laisse passer la bordure et les reflets subtils
  vec2 illuIn = smoothstep(uZoneIllustration.xy - 0.04, uZoneIllustration.xy + 0.04, uv);
  vec2 illuOut = 1.0 - smoothstep(uZoneIllustration.zw - 0.04, uZoneIllustration.zw + 0.04, uv);
  float dansIllustration = illuIn.x * illuIn.y * illuOut.x * illuOut.y;

  float facteurTexte = mix(1.0, 0.20, reduction * uAttenuationZones);
  float facteurIllu = mix(1.0, 0.34, dansIllustration * uAttenuationZones);
  return min(facteurTexte, facteurIllu);
}
`;

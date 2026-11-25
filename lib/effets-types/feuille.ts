// Feuille holographique de la carte 3D : le motif brillant des cartes rares (étoiles, rayons, paillettes, or…),
// qui s'allume et change de couleur quand la carte s'incline.
// Adapté du composant « HoloCard » de React Bits (reactbits.dev) : les motifs, la palette et le calcul de la
// lumière viennent de son shader, traduits en français. Ce qui change :
// - c'est une couche de NOTRE carte (entre la face et l'effet du type), pas une carte à part ;
// - le regard et la lampe viennent de la vraie caméra three.js, au lieu d'un angle d'inclinaison ;
// - la feuille s'efface sur les textes et s'allège sur l'illustration (zones calmes de commun.ts) ;
// - le motif dépend de la PUISSANCE du Pokémon (total de ses statistiques), comme la rareté d'une vraie carte ;
// - deux motifs non utilisés (éclats de verre, tourbillon) et le reflet blanc (on a déjà le nôtre) sont retirés.

import { GLSL_COMMUN } from "./commun";
import { creerUniformes, ZONES_FACE } from "./index";

// Les six motifs, du plus discret au plus rare. Le numéro est celui lu par le shader (uMotif).
export const MOTIFS = ["arc-en-ciel", "paillettes", "etoiles", "rayons", "cosmos", "or"] as const;
export type Motif = (typeof MOTIFS)[number];

// Total des six statistiques → motif. Repères : Pikachu 320, Dracaufeu 534, oiseaux légendaires 580, Mewtwo 680.
export function motifSelonPuissance(total: number): Motif {
  if (total < 320) return "arc-en-ciel"; // simple voile irisé
  if (total < 420) return "paillettes";
  if (total < 490) return "etoiles";
  if (total < 535) return "rayons";
  if (total < 580) return "cosmos";
  return "or"; // légendaires et Pokémon les plus puissants
}

// Programme des sommets. Il calcule, pour chaque coin de la carte, la direction de l'œil et celle de la lampe
// DANS LE REPÈRE DE LA CARTE (x = largeur, y = hauteur, z = sortant de la face) : inverse(modelMatrix) ramène
// un point de la scène dans ce repère. Ainsi, quand la carte tourne, ces directions tournent en sens inverse,
// et la feuille réagit comme une vraie surface brillante.
const SOMMETS = /* glsl */ `
uniform vec3 uLampe;   // position de la lampe, dans la scène
varying vec2 vUv;
varying vec3 vRegard;  // du point vers l'œil
varying vec3 vLumiere; // du point vers la lampe
void main() {
  vUv = uv;
  mat4 versCarte = inverse(modelMatrix);
  vRegard = (versCarte * vec4(cameraPosition, 1.0)).xyz - position;
  vLumiere = (versCarte * vec4(uLampe, 1.0)).xyz - position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const PIXELS = /* glsl */ `
varying vec2 vUv;
varying vec3 vRegard;
varying vec3 vLumiere;
${GLSL_COMMUN}

uniform int uMotif;        // 0 arc-en-ciel, 1 paillettes, 2 étoiles, 3 rayons, 4 cosmos, 5 or
uniform float uIntensite;  // force de la feuille, de 0 à 1
uniform float uEchelle;    // taille du motif (1 = normale)
uniform float uBordure;    // force des paillettes du bord
uniform float uCadre;      // largeur du bord pailleté, en part de la largeur de la carte
uniform float uRayon;      // arrondi des coins, en part de la largeur
uniform vec3 uMetal;       // couleur du métal de la feuille
uniform float uPenche;     // 0 = carte vue bien de face, 1 = vue par la tranche

// Hauteur / largeur de la carte. Les motifs sont dessinés dans un repère où la largeur vaut 1.
const float ASPECT = 2.5 / 1.8;
const float TAU = 6.28318530718; // un tour complet, en radians (2 × pi)

// Ce que renvoie un motif pour un point de la carte.
struct Feuille {
  float masque;  // 0 = pas de feuille ici, 1 = feuille pleine
  float angle;   // orientation du reflet à cet endroit (décide de la couleur)
  float alea;    // nombre au hasard propre à l'élément du motif (décale sa couleur)
  vec2 facette;  // petite pente propre à l'élément : elle le fait étinceler à un angle précis
};

// Nombres « au hasard », toujours les mêmes pour une même case (ceux du composant d'origine).
float hasard(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}
vec2 hasard2(vec2 p) {
  return vec2(hasard(p), hasard(p + 17.31));
}

// Palette de la feuille : bleu → cyan → vert → jaune → orange → rose, puis retour (aller-retour sans saut).
vec3 irisation(float t) {
  t = abs(fract(t * 0.5) * 2.0 - 1.0);
  vec3 c = mix(vec3(0.1, 0.25, 1.0), vec3(0.0, 0.85, 1.0), smoothstep(0.0, 0.25, t));
  c = mix(c, vec3(0.25, 1.0, 0.2), smoothstep(0.25, 0.45, t));
  c = mix(c, vec3(1.0, 0.92, 0.05), smoothstep(0.45, 0.65, t));
  c = mix(c, vec3(1.0, 0.45, 0.05), smoothstep(0.65, 0.85, t));
  return mix(c, vec3(0.95, 0.12, 0.3), smoothstep(0.85, 1.0, t));
}

// Arc-en-ciel : une feuille unie, à peine grenée. Le plus discret.
Feuille motifArcEnCiel(vec2 p) {
  return Feuille(0.86 + 0.14 * hasard(floor(p * 700.0 * uEchelle)), 0.2, 0.5, vec2(0.0));
}

// Paillettes : une grille serrée de petits disques, chacun avec sa propre pente.
Feuille motifPaillettes(vec2 p) {
  vec2 g = p * 72.0 * uEchelle;
  vec2 cellule = floor(g);
  float taille = mix(0.18, 0.4, hasard(cellule + 3.0));
  float m = smoothstep(taille, taille * 0.55, length(fract(g) - 0.5 - (hasard2(cellule) - 0.5) * 0.5)) * step(0.25, hasard(cellule + 5.0));
  return Feuille(m, hasard(cellule + 7.0) * TAU, hasard(cellule + 9.0), (hasard2(cellule + 11.0) - 0.5) * 0.9);
}

// Étoiles : dans chaque case, une étoile à 4 ou 5 branches, ou un simple point.
// On regarde aussi les 8 cases voisines, car une étoile peut déborder de sa case.
Feuille motifEtoiles(vec2 p) {
  Feuille meilleure = Feuille(0.0, 0.0, 0.0, vec2(0.0));
  vec2 g = p / (0.08 / uEchelle);
  vec2 base = floor(g);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 id = base + vec2(float(i), float(j));
      float tirage = hasard(id + 1.3);
      vec2 d = g - (id + 0.5 + (hasard2(id) - 0.5) * 0.55);
      float m = smoothstep(0.07, 0.035, length(d)); // par défaut : un point
      if (tirage < 0.62) {
        float taille = mix(0.16, 0.5, pow(hasard(id + 9.0), 1.8));
        float secteur = TAU / (tirage < 0.3 ? 4.0 : 5.0);
        // k va de 0 (pointe d'une branche) à 1 (creux entre deux branches) : le bord se rapproche du centre.
        float k = abs(fract((atan(d.y, d.x) + hasard(id + 4.0) * TAU) / secteur) - 0.5) * 2.0;
        float bord = taille * mix(1.0, 0.36, pow(k, 0.6));
        m = smoothstep(bord, bord * 0.8, length(d));
      }
      if (m > meilleure.masque) meilleure = Feuille(m, hasard(id + 6.0) * TAU, hasard(id + 8.0), (hasard2(id + 2.0) - 0.5) * 0.6);
    }
  }
  return meilleure;
}

// Rayons : un quadrillage en losange de « soleils » : des points au centre, puis deux couronnes de traits.
Feuille motifRayons(vec2 p) {
  vec2 q = mat2(0.7071068, 0.7071068, -0.7071068, 0.7071068) * (p - vec2(0.5, 0.5 * ASPECT)) / (0.283 / uEchelle);
  vec2 d = fract(q) - 0.5;
  float u = length(d) / 0.49;
  float angle = atan(d.y, d.x);
  if (u < 0.12) {
    float anneau = min(floor(u / 0.045 + 0.5), 2.0);
    float nombre = max(1.0, anneau * 6.0);
    float place = (floor(angle / TAU * nombre) + 0.5) / nombre * TAU;
    vec2 point = vec2(cos(place), sin(place)) * anneau * 0.045;
    float m = smoothstep(0.024, 0.012, length(d / 0.49 - point));
    return Feuille(m, angle, 0.5, vec2(0.0));
  }
  bool dedans = u < 0.66;
  float trait = angle / TAU * (dedans ? 56.0 : 72.0);
  bool decale = mod(floor(trait), 2.0) > 0.5; // un trait sur deux est plus loin du centre
  vec2 bande = dedans ? (decale ? vec2(0.45, 0.61) : vec2(0.33, 0.49)) : (decale ? vec2(0.84, 0.99) : vec2(0.7, 0.85));
  float enTravers = abs(u - (bande.x + bande.y) * 0.5) / ((bande.y - bande.x) * 0.5);
  float enLong = abs(fract(trait) - 0.5) * 2.0;
  float largeur = dedans ? 0.72 : 0.6;
  float m = smoothstep(1.0, 0.78, enTravers) * smoothstep(largeur, largeur - 0.2, enLong);
  return Feuille(m, angle, 0.5, vec2(0.0));
}

// Cosmos : de grands anneaux (des « planètes ») sur un semis de petits points.
Feuille motifCosmos(vec2 p) {
  Feuille meilleure = Feuille(0.0, 0.0, 0.0, vec2(0.0));
  vec2 g = p / (0.16 / uEchelle);
  vec2 base = floor(g);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 id = base + vec2(float(i), float(j));
      vec2 d = g - (id + 0.5 + (hasard2(id) - 0.5) * 0.7);
      float taille = mix(0.16, 0.52, hasard(id + 2.0));
      float r = length(d);
      float m = max(smoothstep(0.05, 0.0, abs(r - taille)), smoothstep(taille, taille - 0.04, r) * 0.22);
      if (m > meilleure.masque) meilleure = Feuille(m, hasard(id + 6.0) * TAU + atan(d.y, d.x) * 0.5, hasard(id + 1.0), (hasard2(id + 4.0) - 0.5) * 0.5);
    }
  }
  vec2 fin = p / (0.035 / uEchelle);
  vec2 cellule = floor(fin);
  float points = smoothstep(0.2, 0.1, length(fin - cellule - 0.5 - (hasard2(cellule + 9.0) - 0.5) * 0.6)) * step(0.55, hasard(cellule + 2.0));
  if (points > meilleure.masque) meilleure = Feuille(points, hasard(cellule) * TAU, hasard(cellule + 3.0), (hasard2(cellule + 7.0) - 0.5) * 0.6);
  return meilleure;
}

// Or : des paillettes plus grosses sur un métal gravé de fines stries en biais.
Feuille motifOr(vec2 p) {
  Feuille paillette = motifPaillettes(p * 0.8);
  if (paillette.masque > 0.5) return paillette;
  float gravure = 0.55 + 0.45 * smoothstep(0.2, 0.8, abs(fract((p.x * 0.6 + p.y) * 140.0 * uEchelle) - 0.5) * 2.0);
  return Feuille(gravure, 0.9, 0.4, vec2(0.0));
}

// Paillettes du bord de la carte : de petits hexagones colorés, puis une poussière de points blancs.
// Chacun a sa propre pente (« facette ») : il ne s'allume que lorsque la lumière tombe sous le bon angle.
vec3 eclatsBordure(vec2 p, vec3 miChemin, vec2 balayage, float eveil) {
  vec2 g = p * 62.0;
  vec2 cellule = floor(g);
  vec2 d = fract(g) - 0.5 - (hasard2(cellule) - 0.5) * 0.36;
  float tour = hasard(cellule + 3.0) * TAU;
  d = mat2(cos(tour), -sin(tour), sin(tour), cos(tour)) * d;
  vec2 a = abs(d);
  float hexagone = max(a.x * 0.866 + a.y * 0.5, a.y);
  float taille = mix(0.22, 0.38, hasard(cellule + 2.0));
  float piece = smoothstep(taille, taille - 0.07, hexagone) * step(0.42, hasard(cellule + 4.0));
  vec3 facette = normalize(vec3((hasard2(cellule + 6.0) - 0.5) * 0.9, 1.0));
  float flash = pow(max(dot(facette, miChemin), 0.0), 6.0);
  vec3 teinte = irisation(dot(balayage, vec2(cos(tour), sin(tour))) * 1.2 + dot(balayage, vec2(0.8, 0.6)) * 0.8 + hasard(cellule + 8.0) * 0.5);
  vec3 couleur = piece * teinte * (0.3 + 1.6 * flash) * eveil;
  vec2 fin = p * 210.0;
  vec2 grain = floor(fin);
  float point = smoothstep(0.24, 0.0, length(fract(fin) - 0.5 - (hasard2(grain) - 0.5) * 0.5)) * step(0.72, hasard(grain + 1.0));
  float flashPoint = pow(max(dot(normalize(vec3((hasard2(grain + 2.0) - 0.5) * 0.9, 1.0)), miChemin), 0.0), 10.0);
  return couleur + vec3(1.2) * point * flashPoint * (1.0 - piece);
}

void main() {
  // Repère des motifs : largeur de 0 à 1, hauteur de 0 (haut de la carte) à ASPECT (bas).
  vec2 p = vec2(vUv.x, (1.0 - vUv.y) * ASPECT);
  // Distance au bord arrondi de la carte (négative à l'intérieur) : elle délimite le cadre pailleté.
  vec2 centre = vec2(0.5, 0.5 * ASPECT);
  vec2 q = abs(p - centre) - centre + uRayon;
  float dehors = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRayon;
  float pixel = fwidth(p.x); // taille d'un pixel d'écran dans ce repère, pour des bords nets sans crénelage
  float cadre = 1.0 - smoothstep(uCadre - pixel, uCadre + pixel, -dehors);

  // Le y des motifs descend, celui de la carte monte : on retourne le y des deux directions.
  vec3 regard = normalize(vRegard * vec3(1.0, -1.0, 1.0));
  vec3 lumiere = normalize(vLumiere * vec3(1.0, -1.0, 1.0));
  // Direction à mi-chemin entre la lampe et l'œil (Blinn-Phong) : une surface brille quand elle lui fait face.
  vec3 miChemin = normalize(lumiere + regard);
  vec2 balayage = lumiere.xy + regard.xy; // change dès que la carte bouge : c'est lui qui fait défiler les couleurs
  float voile = pow(max(miChemin.z, 0.0), 10.0);

  Feuille f;
  if (uMotif == 0) f = motifArcEnCiel(p);
  else if (uMotif == 1) f = motifPaillettes(p);
  else if (uMotif == 2) f = motifEtoiles(p);
  else if (uMotif == 3) f = motifRayons(p);
  else if (uMotif == 4) f = motifCosmos(p);
  else f = motifOr(p);

  // Réglages par motif : x et y = vitesse de défilement des couleurs (selon l'orientation de l'élément, puis
  // en diagonale), z = part de hasard, w = force.
  vec4 reglage = uMotif == 0 ? vec4(0.0, 2.2, 0.0, 0.45)
    : uMotif == 1 ? vec4(0.9, 1.0, 0.6, 1.0)
    : uMotif == 2 ? vec4(0.6, 1.4, 0.3, 1.0)
    : uMotif == 3 ? vec4(0.25, 1.9, 0.12, 1.0)
    : uMotif == 4 ? vec4(0.7, 1.2, 0.35, 0.85)
    : vec4(0.3, 1.0, 0.2, 0.95);
  // L'arc-en-ciel et l'or sont des voiles posés SUR la carte ; les autres motifs la recouvrent là où ils sont.
  bool enVoile = uMotif == 0 || uMotif == 5;

  vec3 metal = uMotif == 5 ? vec3(1.0, 0.74, 0.38) * dot(uMetal, vec3(0.3333)) * 1.15 : uMetal;
  vec2 direction = vec2(cos(f.angle), sin(f.angle));
  float phase = dot(balayage, direction) * reglage.x + dot(balayage, vec2(0.8, 0.6)) * reglage.y + f.alea * reglage.z;
  vec3 teinte = irisation(phase);
  if (uMotif == 5) teinte = mix(teinte, metal, 0.65);
  // Étincelle : l'élément flashe quand sa facette fait face à la direction à mi-chemin.
  float etincelle = pow(max(dot(normalize(vec3(f.facette, 1.0)), miChemin), 0.0), 24.0) * step(0.001, length(f.facette));
  vec3 feuille = (enVoile ? teinte : mix(teinte, vec3(1.0), 0.12)) * (1.15 + 0.3 * voile) + metal * etincelle * 1.2;

  // La feuille « dort » quand la carte est bien de face et s'éveille dès qu'elle penche.
  float penchee = smoothstep(0.02, 0.21, uPenche);
  float eveil = mix(0.2, 1.0, penchee);
  // Elle s'efface sur les textes et s'allège sur l'illustration, et laisse le bord aux paillettes.
  float lisible = calculerAttenuationLisibilite(vUv, 0.0);
  float force = uIntensite * f.masque * (1.0 - cadre) * eveil * lisible;

  // On écrit une couleur « prémultipliée » : l'écran affichera carte × (1 − alpha) + couleur.
  vec3 couleur;
  float alpha;
  if (enVoile) {
    // Voile : des bandes de lumière passent sur la carte, qui reste visible dessous.
    float bande = 0.25 + 0.75 * smoothstep(0.3, 0.95, 0.5 + 0.5 * cos(phase * TAU * 0.5 + 1.3));
    // (Pas de correction gamma ici : elle doublait presque la force du voile, qui délavait toute la carte.)
    couleur = clamp(feuille * reglage.w * bande * force, 0.0, 1.0);
    alpha = dot(couleur, vec3(0.3333));
  } else {
    // Motif : là où il est, la feuille remplace la carte, à hauteur de sa force.
    // pow(…, 1/2.2) : la couleur est calculée en lumière réelle, l'écran attend des valeurs « gamma ».
    alpha = clamp(force * reglage.w, 0.0, 1.0);
    couleur = pow(clamp(feuille, 0.0, 1.0), vec3(1.0 / 2.2)) * alpha;
  }
  // Le bord : paillettes et léger voile de métal, simplement ajoutés.
  couleur += eclatsBordure(p, miChemin, balayage, mix(0.55, 1.0, penchee)) * uBordure * cadre;
  couleur += uMetal * voile * 0.12 * cadre;

  gl_FragColor = vec4(couleur * uForce, alpha * uForce);
}
`;

// Assemble le programme de la feuille et ses réglages pour un motif donné.
export function assemblerFeuille(motif: Motif) {
  return {
    vertexShader: SOMMETS,
    fragmentShader: PIXELS,
    uniforms: {
      // Les réglages communs (zones calmes, force…) ; la teinte du type ne sert pas ici.
      ...creerUniformes([1, 1, 1], ZONES_FACE),
      uMotif: { value: MOTIFS.indexOf(motif) },
      uIntensite: { value: 0.5 }, // 0.85 dans le composant d'origine : réduit pour laisser voir notre carte
      uEchelle: { value: 1 },
      uBordure: { value: 0.8 },
      uCadre: { value: 0.04 },
      uRayon: { value: 0.13 / 1.8 }, // même arrondi que la géométrie de la carte
      uMetal: { value: [0.76, 0.79, 0.84] }, // argent clair (#e2e6ec, en lumière réelle)
      uLampe: { value: [0, 0, 5] },
      uPenche: { value: 0 },
    },
  };
}

// types/poison.ts
// Matière : bulles viscérales en coalescence et nappes huileuses bioluminescentes.
// Mouvement : remontée lente de bulles qui gonflent et éclatent en surface.
// Lumière : violet toxique profond, liseré vert acide et reflets huileux irisés.

export const GLSL_POISON = /* glsl */ `
vec2 coucheBullesToxiques(vec2 p, float t, vec2 inc, float echelle, float graine) {
  vec2 grille = p * echelle;
  grille.y -= t * (0.65 + graine * 0.25);
  grille.x += sin(grille.y * 0.9 + t * 0.8) * 0.25 + inc.x * 0.35;

  vec2 id = floor(grille);
  vec2 f = fract(grille) - 0.5;

  float alea = hachage21(id + graine * 37.0);
  if (alea < 0.48) return vec2(0.0);

  float phaseVie = fract(t * (0.42 + fract(alea * 3.1) * 0.25) + alea * 7.0);
  float rayon = mix(0.10, 0.36, smoothstep(0.0, 0.82, phaseVie));
  float survie = 1.0 - smoothstep(0.82, 1.0, phaseVie);

  vec2 centreBulle = (hachage22(id + graine * 19.0) - 0.5) * 0.36;
  vec2 rel = f - centreBulle;
  float d = length(rel);

  float paroi = exp(-pow((d - rayon) * 22.0, 2.0)) * survie;
  vec2 posReflet = centreBulle + vec2(-0.32, 0.35) * rayon + inc * 0.08;
  float reflet = smoothstep(rayon * 0.45, 0.04, length(f - posReflet)) * step(d, rayon) * survie;

  return vec2(paroi, reflet);
}

vec4 effetType(vec2 uv, float proportions, float temps, vec2 inclinaison,
               float progression, vec2 origine, vec3 teinte) {
  float modeEclat = estModeEclat(progression);
  if (uCalme > 0.5 && modeEclat > 0.5) {
    return eclatAccessible(uv, proportions, progression, origine, teinte);
  }

  float env = enveloppeEclat(progression);
  if (env <= 0.0001) return vec4(0.0);

  float t = tempsAnime(temps);
  vec2 inc = inclinaisonAnimee(inclinaison);
  float octaves = mix(2.0, 3.0, uQualite);

  vec2 p = coordonneesIsotropes(uv, vec2(0.5), proportions);

  vec2 qVapeur = p * 2.8 + vec2(inc.x * 0.25, -t * 0.22 + inc.y * 0.25);
  float vapeur = fbm(qVapeur + fbm(qVapeur * 1.5, octaves) * 0.85, octaves);
  float nappeToxique = smoothstep(0.36, 0.80, vapeur) * 0.65;

  vec2 b1 = coucheBullesToxiques(p, t, inc, 4.6, 1.0);
  vec2 b2 = uQualite > 0.3
    ? coucheBullesToxiques(p + vec2(0.37, 0.19), t * 1.15, inc * 1.3, 7.2, 2.0) * 0.8
    : vec2(0.0);

  float paroisBulles = clamp(b1.x + b2.x, 0.0, 1.3);
  float refletsHuile = clamp(b1.y + b2.y, 0.0, 1.1);

  float masque = 1.0;
  float eclaboussure = 0.0;
  if (modeEclat > 0.5) {
    float pEclat = clamp(progression, 0.0, 1.0);
    float dist = length(coordonneesIsotropes(uv, origine, proportions));
    float rayon = pEclat * 1.70;
    eclaboussure = exp(-pow((dist - rayon) * 8.0, 2.0)) * 1.25;
    float sillage = smoothstep(rayon + 0.16, max(0.0, rayon - 0.65), dist);
    masque = max(eclaboussure, sillage * 0.88);
  } else {
    masque = 0.40 + 0.60 * masqueCadreCarte(uv, 0.28);
  }

  float densite = clamp((nappeToxique + paroisBulles * 0.88 + refletsHuile * 0.72 + eclaboussure * 0.6) * masque, 0.0, 1.25);

  vec3 violetVenin = teinte * 0.95;
  vec3 magentaAcide = mix(teinte, vec3(0.88, 0.22, 0.82), 0.55);
  vec3 vertBiolum = vec3(0.42, 0.98, 0.34);

  vec3 couleur = mix(violetVenin, magentaAcide, nappeToxique);
  couleur = mix(couleur, vertBiolum, clamp(paroisBulles * 0.72 + refletsHuile * 0.65, 0.0, 0.92));

  float intensite = clamp(densite * 0.75 * env, 0.0, 1.0);
  return vec4(couleur * densite * 0.75 * env, intensite);
}
`;

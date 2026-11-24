// types/vol.ts
// Matière : filets aérodynamiques laminaires et voiles de cirrus légers.
// Mouvement : flux ascendant diagonal fluide et rapide, sans turbulence lourde.
// Lumière : reflets célestes bleu ciel, blanc pur et argent aérien.

export const GLSL_VOL = /* glsl */ `
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

  float angleFlux = -0.58 + inc.x * 0.26 - inc.y * 0.14;
  vec2 q = rotation2D(angleFlux) * p;

  float ondulation = sin(q.x * 4.5 - t * 1.8) * 0.065 + (bruitValeur(vec2(q.x * 2.2 - t * 0.9, q.y * 2.5)) - 0.5) * 0.09;
  float coordTransverse = q.y + ondulation + inc.y * 0.18;

  float ondeFilets = sin(coordTransverse * 24.0 + q.x * 2.5 - t * 3.4);
  float filetPrincipal = pow(max(ondeFilets, 0.0), 6.0);
  float enveloppeRuban = smoothstep(0.25, 0.85, bruitValeur(vec2(q.x * 1.6 - t * 1.35, floor(coordTransverse * 3.8))));
  float filetsAir = filetPrincipal * (0.35 + 0.65 * enveloppeRuban);

  vec2 coordCirrus = vec2(q.x * 1.4 - t * 0.55, q.y * 4.2);
  float cirrus = smoothstep(0.42, 0.86, fbm(coordCirrus, octaves)) * 0.52;

  float masque = 1.0;
  float courantJet = 0.0;
  if (modeEclat > 0.5) {
    float pEclat = clamp(progression, 0.0, 1.0);
    vec2 rel = coordonneesIsotropes(uv, origine, proportions);
    float dist = length(rel);
    float rayon = pEclat * 1.78;
    vec2 relRot = rotation2D(angleFlux) * rel;
    float distElliptique = length(vec2(relRot.x * 0.72, relRot.y * 1.25));
    courantJet = exp(-pow((distElliptique - rayon * 0.85) * 8.5, 2.0)) * 1.25;
    float sillage = smoothstep(rayon + 0.16, max(0.0, rayon - 0.72), dist);
    masque = max(courantJet, sillage * 0.85);
  } else {
    masque = 0.36 + 0.64 * masqueCadreCarte(uv, 0.28);
  }

  float lumiere = clamp((filetsAir * 0.88 + cirrus * 0.65 + courantJet * 0.7) * masque, 0.0, 1.2);

  vec3 bleuCeleste = teinte;
  vec3 azurClair = mix(teinte, vec3(0.68, 0.88, 1.0), 0.62);
  vec3 blancAerien = vec3(0.96, 0.99, 1.0);

  vec3 couleur = mix(bleuCeleste, azurClair, cirrus);
  couleur = mix(couleur, blancAerien, clamp(filetsAir * 0.85 + courantJet * 0.65, 0.0, 0.95));

  float intensite = clamp(lumiere * 0.70 * env, 0.0, 1.0);
  return vec4(couleur * lumiere * 0.70 * env, intensite);
}
`;

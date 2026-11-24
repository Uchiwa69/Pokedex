// types/psy.ts
// Matière : anneaux d'interférence d'ondes stationnaires et lentille télékinétique.
// Mouvement : respiration concentrique hypnotique et rotation lente des harmoniques.
// Lumière : dégradé magenta vif, violet néon et franges cyan aux crêtes constructives.

export const GLSL_PSY = /* glsl */ `
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

  vec2 p = coordonneesIsotropes(uv, vec2(0.5), proportions);

  // Deux foyers d'ondes qui se déplacent en contre-parallaxe lors de l'inclinaison
  vec2 foyer1 = inc * 0.28 + vec2(cos(t * 0.65), sin(t * 0.65)) * 0.08;
  vec2 foyer2 = -inc * 0.22 + vec2(sin(t * 0.52), -cos(t * 0.52)) * 0.11;

  if (modeEclat > 0.5) {
    vec2 origIso = coordonneesIsotropes(origine, vec2(0.5), proportions);
    foyer1 = origIso;
    foyer2 = origIso + inc * 0.12;
  }

  // Distorsion spatiale douce autour du foyer principal (effet lentille psychique)
  vec2 rel1 = p - foyer1;
  float dist1 = length(rel1);
  vec2 pCourbe = p + normalize(rel1 + vec2(0.0001)) * sin(dist1 * 12.0 - t * 2.0) * 0.025;

  float d1 = length(pCourbe - foyer1);
  float d2 = length(pCourbe - foyer2);

  // Interférence constructive de deux trains d'ondes concentriques
  float frequence = mix(15.0, 20.0, uQualite);
  float onde1 = sin(d1 * frequence - t * 2.3);
  float onde2 = sin(d2 * (frequence * 0.88) + t * 1.8);
  float interference = pow(abs(onde1 + onde2) * 0.5, 2.6);

  float masque = 1.0;
  float impulsion = 0.0;
  if (modeEclat > 0.5) {
    float pEclat = clamp(progression, 0.0, 1.0);
    float rayon = pEclat * 1.68;
    impulsion = exp(-pow((d1 - rayon) * 8.5, 2.0)) * 1.25;
    float sillage = smoothstep(rayon + 0.16, max(0.0, rayon - 0.68), d1);
    masque = max(impulsion, sillage * 0.88);
  } else {
    float haloFoyer = exp(-d1 * 3.8) * 0.45;
    masque = clamp(0.36 + masqueCadreCarte(uv, 0.28) * 0.55 + haloFoyer, 0.0, 1.15);
  }

  float lumiere = clamp((interference * 0.92 + impulsion * 0.65) * masque, 0.0, 1.25);

  vec3 magentaPsy = teinte;
  vec3 violetNeon = mix(teinte, vec3(0.45, 0.20, 0.98), 0.55);
  vec3 frangeCyan = vec3(0.42, 0.92, 1.0);

  vec3 couleur = mix(violetNeon, magentaPsy, 0.5 + 0.5 * onde1);
  couleur = mix(couleur, frangeCyan, pow(interference, 2.4) * 0.55);

  float intensite = clamp(lumiere * 0.74 * env, 0.0, 1.0);
  return vec4(couleur * lumiere * 0.74 * env, intensite);
}
`;

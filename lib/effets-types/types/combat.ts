// types/combat.ts
// Matière : ondes de choc cinétiques et stries radiales d'impact martial.
// Mouvement : pulsations franches et rayonnement énergétique dynamique.
// Lumière : lueur ardente rouge-orange concentrée sur les fronts d'onde et rayons.

export const GLSL_COMBAT = /* glsl */ `
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

  vec2 foyer = modeEclat > 0.5
    ? coordonneesIsotropes(origine, vec2(0.5), proportions)
    : inc * 0.32;
  vec2 p = coordonneesIsotropes(uv, vec2(0.5), proportions) - foyer;

  float dist = length(p);
  float angle = atan(p.y, p.x);

  float nbRayons = mix(18.0, 26.0, uQualite);
  float secteur = floor((angle + PI) / DEUX_PI * nbRayons);
  float aleaRayon = hachage11(secteur * 3.17);
  float profilAngulaire = abs(fract((angle + PI) / DEUX_PI * nbRayons) - 0.5) * 2.0;
  float strieRadiale = smoothstep(0.42, 0.06, profilAngulaire) * step(0.32, aleaRayon);

  float fluxRadial = 0.5 + 0.5 * sin(dist * 16.0 - t * 4.2 + aleaRayon * DEUX_PI);
  strieRadiale *= smoothstep(0.10, 0.45, dist) * (0.45 + 0.55 * fluxRadial);

  float ondeChoc = 0.0;
  float masque = 1.0;

  if (modeEclat > 0.5) {
    float pEclat = clamp(progression, 0.0, 1.0);
    float rayon1 = pEclat * 1.75;
    float rayon2 = max(0.0, pEclat - 0.14) * 1.55;
    float anneau1 = exp(-pow((dist - rayon1) * 11.0, 2.0)) * 1.35;
    float anneau2 = exp(-pow((dist - rayon2) * 15.0, 2.0)) * 0.85;
    float noyauImpact = exp(-dist * 7.5) * (1.0 - smoothstep(0.0, 0.35, pEclat));
    ondeChoc = anneau1 + anneau2 + noyauImpact;
    float sillage = smoothstep(rayon1 + 0.14, max(0.0, rayon1 - 0.65), dist);
    masque = max(ondeChoc, sillage * 0.85);
  } else {
    float cycleOnde = fract(t * 0.85);
    float rayonOnde = mix(0.68, 0.18, cycleOnde);
    float enveloppePulse = sin(cycleOnde * PI);
    ondeChoc = exp(-pow((dist - rayonOnde) * 12.0, 2.0)) * enveloppePulse * 0.85;
    masque = 0.38 + 0.62 * masqueCadreCarte(uv, 0.26);
  }

  float energie = clamp((strieRadiale * 0.72 + ondeChoc * 0.95) * masque, 0.0, 1.3);

  vec3 rougeArdent = teinte;
  vec3 orangeImpact = mix(teinte, vec3(1.0, 0.48, 0.12), 0.58);
  vec3 coeurDore = vec3(1.0, 0.92, 0.68);

  vec3 couleur = mix(rougeArdent, orangeImpact, clamp(strieRadiale * 0.7 + ondeChoc * 0.5, 0.0, 1.0));
  couleur = mix(couleur, coeurDore, clamp(pow(ondeChoc, 1.8) * 0.75, 0.0, 0.9));

  float intensite = clamp(energie * 0.76 * env, 0.0, 1.0);
  return vec4(couleur * energie * 0.76 * env, intensite);
}
`;

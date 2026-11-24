// types/spectre.ts
// Matière : brume ectoplasmique soyeuse à double distorsion de domaine.
// Mouvement : volutes fluides qui s'enroulent et fuient l'axe du regard.
// Lumière : indigo-violet spectral, liserés magenta et cœur phosphorescent pâle.

export const GLSL_SPECTRE = /* glsl */ `
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

  vec2 foyerRegard = inc * 0.32;
  vec2 versRegard = p - foyerRegard;
  float distRegard = length(versRegard);
  vec2 repulsion = normalize(versRegard + vec2(0.0001)) * exp(-distRegard * 3.2) * 0.24;

  vec2 q = p * 2.4 + repulsion;
  if (modeEclat > 0.5) {
    float pEclat = clamp(progression, 0.0, 1.0);
    vec2 rel = coordonneesIsotropes(uv, origine, proportions);
    float angleVortex = exp(-length(rel) * 2.2) * pEclat * 3.4;
    q = rotation2D(angleVortex) * (rel * 2.6);
  }

  vec2 distorsion1 = vec2(
    fbm(q + vec2(t * 0.22, -t * 0.16), octaves),
    fbm(q + vec2(-t * 0.18, t * 0.24) + vec2(5.2, 1.3), octaves)
  );
  vec2 distorsion2 = vec2(
    fbm(q + distorsion1 * 1.85 + vec2(1.7, 9.2) - t * 0.14, octaves),
    fbm(q + distorsion1 * 1.85 + vec2(8.3, 2.8) + t * 0.12, octaves)
  );
  float volutes = fbm(q + distorsion2 * 2.1, octaves);

  float ruban = exp(-pow((volutes - 0.54) * 7.5, 2.0));
  float nappe = smoothstep(0.36, 0.82, volutes) * 0.65;

  float masque = 1.0;
  if (modeEclat > 0.5) {
    float pEclat = clamp(progression, 0.0, 1.0);
    float dist = length(coordonneesIsotropes(uv, origine, proportions));
    float rayon = pEclat * 1.65;
    masque = smoothstep(rayon + 0.18, max(0.0, rayon - 0.6), dist);
  } else {
    float ouverture = smoothstep(0.08, 0.52, distRegard);
    masque = mix(0.35, 1.0, ouverture) * (0.45 + 0.55 * masqueCadreCarte(uv, 0.30));
  }

  float densite = clamp((nappe + ruban * 0.85) * masque, 0.0, 1.2);

  vec3 violetProfond = teinte * 0.95;
  vec3 liseretMagenta = mix(teinte, vec3(0.85, 0.32, 0.95), 0.55);
  vec3 coeurSpectral = mix(teinte, vec3(0.82, 0.92, 1.0), 0.72);

  vec3 couleur = mix(violetProfond, liseretMagenta, ruban);
  couleur = mix(couleur, coeurSpectral, pow(ruban, 2.2) * 0.75);

  float intensite = clamp(densite * 0.74 * env, 0.0, 1.0);
  return vec4(couleur * densite * 0.74 * env, intensite);
}
`;

// types/normal.ts
// Matière : verre optique prismatique pur et filigrane géométrique concentrique.
// Mouvement : respiration douce et équilibre optique harmonieux (sans stries brossées).
// Lumière : dispersion chromatique subtile (RVB décalé) et reflet nacré blanc-ivoire.

export const GLSL_NORMAL = /* glsl */ `
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

  vec2 centre = modeEclat > 0.5 ? origine : vec2(0.5);
  vec2 p = coordonneesIsotropes(uv, centre, proportions);

  vec2 pOptique = p + inc * 0.16;
  float rayon = length(pOptique);
  float angle = atan(pOptique.y, pOptique.x);

  float anneauxOptiques = pow(0.5 + 0.5 * cos(rayon * 22.0 - t * 0.9), 5.0);
  float rosace = 0.5 + 0.5 * cos(angle * 6.0 + rayon * 4.0 + dot(inc, vec2(2.4)));
  float trameVerre = anneauxOptiques * (0.45 + 0.55 * rosace);

  float phasePrisme = dot(p, inc * 1.45) + rayon * 0.85 + sin(t * 0.55) * 0.08;
  float dispersion = length(inc) * 0.085 + 0.025;
  vec3 spectrePrisme = vec3(
    0.5 + 0.5 * cos(DEUX_PI * (phasePrisme - dispersion)),
    0.5 + 0.5 * cos(DEUX_PI * phasePrisme),
    0.5 + 0.5 * cos(DEUX_PI * (phasePrisme + dispersion))
  );

  float refletNacre = exp(-pow(length(p - inc * 0.34) * 2.6, 2.0)) * 0.65;

  float masque = 1.0;
  float ondeHarmonique = 0.0;
  if (modeEclat > 0.5) {
    float pEclat = clamp(progression, 0.0, 1.0);
    float dist = length(p);
    float rayonOnde = pEclat * 1.72;
    ondeHarmonique = exp(-pow((dist - rayonOnde) * 9.5, 2.0)) * 1.25;
    float sillage = smoothstep(rayonOnde + 0.15, max(0.0, rayonOnde - 0.62), dist);
    masque = max(ondeHarmonique, sillage * 0.82);
  } else {
    masque = 0.36 + 0.64 * masqueCadreCarte(uv, 0.27);
  }

  float lumiere = clamp((trameVerre * 0.72 + refletNacre * 0.65 + ondeHarmonique * 0.75) * masque, 0.0, 1.2);

  vec3 ivoireNacre = mix(teinte, vec3(0.98, 0.96, 0.92), 0.65);
  vec3 couleur = mix(ivoireNacre, spectrePrisme, 0.42 + 0.25 * trameVerre);
  couleur += vec3(1.0, 0.99, 0.96) * (refletNacre * 0.35 + ondeHarmonique * 0.3);

  float intensite = clamp(lumiere * 0.68 * env, 0.0, 1.0);
  return vec4(couleur * lumiere * 0.68 * env, intensite);
}
`;

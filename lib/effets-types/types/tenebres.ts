// types/tenebres.ts
// Matière : éclipse gravitationnelle (anneau d'accrétion) et rayons d'ombre tranchants.
// Mouvement : convergence lente vers la couronne et rotation d'accrétion (géométrique, distinct de Spectre).
// Lumière : contre-jour intense — couronne violet-cramoisi vif autour d'un cœur creux sombre.

export const GLSL_TENEBRES = /* glsl */ `
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

  vec2 centreEclipse = modeEclat > 0.5
    ? coordonneesIsotropes(origine, vec2(0.5), proportions)
    : -inc * 0.26;
  vec2 p = coordonneesIsotropes(uv, vec2(0.5), proportions) - centreEclipse;

  float dist = length(p);
  float angle = atan(p.y, p.x);

  float striesAngulaires = bruitValeur(vec2(cos(angle) * 5.0 + t * 0.25, sin(angle) * 5.0 - t * 0.25));
  float rayonsRasants = pow(striesAngulaires, 3.0) * (0.5 + 0.5 * cos(angle * 10.0 - t * 0.8 + dist * 6.0));

  float couronne = 0.0;
  float haloExterne = 0.0;
  float disqueCreux = 1.0;

  if (modeEclat > 0.5) {
    float pEclat = clamp(progression, 0.0, 1.0);
    float rayonEclipse = pEclat * 1.62;
    couronne = exp(-pow((dist - rayonEclipse) * 14.0, 2.0)) * 1.45;
    float ondeSecondaire = exp(-pow((dist - rayonEclipse * 0.68) * 20.0, 2.0)) * 0.65;
    disqueCreux = smoothstep(rayonEclipse * 0.55, rayonEclipse * 0.92, dist);
    haloExterne = (couronne + ondeSecondaire + rayonsRasants * exp(-abs(dist - rayonEclipse) * 4.5) * 0.85) * disqueCreux;
  } else {
    float rayonCouronne = 0.44 + 0.02 * sin(t * 1.1);
    disqueCreux = smoothstep(rayonCouronne - 0.06, rayonCouronne + 0.02, dist);
    couronne = exp(-pow((dist - rayonCouronne) * 15.0, 2.0)) * 1.15;
    float cadre = masqueCadreCarte(uv, 0.24);
    haloExterne = (couronne + rayonsRasants * cadre * 0.85) * disqueCreux;
  }

  float lumiere = clamp(haloExterne, 0.0, 1.3);

  vec3 ombrePourpre = mix(teinte, vec3(0.24, 0.06, 0.36), 0.72);
  vec3 cramoisiEclipse = vec3(0.82, 0.14, 0.38);
  vec3 liseretViolet = vec3(0.76, 0.58, 1.0);

  vec3 couleur = mix(ombrePourpre, cramoisiEclipse, clamp(couronne * 0.75 + rayonsRasants * 0.45, 0.0, 1.0));
  couleur = mix(couleur, liseretViolet, clamp(pow(couronne, 2.0) * 0.8, 0.0, 0.9));

  float intensite = clamp(lumiere * 0.78 * env, 0.0, 1.0);
  return vec4(couleur * lumiere * 0.78 * env, intensite);
}
`;

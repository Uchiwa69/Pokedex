// types/acier.ts
// Matière : métal brossé anisotrope (micro-stries) et chanfreins usinés.
// Mouvement : inertie métallique au repos, réactivité franche au balayage lumineux.
// Lumière : reflet spéculaire tranchant (« lame de rasoir ») à gradient chrome froid.

export const GLSL_ACIER = /* glsl */ `
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

  vec2 coordBrossage = rotation2D(-0.18) * p;
  float strieBase = bruitValeur(vec2(coordBrossage.x * 6.0, coordBrossage.y * 140.0));
  float strieFine = bruitValeur(vec2(coordBrossage.x * 14.0, coordBrossage.y * 260.0));
  // Anti-moiré : fwidth mesure de combien la coordonnée change d'un pixel au suivant. Quand une strie
  // devient plus fine qu'un pixel (carte petite ou vue de biais), elle scintillerait : on la fond alors
  // dans sa valeur moyenne (0.5) au lieu de la dessiner.
  float pas = fwidth(coordBrossage.y);
  strieBase = mix(strieBase, 0.5, smoothstep(0.3, 0.8, pas * 140.0));
  strieFine = mix(strieFine, 0.5, smoothstep(0.3, 0.8, pas * 260.0));
  float grainBrosse = mix(0.82, 1.18, mix(strieBase, strieFine, 0.45 * uQualite));

  float cadre = masqueCadreCarte(uv, 0.075);
  float biseau = smoothstep(0.075, 0.035, min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y))) * cadre;

  float refletLame = 0.0;
  float ondeMetal = 0.0;

  if (modeEclat > 0.5) {
    float pEclat = clamp(progression, 0.0, 1.0);
    vec2 rel = coordonneesIsotropes(uv, origine, proportions);
    float distUsinee = mix(length(rel), abs(rel.x) + abs(rel.y) * 0.78, 0.45);
    float rayon = pEclat * 1.75;
    ondeMetal = exp(-pow((distUsinee - rayon) * 14.0, 2.0)) * 1.25;
    float traine = exp(-pow((distUsinee - rayon * 0.72) * 22.0, 2.0)) * 0.65;
    refletLame = (ondeMetal + traine) * grainBrosse;
  } else {
    float posLame = inc.x * 0.52 + inc.y * 0.24 + sin(t * 0.75) * 0.06;
    float coordDiag = dot(p, normalize(vec2(0.85, 0.52)));
    float distLame = abs(coordDiag - posLame);

    float lamePrincipale = exp(-pow(distLame * 13.0, 2.0));
    float lameSecondaire = exp(-pow((distLame - 0.16) * 24.0, 2.0)) * 0.42;
    refletLame = (lamePrincipale + lameSecondaire) * grainBrosse;
  }

  vec3 bleuAcier = mix(teinte, vec3(0.58, 0.68, 0.82), 0.65);
  vec3 argentPur = vec3(0.95, 0.97, 1.0);
  vec3 refletTungstene = vec3(1.0, 0.93, 0.84);

  vec3 couleur = mix(bleuAcier, argentPur, clamp(refletLame * 0.9 + biseau * 0.5, 0.0, 1.0));
  couleur = mix(couleur, refletTungstene, clamp(biseau * (0.4 + 0.6 * inc.x), 0.0, 0.45));

  float lumiere = clamp((refletLame * 0.85 + biseau * 0.35 * (1.0 - modeEclat)) * env, 0.0, 1.0);
  return vec4(couleur * lumiere, lumiere);
}
`;

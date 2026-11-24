// types/insecte.ts
// Matière : chitine irisée à micro-alvéoles hexagonales régulières (effet scarabée).
// Mouvement : vibration micro-rythmique fine sur les bords et pulsation biologique.
// Lumière : irisation diffractée vert-citron, turquoise et reflets ambrés sur les arêtes.

export const GLSL_INSECTE = /* glsl */ `
// Pavage alvéolaire serré pour imiter la cuticule chitineuse
vec4 grilleAlveoles(vec2 p) {
  vec2 r = vec2(1.0, 1.7320508);
  vec2 h = r * 0.5;
  vec2 a = mod(p, r) - h;
  vec2 b = mod(p - h, r) - h;
  vec2 gv = dot(a, a) < dot(b, b) ? a : b;
  return vec4(gv, p - gv);
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

  vec2 p = coordonneesIsotropes(uv, vec2(0.5), proportions);

  // Densité adaptée à uQualite pour garantir zéro moiré sur petit écran
  float densiteGrille = mix(11.0, 16.5, uQualite);
  vec4 alv = grilleAlveoles(rotation2D(0.26) * (p * densiteGrille));
  vec2 local = alv.xy;
  vec2 idCellule = alv.zw;

  // Paroi chitineuse nette entre les ommatidies
  float distParoi = abs(distanceHexagone(local, 0.47));
  float paroiChitine = smoothstep(0.085, 0.02, distParoi);

  // Dôme bombé de chaque alvéole réagissant à l'angle d'incidence (irisation scarabée)
  vec3 normaleDome = normalize(vec3(local * 1.9, 1.0));
  vec3 lumiereInclinee = normalize(vec3(inc * 1.65, 1.0));
  float angleDiffraction = dot(normaleDome, lumiereInclinee);
  float refletDome = pow(clamp(angleDiffraction, 0.0, 1.0), 6.0);

  // Bascule chromatique franche entre vert-citron, turquoise et ambre doré
  float phaseChitine = angleDiffraction * 1.35 + hachage21(idCellule) * 0.14 + dot(p, inc) * 0.65;
  vec3 irisationScarabee = paletteCosinus(
    phaseChitine,
    vec3(0.48, 0.56, 0.34),
    vec3(0.42, 0.38, 0.44),
    vec3(1.0, 1.0, 1.0),
    vec3(0.18, 0.42, 0.68)
  );
  vec3 couleurChitine = mix(teinte, irisationScarabee, 0.62);

  float masque = 1.0;
  float ondeEssaim = 0.0;
  if (modeEclat > 0.5) {
    float pEclat = clamp(progression, 0.0, 1.0);
    float dist = length(coordonneesIsotropes(uv, origine, proportions));
    float rayon = pEclat * 1.72;
    ondeEssaim = exp(-pow((dist - rayon) * 11.0, 2.0)) * 1.3;
    float sillage = smoothstep(rayon + 0.12, max(0.0, rayon - 0.55), dist);
    masque = max(ondeEssaim, sillage * 0.85);
  } else {
    // Pulsation biologique douce sur le cadre de la carte
    float cadre = masqueCadreCarte(uv, 0.25);
    float pulsation = 0.82 + 0.18 * sin(t * 3.0 - length(p) * 9.0);
    masque = (0.35 + 0.65 * cadre) * pulsation;
  }

  float structure = clamp((paroiChitine * 0.62 + refletDome * 0.78 + ondeEssaim * 0.65) * masque, 0.0, 1.25);
  vec3 couleurFinale = mix(couleurChitine, vec3(0.95, 1.0, 0.78), clamp(paroiChitine * 0.45 + refletDome * 0.4, 0.0, 0.85));

  float intensite = clamp(structure * 0.74 * env, 0.0, 1.0);
  return vec4(couleurFinale * structure * 0.74 * env, intensite);
}
`;

// types/eau.ts
// Matière : caustiques sous-marines double couche et film liquide réfracté.
// Mouvement : dérive lente des cellules caustiques et ondes concentriques.
// Lumière : filaments cyan-argent très focalisés et reflet liquide roulant.

export const GLSL_EAU = /* glsl */ `
float caustiquesCellulaires(vec2 p, float t) {
  vec2 n = floor(p);
  vec2 f = fract(p);
  float distMin = 8.0;

  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 voisin = vec2(float(i), float(j));
      vec2 graine = hachage22(n + voisin);
      vec2 point = 0.5 + 0.42 * sin(t * 1.15 + DEUX_PI * graine);
      float d = length(voisin + point - f);
      distMin = min(distMin, d);
    }
  }
  return pow(clamp(distMin, 0.0, 1.0), 3.4);
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

  vec2 decalageProfond = inc * 0.24;
  float couche1 = caustiquesCellulaires(p * 4.4 + decalageProfond + vec2(t * 0.12, -t * 0.09), t);
  float couche2 = 0.0;
  if (uQualite > 0.25) {
    couche2 = caustiquesCellulaires(rotation2D(0.55) * (p * 6.2 - decalageProfond * 0.6) - vec2(t * 0.08), t * 1.2);
  } else {
    couche2 = couche1 * 0.75;
  }
  float caustiques = clamp(couche1 * 0.72 + couche2 * 0.58, 0.0, 1.2);

  float ondes = 0.0;
  float masque = 1.0;
  if (modeEclat > 0.5) {
    float pEclat = clamp(progression, 0.0, 1.0);
    float dist = length(coordonneesIsotropes(uv, origine, proportions));
    float rayonVague = pEclat * 1.65;
    float delta = dist - rayonVague;
    float vaguePrincipale = exp(-delta * delta * 38.0);
    float trainOndes = sin(delta * 34.0) * exp(-abs(delta) * 7.5) * step(delta, 0.05);
    ondes = max(vaguePrincipale, trainOndes * 0.65);
    masque = smoothstep(rayonVague + 0.15, max(0.0, rayonVague - 0.55), dist);
  } else {
    float distCentre = length(p - inc * 0.22);
    ondes = 0.5 + 0.5 * sin(distCentre * 18.0 - t * 2.4);
    ondes = pow(ondes, 4.0) * 0.35;
    masque = 0.45 + 0.55 * masqueCadreCarte(uv, 0.28);
  }

  float axeReflet = dot(p, normalize(inc + vec2(0.001, 0.35)));
  float refletLiquide = exp(-pow((axeReflet - length(inc) * 0.28) * 5.5, 2.0)) * 0.45;

  float lumiereTotale = (caustiques * masque * 0.85 + ondes * 0.9 + refletLiquide * (1.0 - modeEclat));
  lumiereTotale = clamp(lumiereTotale, 0.0, 1.15);

  vec3 bleuProfond = teinte * 0.9;
  vec3 cyanCristallin = mix(teinte, vec3(0.78, 0.97, 1.0), 0.72);
  vec3 couleur = mix(bleuProfond, cyanCristallin, clamp(caustiques * 0.8 + ondes * 0.6, 0.0, 1.0));
  couleur += vec3(0.88, 0.98, 1.0) * (refletLiquide * 0.5 + pow(caustiques, 2.2) * 0.45);

  float intensite = clamp(lumiereTotale * 0.72 * env, 0.0, 1.0);
  // La couleur est multipliée par la lumière : sans cela, un voile bleu uniforme couvrait toute la surface,
  // même là où il n'y a ni caustique ni onde.
  return vec4(couleur * lumiereTotale * 0.72 * env, intensite);
}
`;

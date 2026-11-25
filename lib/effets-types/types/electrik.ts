// types/electrik.ts
// Matière : arcs électriques fractals ramifiés et plasma ionisé.
// Mouvement : décharges brèves à cadence maîtrisée (< 2 Hz, sans clignotement rapide).
// Lumière : cœur blanc-bleuté ultra-fin entouré d'un halo or/cyan électrique.

export const GLSL_ELECTRIK = /* glsl */ `
float arcElectrique(vec2 p, vec2 a, vec2 b, float t, float graine, float epaisseur) {
  vec2 ab = b - a;
  float longueur = max(length(ab), 0.0001);
  vec2 dir = ab / longueur;
  vec2 perp = vec2(-dir.y, dir.x);

  float proj = clamp(dot(p - a, dir) / longueur, 0.0, 1.0);
  float attenBouts = sin(proj * PI);

  float zig1 = bruitValeur(vec2(proj * 7.5 + graine * 13.0, t * 4.5)) - 0.5;
  float zig2 = bruitValeur(vec2(proj * 16.0 - graine * 7.0, t * 6.0 + 9.2)) - 0.5;
  float decalage = (zig1 * 0.16 + zig2 * 0.065) * attenBouts;

  vec2 pointSurArc = a + ab * proj + perp * decalage;
  float dist = length(p - pointSurArc);

  float coeur = smoothstep(epaisseur, epaisseur * 0.15, dist);
  float halo = exp(-dist / max(epaisseur * 4.5, 0.012)) * 0.55;
  return coeur + halo;
}

// Ligne brisée : des valeurs au hasard reliées par des segments DROITS (pas de lissage, contrairement à
// bruitValeur). C'est ce qui donne les angles vifs d'un éclair. Résultat entre -0.5 et 0.5.
float ligneBrisee(float y, float graine) {
  float cran = floor(y);
  return mix(hachage11(cran + graine), hachage11(cran + 1.0 + graine), fract(y)) - 0.5;
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

  float coeurTotal = 0.0;
  float haloTotal = 0.0;

  if (modeEclat > 0.5) {
    // Éclat : plusieurs éclairs VERTICAUX qui traversent l'écran de haut en bas, comme la foudre.
    // (Avant : quatre arcs partant de la tuile. En s'allongeant, leurs zigzags s'étiraient et devenaient
    // de grosses courbes lisses.) Ici le tracé de chaque éclair est fixe : il garde ses angles vifs.
    float pEclat = clamp(progression, 0.0, 1.0);
    vec2 p = coordonneesIsotropes(uv, origine, proportions);

    int nbEclairs = uQualite > 0.35 ? 5 : 3;
    for (int i = 0; i < 5; i++) {
      if (i >= nbEclairs) break;
      float rang = float(i);
      // Un éclair passe par la tuile cliquée, les autres de part et d'autre : 0, +0.42, -0.42, +0.84, -0.84.
      float cote = mod(rang, 2.0) < 0.5 ? -1.0 : 1.0;
      float ecart = ceil(rang * 0.5) * 0.42 * cote;
      // Le tracé : de grands zigzags, plus de petits crans par-dessus.
      float trace = ligneBrisee(p.y * 7.0 + rang * 3.7, rang * 17.0) * 0.20
                  + ligneBrisee(p.y * 19.0, rang * 31.0 + 5.0) * 0.06;
      float dist = abs(p.x - ecart - trace);

      // Les éclairs tombent en trois temps décalés (jamais plus de 3 flashs par seconde) : un coup vif,
      // puis l'éclair reste allumé plus faiblement jusqu'à l'extinction générale.
      float age = pEclat - mod(rang, 3.0) * 0.09;
      float flash = smoothstep(0.0, 0.03, age) * (0.45 + 0.55 * exp(-max(age, 0.0) * 6.0));

      float coeur = smoothstep(0.006, 0.001, dist);
      float halo = exp(-dist / 0.03) * 0.5;
      coeurTotal += (coeur + halo) * flash;
    }

    float noyau = exp(-length(p) * 6.5) * (1.0 - smoothstep(0.05, 0.55, pEclat));
    haloTotal += noyau * 1.1;
  } else {
    float cycle = t * 1.5;
    float phase = fract(cycle);
    float idDecharge = floor(cycle);
    float pulsation = mix(sin(phase * PI), 0.72, uCalme);
    pulsation = pow(max(pulsation, 0.0), 1.6);

    vec2 pole = clamp(vec2(0.5) + inc * 0.42, vec2(0.08), vec2(0.92));
    vec2 ancre1 = vec2(0.06, mix(0.2, 0.85, hachage11(idDecharge)));
    vec2 ancre2 = vec2(0.94, mix(0.15, 0.80, hachage11(idDecharge + 7.3)));

    float arc1 = arcElectrique(uv, ancre1, pole, idDecharge * 3.1, 1.7, 0.009);
    float arc2 = 0.0;
    if (uQualite > 0.3) {
      arc2 = arcElectrique(uv, ancre2, pole, idDecharge * 2.7, 4.3, 0.008) * 0.8;
    }

    float cadre = masqueCadreCarte(uv, 0.14);
    float bruitBord = bruitValeur(uv * 14.0 + vec2(t * 1.8, -t * 1.4));
    haloTotal = cadre * pow(bruitBord, 2.4) * 0.55 + exp(-length(uv - pole) * 7.5) * pulsation * 0.65;
    coeurTotal = (arc1 + arc2) * pulsation;
  }

  coeurTotal = clamp(coeurTotal, 0.0, 1.3);
  haloTotal = clamp(haloTotal, 0.0, 1.0);

  vec3 orElectrique = mix(teinte, vec3(1.0, 0.90, 0.25), 0.45);
  vec3 blancBleute = vec3(0.90, 0.96, 1.0);

  vec3 couleur = orElectrique * (haloTotal + coeurTotal * 0.65) + blancBleute * pow(coeurTotal, 1.6);
  float intensite = clamp((coeurTotal * 0.75 + haloTotal * 0.55) * env, 0.0, 1.0);

  return vec4(couleur * 0.82 * env, intensite);
}
`;

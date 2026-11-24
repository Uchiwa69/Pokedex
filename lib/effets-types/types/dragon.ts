// types/dragon.ts
// Matière : écailles imbriquées en relief profond et énergie draconique sous-jacente.
// Mouvement : ondulation majestueuse parcourant les rangées d'écailles de bas en haut.
// Lumière : irisation noble bleu royal, violet cosmique et liseré d'énergie or/cyan.

export const GLSL_DRAGON = /* glsl */ `
// Calcule le relief d'un pavage d'écailles imbriquées en quinconce
// Renvoie : x = hauteur du dôme (0 au bord, 1 au centre), y = liseré d'interstice, z = id rangée
vec3 ecaillesImbriquees(vec2 p) {
  vec2 grille = vec2(p.x, p.y * 1.35);
  float rangee = floor(grille.y);
  // Décalage d'une demi-écaille une rangée sur deux
  grille.x += mod(rangee, 2.0) * 0.5;

  vec2 id = floor(grille);
  vec2 f = fract(grille) - vec2(0.5, 0.35);

  // Enveloppe en ogive arrondie caractéristique d'une écaille de dragon
  float distCentre = length(vec2(f.x * 1.05, f.y * 1.15));
  float dome = clamp(1.0 - distCentre * 1.55, 0.0, 1.0);
  float bordEcaille = exp(-pow((distCentre - 0.56) * 14.0, 2.0));

  return vec3(dome, bordEcaille, hachage21(id));
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
  float octaves = mix(2.0, 3.0, uQualite);

  vec2 p = coordonneesIsotropes(uv, vec2(0.5), proportions);

  // Souffle d'énergie interne qui remonte le long des écailles
  float souffle = fbm(vec2(p.x * 3.0 + inc.x * 0.5, p.y * 2.4 - t * 1.05), octaves);
  float vagueDraconique = 0.5 + 0.5 * sin(p.y * 7.5 - t * 2.5 + souffle * 4.0);

  vec3 ecaille = ecaillesImbriquees(p * 6.8 + inc * 0.14);
  float dome = ecaille.x;
  float interstice = ecaille.y;
  float idEcaille = ecaille.z;

  // Reflet spéculaire propre à chaque écaille bombée selon l'inclinaison
  float alignement = dot(
    normalize(vec3((idEcaille - 0.5) * 0.7 + inc.x * 1.2, dome * 0.8 + inc.y * 1.2, 1.0)),
    vec3(0.0, 0.0, 1.0)
  );
  float refletEcaille = pow(clamp(alignement, 0.0, 1.0), 8.0) * dome;

  float masque = 1.0;
  float vagueSouffle = 0.0;
  if (modeEclat > 0.5) {
    float pEclat = clamp(progression, 0.0, 1.0);
    float dist = length(coordonneesIsotropes(uv, origine, proportions));
    float rayon = pEclat * 1.72;
    vagueSouffle = exp(-pow((dist - rayon) * 7.0, 2.0)) * 1.3;
    float sillage = smoothstep(rayon + 0.16, max(0.0, rayon - 0.65), dist);
    masque = max(vagueSouffle, sillage * 0.85);
  } else {
    masque = 0.42 + 0.58 * masqueCadreCarte(uv, 0.27);
  }

  // Irisation noble bleu royal / violet cosmique + énergie interne dorée dans les interstices
  float phaseIrisation = dome * 0.85 + dot(p, inc) * 0.9 + souffle * 0.45;
  vec3 irisationRoyale = paletteCosinus(
    phaseIrisation,
    vec3(0.36, 0.28, 0.68),
    vec3(0.32, 0.26, 0.32),
    vec3(1.0, 1.0, 1.0),
    vec3(0.55, 0.72, 0.12)
  );
  vec3 couleurBase = mix(teinte, irisationRoyale, 0.58);
  vec3 energieInterstice = mix(vec3(0.35, 0.88, 1.0), vec3(1.0, 0.82, 0.34), vagueDraconique);

  float intensiteInterstice = interstice * (0.45 + 0.65 * vagueDraconique);
  vec3 couleur = couleurBase * (0.45 + refletEcaille * 0.95) + energieInterstice * intensiteInterstice * 0.95;

  float lumiereTotale = clamp((refletEcaille * 0.85 + intensiteInterstice * 0.8 + vagueSouffle * 0.65) * masque, 0.0, 1.25);
  float intensite = clamp(lumiereTotale * 0.76 * env, 0.0, 1.0);

  return vec4(couleur * lumiereTotale * 0.76 * env, intensite);
}
`;

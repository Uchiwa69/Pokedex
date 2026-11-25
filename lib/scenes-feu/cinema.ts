// Variante « cinéma » : jet de flammes, secousse, distorsion de chaleur, papier qui se consume, fumée et braises.
// Shader fourni par l'utilisateur (généré avec Gemini), repris tel quel : seule la ligne « precision » a été
// retirée, three.js l'ajoute déjà. Sortie en alpha prémultiplié : (0,0,0,0) = on voit la vraie page derrière.

export const SHADER_CINEMA = /* glsl */ `
// Uniforms imposés
uniform float uProgression;   // 0 -> 1, piloté par le défilement
uniform float uTemps;         // secondes, animation continue des flammes/particules
uniform float uProportions;   // largeur / hauteur de l'écran
uniform sampler2D uImage;     // Dracaufeu, alpha droit (non prémultiplié)
uniform vec2 uCentre;         // centre de l'illustration (unité = hauteur d'écran, 0 = milieu)
uniform float uTaille;        // côté de l'illustration (même unité)
uniform vec3 uFond;           // couleur de fond de la page (#0F1115 ou #F4F5F8)

// Uniforms ajoutés
uniform float uQualite;           // 0.5 sur mobile, 1.0 sur ordinateur
uniform float uIntensiteSecousse; // 0.015 conseillé (amplitude du tremblement de caméra)

varying vec2 vUv;

// Hachage pseudo-aléatoire sans dépendance trigonométrique lourde
float hachage(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

// Bruit de valeur lissé (interpolation cubique d'Hermite)
float bruit(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    float a = hachage(i);
    float b = hachage(i + vec2(1.0, 0.0));
    float c = hachage(i + vec2(0.0, 1.0));
    float d = hachage(i + vec2(1.0, 1.0));

    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Mouvement brownien fractionnaire (FBM) avec rotation entre octaves pour éviter les artefacts alignés
float fbm(vec2 p, int octavesMax) {
    float valeur = 0.0;
    float amplitude = 0.5;
    mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);

    for (int i = 0; i < 5; i++) {
        if (i >= octavesMax) break;
        valeur += amplitude * bruit(p);
        p = rot * p * 2.03 + vec2(17.1, 31.7);
        amplitude *= 0.5;
    }
    return valeur;
}

// Palette thermique réaliste (du rouge sombre au blanc incandescent)
vec3 paletteFeu(float t) {
    t = clamp(t, 0.0, 1.0);
    vec3 c1 = vec3(0.45, 0.03, 0.00); // Rouge braise
    vec3 c2 = vec3(1.00, 0.32, 0.02); // Orange vif
    vec3 c3 = vec3(1.00, 0.82, 0.28); // Jaune chaud
    vec3 c4 = vec3(1.00, 0.98, 0.90); // Cœur blanc

    vec3 col = mix(c1, c2, smoothstep(0.0, 0.35, t));
    col = mix(col, c3, smoothstep(0.35, 0.72, t));
    col = mix(col, c4, smoothstep(0.72, 1.0, t));
    return col;
}

// Couche procédurale d'étincelles et braises flottantes
float coucheBraises(vec2 uv, float temps, float densite) {
    vec2 grille = uv * densite;
    vec2 id = floor(grille);
    vec2 f = fract(grille) - 0.5;

    float rnd = hachage(id);
    if (rnd > 0.32) return 0.0;

    // Oscillation horizontale et décalage de phase
    vec2 decalage = vec2(
        sin(temps * (2.0 + rnd * 3.0) + rnd * 20.0) * 0.28,
        cos(temps * 1.5 + rnd * 12.0) * 0.25
    );
    float dist = length(f - decalage);
    float rayon = mix(0.03, 0.09, fract(rnd * 17.3));
    float scintillement = 0.55 + 0.45 * sin(temps * 12.0 + rnd * 50.0);

    return smoothstep(rayon, 0.0, dist) * scintillement;
}

void main() {
    int octaves = (uQualite < 0.75) ? 3 : 5;

    // 1. Coordonnées normalisées par la hauteur de l'écran
    vec2 posEcran = (vUv - 0.5) * vec2(uProportions, 1.0);
    // Gueule à (0.40, 0.19) depuis le coin haut-gauche => (0.40, 0.81) en UV WebGL
    vec2 posGueule = uCentre + (vec2(0.40, 0.81) - 0.5) * uTaille;

    // 2. Secousse de caméra centrée sur l'impact du souffle (uProgression ~ 0.35)
    float enveloppeSecousse = sin(clamp((uProgression - 0.12) / 0.45, 0.0, 1.0) * 3.14159265);
    enveloppeSecousse *= enveloppeSecousse;
    vec2 secousse = vec2(
        bruit(vec2(uTemps * 28.0, 1.3)) - 0.5,
        bruit(vec2(1.3, uTemps * 28.0)) - 0.5
    ) * uIntensiteSecousse * enveloppeSecousse * step(0.001, uProgression);

    vec2 posSecouee = posEcran + secousse;

    // 3. Distorsion thermique devant la gueule et dans le sillage des flammes
    float avanceeSouffle = smoothstep(0.02, 0.55, uProgression);
    vec2 deltaGueule = posSecouee - posGueule;
    float distGueule = length(deltaGueule);

    vec2 uvBruitChaleur = posSecouee * 6.5 - vec2(0.0, uTemps * 2.2);
    vec2 ondeChaleur = vec2(
        fbm(uvBruitChaleur, 3) - 0.5,
        fbm(uvBruitChaleur + 4.2, 3) - 0.5
    );
    float zoneChaleur = smoothstep(0.15 + avanceeSouffle * 1.4, 0.0, distGueule) * smoothstep(0.0, 0.08, uProgression);
    vec2 posDistordue = posSecouee + ondeChaleur * 0.035 * zoneChaleur;

    // 4. Rendu du fond et de Dracaufeu
    vec2 uvImage = (posDistordue - uCentre) / uTaille + 0.5;
    float dansCadre = step(0.0, uvImage.x) * step(uvImage.x, 1.0)
                    * step(0.0, uvImage.y) * step(uvImage.y, 1.0);

    vec4 texDracaufeu = texture2D(uImage, clamp(uvImage, 0.0, 1.0));
    float alphaSprite = texDracaufeu.a * dansCadre;

    // Éclairage orangé projeté par le feu sur Dracaufeu
    float intensiteLueur = smoothstep(0.02, 0.25, uProgression) * smoothstep(0.85, 0.45, uProgression);
    float proximiteGueule = smoothstep(uTaille * 0.85, 0.0, distGueule);
    vec3 lueurSprite = vec3(1.0, 0.42, 0.08) * proximiteGueule * intensiteLueur * 0.65;
    vec3 couleurSprite = texDracaufeu.rgb + lueurSprite * alphaSprite;

    vec3 couleurBase = mix(uFond, couleurSprite, alphaSprite);

    // 5. Propagation de la brûlure sur l'écran (à partir de uProgression = 0.35)
    float rayonMaxEcran = length(vec2(uProportions * 0.5, 0.5) + abs(posGueule)) + 0.25;
    float progBrulure = smoothstep(0.35, 0.94, uProgression);

    // Déformation organique du front de combustion (effet Roughen Edges)
    float bruitBord = fbm(posSecouee * 5.2 + vec2(0.0, -uTemps * 0.45), octaves);
    float bruitFin = fbm(posSecouee * 18.0 - vec2(uTemps * 0.3), 3);
    float frontBrulure = distGueule + (bruitBord - 0.5) * 0.34 + (bruitFin - 0.5) * 0.06;
    float seuilBrulure = progBrulure * rayonMaxEcran * 1.18 - 0.12;

    // Masque du trou : 1.0 = support intact, 0.0 = totalement consumé
    float masqueSupport = smoothstep(seuilBrulure - 0.015, seuilBrulure + 0.015, frontBrulure);
    masqueSupport = mix(1.0, masqueSupport, step(0.0001, uProgression));

    // Bande carbonisée (suie noire) juste avant le front incandescent
    float zoneSuie = smoothstep(seuilBrulure + 0.09, seuilBrulure + 0.005, frontBrulure) * masqueSupport;
    vec3 couleurSuie = vec3(0.05, 0.04, 0.035);
    couleurBase = mix(couleurBase, couleurSuie, zoneSuie * 0.88);

    // Liseré incandescent sur la tranche du papier qui brûle
    float distBord = abs(frontBrulure - seuilBrulure);
    float liseretIncandescent = smoothstep(0.045, 0.0, distBord) * smoothstep(0.0, 0.05, progBrulure) * smoothstep(1.0, 0.90, uProgression);
    float variationBraise = 0.6 + 0.6 * bruit(posSecouee * 32.0 + uTemps * 4.0);
    vec3 lumiereBord = paletteFeu(liseretIncandescent * variationBraise) * liseretIncandescent * 2.4;

    // 6. Jet de flammes principal qui grossit vers la caméra
    float phaseJet = smoothstep(0.03, 0.42, uProgression) * smoothstep(0.88, 0.48, uProgression);
    vec2 cibleJet = mix(posGueule, vec2(0.0, -0.05), smoothstep(0.05, 0.55, uProgression));
    float rayonJet = mix(0.02, max(uProportions, 1.0) * 0.85, pow(smoothstep(0.03, 0.62, uProgression), 1.35));

    vec2 dirJet = posSecouee - cibleJet;
    vec2 uvJet = dirJet / max(rayonJet, 0.001);
    float distJet = length(uvJet);

    // Turbulence ascendante des flammes
    vec2 pTurbulence = posSecouee * 4.2 - vec2(0.0, uTemps * 3.4);
    float turb1 = fbm(pTurbulence, octaves);
    float turb2 = fbm(pTurbulence * 2.1 + turb1 * 1.6 - vec2(0.0, uTemps * 2.0), octaves);

    float formeFlamme = (1.0 - distJet) + (turb2 - 0.48) * 0.72;
    float intensiteFlamme = smoothstep(0.05, 0.85, formeFlamme) * phaseJet;
    vec3 couleurFlamme = paletteFeu(intensiteFlamme * 1.15) * intensiteFlamme * 1.9;

    // 7. Fumée chaude et braises volantes
    float phaseFumee = smoothstep(0.25, 0.55, uProgression) * smoothstep(1.0, 0.78, uProgression);
    float bruitFumee = fbm(posSecouee * 3.2 - vec2(0.0, uTemps * 1.1), octaves);
    float masqueFumee = smoothstep(0.45, 0.88, bruitFumee) * smoothstep(rayonMaxEcran * 0.9, 0.0, distGueule) * phaseFumee;
    vec3 couleurFumee = mix(vec3(0.14, 0.13, 0.13), vec3(0.45, 0.16, 0.04), intensiteFlamme);
    float alphaFumee = masqueFumee * 0.45;

    // Braises ascendantes (1 ou 2 couches selon uQualite)
    float phaseBraises = smoothstep(0.15, 0.40, uProgression) * smoothstep(1.0, 0.82, uProgression);
    vec2 uvBraises1 = posSecouee + vec2(0.0, -uTemps * 0.42);
    float braises = coucheBraises(uvBraises1, uTemps, 14.0);
    if (uQualite >= 0.75) {
        vec2 uvBraises2 = posSecouee * 1.3 + vec2(2.4, -uTemps * 0.65);
        braises += coucheBraises(uvBraises2, uTemps * 1.3, 22.0) * 0.7;
    }
    vec3 couleurBraises = vec3(1.0, 0.55, 0.12) * braises * phaseBraises * 2.2;

    // 8. Composition finale en ALPHA PRÉMULTIPLIÉ
    vec3 rgbFinal = couleurBase * masqueSupport;
    float alphaFinal = masqueSupport;

    // Ajout de la fumée semi-transparente
    rgbFinal = rgbFinal * (1.0 - alphaFumee) + couleurFumee * alphaFumee;
    alphaFinal = alphaFinal + alphaFumee * (1.0 - alphaFinal);

    // Ajout des éléments purement émissifs (flammes, liseré incandescent, braises)
    vec3 emissif = couleurFlamme + lumiereBord + couleurBraises;
    float alphaEmissif = clamp(max(emissif.r, max(emissif.g, emissif.b)) * 0.55, 0.0, 1.0);

    rgbFinal += emissif;
    alphaFinal = clamp(alphaFinal + alphaEmissif * (1.0 - alphaFinal), 0.0, 1.0);

    // Garantie stricte de transparence totale à uProgression = 1.0
    float finSequence = 1.0 - smoothstep(0.96, 1.0, uProgression);
    gl_FragColor = vec4(rgbFinal * finSequence, alphaFinal * finSequence);
}
`;

// Version 2B « érosion » : même souffle, puis chaque cellule carbonisée rétrécit jusqu'à disparaître en cendres.
// Dracaufeu y est intégré à la scène : fond brumeux, contre-jour, ombre au sol, respiration, flamme de la queue.
// Shader fourni par l'utilisateur (généré avec Gemini), ADAPTÉ au projet (les ajouts sont marqués « Ajout du projet ») : trois images
// de Dracaufeu en fondu, gueule et queue recalées sur ces images, braises qui restent à la fin. Sortie en alpha prémultiplié : (0,0,0,0) = on voit la vraie page derrière.

export const SHADER_EROSION = /* glsl */ `
// --- UNIFORMS IMPOSÉS ---
uniform float uProgression;   // 0 -> 1, piloté par le défilement
uniform float uTemps;         // secondes, animation continue
uniform float uProportions;   // largeur / hauteur de l'écran
uniform sampler2D uImage;     // Dracaufeu au repos (image générée, détourée : alpha droit)
uniform sampler2D uImage2;    // Dracaufeu qui inspire, gueule entrouverte
uniform sampler2D uImage3;    // Dracaufeu gueule grande ouverte, incandescente
uniform vec2 uCentre;         // centre de l'illustration
uniform float uTaille;        // côté de l'illustration
uniform vec3 uFond;           // couleur de fond sombre (#0F1115)

// --- UNIFORMS AJOUTÉS ---
uniform float uQualite;           // 0.5 sur mobile, 1.0 sur ordinateur
uniform float uIntensiteSecousse; // 0.014 conseillé

// Ajout du projet : la capture. Position de la Pokéball 3D (mêmes unités que l'écran) et force de l'aspiration (0 à 1).
uniform vec2 uPokeball;
uniform float uAspiration;

varying vec2 vUv;

float hachage1(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

vec2 hachage2(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
}

float bruit(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hachage1(i), hachage1(i + vec2(1.0, 0.0)), u.x),
               mix(hachage1(i + vec2(0.0, 1.0)), hachage1(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p, int octavesMax) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
    for (int i = 0; i < 5; i++) {
        if (i >= octavesMax) break;
        v += a * bruit(p);
        p = rot * p * 2.03 + vec2(17.1, 31.7);
        a *= 0.5;
    }
    return v;
}

vec3 paletteFeu(float t) {
    t = clamp(t, 0.0, 1.0);
    vec3 c1 = vec3(0.38, 0.02, 0.00);
    vec3 c2 = vec3(0.95, 0.24, 0.01);
    vec3 c3 = vec3(1.00, 0.68, 0.14);
    vec3 c4 = vec3(1.00, 0.92, 0.68);
    vec3 col = mix(c1, c2, smoothstep(0.0, 0.38, t));
    col = mix(col, c3, smoothstep(0.38, 0.78, t));
    col = mix(col, c4, smoothstep(0.78, 1.0, t));
    return col;
}

// Voronoi cellulaire : x = distance au bord (nervure), y = distance au centre de la cellule
vec3 voronoiCellules(vec2 x) {
    vec2 n = floor(x);
    vec2 f = fract(x);
    vec2 mg, mr;
    float md = 8.0;
    float id = 0.0;

    for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
            vec2 g = vec2(float(i), float(j));
            vec2 o = hachage2(n + g);
            vec2 pos = 0.5 + 0.4 * sin(6.2831 * o + 0.5);
            vec2 r = g + pos - f;
            float d = dot(r, r);
            if (d < md) {
                md = d;
                mr = r;
                mg = g;
                id = o.x;
            }
        }
    }
    float distCentre = sqrt(md);
    md = 8.0;
    for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
            vec2 g = mg + vec2(float(i), float(j));
            vec2 o = hachage2(n + g);
            vec2 pos = 0.5 + 0.4 * sin(6.2831 * o + 0.5);
            vec2 r = g + pos - f;
            if (dot(mr - r, mr - r) > 0.0001) {
                md = min(md, dot(0.5 * (mr + r), normalize(r - mr)));
            }
        }
    }
    return vec3(md, distCentre, id);
}

float particulesAscendantes(vec2 uv, float temps, float densite, float tailleMax) {
    vec2 grille = uv * densite;
    vec2 id = floor(grille);
    vec2 f = fract(grille) - 0.5;
    float rnd = hachage1(id);
    if (rnd > 0.36) return 0.0;
    vec2 decalage = vec2(sin(temps * (2.0 + rnd * 2.5) + rnd * 25.0) * 0.34,
                         cos(temps * 1.4 + rnd * 14.0) * 0.25);
    float dist = length(f - decalage);
    float rayon = mix(0.025, tailleMax, fract(rnd * 19.7));
    return smoothstep(rayon, 0.0, dist) * (0.5 + 0.5 * sin(temps * 10.0 + rnd * 40.0));
}

void main() {
    int octaves = (uQualite < 0.75) ? 3 : 5;
    vec2 posEcran = (vUv - 0.5) * vec2(uProportions, 1.0);
    // Gueule des nouvelles images : (0.26, 0.33) depuis le coin haut-gauche => (0.26, 0.67) en UV WebGL.
    vec2 posGueule = uCentre + (vec2(0.26, 0.67) - 0.5) * uTaille;

    float envSecousse = sin(clamp((uProgression - 0.10) / 0.34, 0.0, 1.0) * 3.14159265);
    envSecousse *= envSecousse;
    vec2 secousse = vec2(bruit(vec2(uTemps * 32.0, 1.7)) - 0.5,
                         bruit(vec2(2.3, uTemps * 32.0)) - 0.5) * uIntensiteSecousse * envSecousse * step(0.001, uProgression);

    // Ajout du projet : mouvement de CAMÉRA. Elle avance lentement vers la gueule pendant la charge (+10 %), recule
    // d'un coup quand le souffle part (le zoom tombe à 0,96), puis revient à 1 avant la désintégration.
    // Zoomer = diviser les distances autour d'un point fixe, ici la gueule.
    float zoomCamera = 1.0 + 0.10 * smoothstep(0.0, 0.11, uProgression) - 0.14 * smoothstep(0.11, 0.15, uProgression)
                     + 0.04 * smoothstep(0.15, 0.34, uProgression);
    vec2 pos = posGueule + (posEcran + secousse - posGueule) / zoomCamera;
    float distGueule = length(pos - posGueule);
    float rayonMaxEcran = length(vec2(uProportions * 0.5, 0.5) + abs(posGueule)) + 0.35;

    // 1. Scène de base (fond texturé + Dracaufeu intégré + queue animée)
    float vignette = smoothstep(1.35, 0.15, length(pos * vec2(0.75, 1.0)));
    // Réglage du projet : la brume en taches du fond est retirée (elle dessinait des zones sombres aux bords
    // nets derrière la tête) et le halo de contre-jour s'éteint plus loin et plus doucement.
    vec3 couleurFond = uFond * (0.65 + 0.45 * vignette) + vec3(0.035, 0.012, 0.004) * vignette;
    float contreJour = smoothstep(uTaille * 1.35, 0.0, length(pos - uCentre));
    contreJour *= contreJour;
    couleurFond += vec3(0.24, 0.07, 0.015) * contreJour;
    // Ajout du projet : le feu ÉCLAIRE le décor. Une lueur orange monte autour de la gueule pendant le souffle,
    // vacille légèrement, puis retombe.
    float lueurSouffle = smoothstep(0.08, 0.20, uProgression) * smoothstep(0.52, 0.34, uProgression);
    couleurFond += vec3(0.55, 0.17, 0.03) * lueurSouffle * smoothstep(2.0, 0.0, distGueule) * (0.85 + 0.15 * sin(uTemps * 13.0));

    vec2 posSol = (pos - (uCentre + vec2(0.02, -uTaille * 0.44))) / vec2(uTaille * 0.42, uTaille * 0.07);
    couleurFond *= (1.0 - smoothstep(1.0, 0.1, length(posSol)) * 0.65);

    float respiration = sin(uTemps * 2.1) * 0.0045 * (1.0 - smoothstep(0.15, 0.45, uProgression));
    vec2 centreAnime = uCentre + vec2(0.0, respiration);
    // Ajout du projet : Dracaufeu RÉAGIT. Le recul : tout le corps part en arrière (à l'opposé de la gueule) au
    // moment où le souffle jaillit, puis revient.
    float recul = smoothstep(0.11, 0.15, uProgression) * (1.0 - smoothstep(0.20, 0.46, uProgression));
    centreAnime += vec2(0.02, -0.008) * uTaille * recul;
    float inspiration = sin(clamp(uProgression / 0.22, 0.0, 1.0) * 3.14159265) * 0.035;
    float tailleAnimee = uTaille * (1.0 + inspiration);

    vec2 uvImage = (pos - centreAnime) / tailleAnimee + 0.5;
    // Les ailes : pendant le souffle, les bords de l'image (là où sont les ailes) se soulèvent et battent. Le
    // milieu, où se trouvent le corps et la tête, ne bouge pas (poids nul près du centre).
    float souffleCorps = smoothstep(0.10, 0.16, uProgression) * smoothstep(0.50, 0.36, uProgression);
    float versLesAiles = smoothstep(0.30, 0.50, abs(uvImage.x - 0.5));
    uvImage.y -= souffleCorps * (0.7 + 0.3 * sin(uTemps * 6.0)) * 0.028 * versLesAiles;
    float dansCadre = step(0.0, uvImage.x) * step(uvImage.x, 1.0) * step(0.0, uvImage.y) * step(uvImage.y, 1.0);
    // Ajout du projet : trois images superposables (détourées, avec transparence) au lieu d'une. On passe du
    // repos à l'inspiration, puis à la gueule ouverte pendant le souffle, et on revient au repos ensuite.
    // Fondus COURTS : la tête n'est pas au même endroit d'une image à l'autre, un fondu long ferait un fantôme.
    vec2 uvBorne = clamp(uvImage, 0.0, 1.0);
    float versInspiration = smoothstep(0.03, 0.06, uProgression);
    float versSouffle = smoothstep(0.10, 0.13, uProgression);
    float retourRepos = smoothstep(0.47, 0.50, uProgression);
    vec4 repos = texture2D(uImage, uvBorne);
    vec4 tex = mix(repos, texture2D(uImage2, uvBorne), versInspiration);
    tex = mix(tex, texture2D(uImage3, uvBorne), versSouffle);
    tex = mix(tex, repos, retourRepos);
    float alphaSprite = tex.a * dansCadre;

    float phaseCharge = smoothstep(0.0, 0.14, uProgression) * smoothstep(0.48, 0.18, uProgression);
    float phaseSouffle = smoothstep(0.08, 0.25, uProgression) * smoothstep(0.55, 0.32, uProgression);
    vec3 eclairageFeu = vec3(1.0, 0.38, 0.06) * (
        smoothstep(tailleAnimee * 0.35, 0.0, distGueule) * phaseCharge * 0.3 +
        smoothstep(tailleAnimee * 0.9, 0.05, distGueule) * phaseSouffle * 0.35
    );
    // Ajout du projet : éclairage adouci (les nouvelles images ont déjà la gueule incandescente).
    // Tramage : un grain invisible (moins d'un niveau de couleur) qui casse les « marches » des dégradés sombres.
    couleurFond += (hachage1(gl_FragCoord.xy) - 0.5) / 255.0 * 1.6;
    vec3 couleurScene = mix(couleurFond, tex.rgb * (0.92 + 0.12 * contreJour) + eclairageFeu * alphaSprite, alphaSprite);
    // Ajout du projet (capture) : quand la Pokéball s'ouvre, ce qui reste de Dracaufeu vire à la lumière rouge.
    couleurScene = mix(couleurScene, vec3(1.0, 0.22, 0.16), alphaSprite * uAspiration * 0.75);

    // Queue animée
    vec2 posQueue = centreAnime + (vec2(0.87, 0.44) - 0.5) * tailleAnimee;
    // Ajout du projet : la flamme de la queue grossit et blanchit pendant le souffle.
    vec2 deltaQueue = (pos - posQueue) / (tailleAnimee * (1.0 + 0.6 * souffleCorps));
    float turbQueue = fbm(pos * 14.0 - vec2(0.0, uTemps * 5.5), 3);
    float intensiteQueue = smoothstep(0.11, 0.015, length(vec2(deltaQueue.x * 1.6, (deltaQueue.y - 0.02) * 0.85)) + (turbQueue - 0.5) * 0.075);
    couleurScene += paletteFeu(intensiteQueue * (1.1 + 0.5 * souffleCorps)) * intensiteQueue * (0.55 + 0.9 * souffleCorps) + vec3(1.0, 0.35, 0.05) * smoothstep(0.26, 0.0, length(deltaQueue)) * (0.32 + 0.3 * souffleCorps);

    // 2. DÉSINTÉGRATION VARIANTE 2B : ÉROSION DE L'INTÉRIEUR VERS L'EXTÉRIEUR DES CELLULES
    // Les fissures brûlent d'abord, puis chaque îlot carbonisé rétrécit jusqu'à disparaître en cendres
    vec2 warp = vec2(fbm(pos * 4.2, 3), fbm(pos * 4.2 + 7.1, 3)) - 0.5;
    vec3 vor = voronoiCellules(pos * 6.0 + warp * 0.45);
    float distBordCellule = vor.x;
    float idCellule = vor.z;

    // Réglage du projet : avance RÉGULIÈRE (clamp) au lieu d'un départ et d'une fin ralentis (smoothstep) : la
    // brûlure progresse à vitesse constante sous la molette, c'est plus fluide.
    float progDesint = clamp((uProgression - 0.36) / 0.56, 0.0, 1.0);
    // Réglage du projet : micro-bruit ralenti (0.9 → 0.2) et affaibli plus bas, sinon les bords tremblaient.
    float bruitMicro = fbm(pos * 22.0 - vec2(0.0, uTemps * 0.2), 3);

    // Champ d'érosion combinant distance depuis la gueule, identifiant de cellule et micro-bruit de cendres
    // Réglage du projet : le hasard par cellule est réduit (0.28 → 0.16) pour qu'on voie mieux la brûlure PARTIR de la gueule.
    float champCombustion = distGueule + idCellule * 0.16 + (bruitMicro - 0.5) * 0.08;
    // Le bord de chaque cellule (distBordCellule petit) brûle plus tôt que son cœur
    float erosionCellule = champCombustion + distBordCellule * 0.55;
    // Réglage du projet : marge réduite (× 1.25 + 0.45 → × 1.0 + 0.2). Avec l'ancienne, tout avait brûlé aux deux
    // tiers de la désintégration et la fin du défilement ne montrait plus rien.
    float seuilErosion = progDesint * (rayonMaxEcran * 1.0 + 0.2) - 0.12;

    // 1 = matière encore présente, 0 = consumée en cendres
    float masqueMatiere = smoothstep(seuilErosion - 0.015, seuilErosion + 0.025, erosionCellule);
    masqueMatiere = mix(1.0, masqueMatiere, smoothstep(0.34, 0.38, uProgression));
    masqueMatiere = mix(1.0, masqueMatiere, step(0.0001, uProgression));

    // Carbonisation avancée devant le front d'érosion
    // Correction du projet : la carbonisation n'existe qu'à partir du début de la désintégration. Sans cette
    // dernière multiplication, une cellule proche de la gueule était déjà grisée sur le visage dès le départ.
    float zoneCharbon = smoothstep(seuilErosion + 0.24, seuilErosion, erosionCellule) * masqueMatiere
                      * smoothstep(0.34, 0.40, uProgression);
    couleurScene = mix(couleurScene, vec3(0.04, 0.035, 0.03), zoneCharbon * 0.94);

    // Réseau de braises vives sur toutes les arêtes en cours de combustion
    float frontBraises = smoothstep(0.055, 0.0, abs(erosionCellule - seuilErosion))
                       * smoothstep(0.35, 0.42, uProgression)
                       * smoothstep(0.98, 0.88, uProgression);
    float puls = 0.6 + 0.6 * bruit(pos * 38.0 + uTemps * 1.5);
    vec3 lumiereCellules = paletteFeu(clamp(frontBraises * puls, 0.0, 1.0)) * frontBraises * 2.2;

    // 3. Souffle de flammes (retombe avant 0.46)
    float phaseJet = smoothstep(0.07, 0.22, uProgression) * smoothstep(0.47, 0.31, uProgression);
    vec2 cibleJet = mix(posGueule, vec2(-0.05, -0.02), smoothstep(0.08, 0.36, uProgression));
    float rayonJet = mix(0.02, max(uProportions, 1.0) * 0.72, pow(smoothstep(0.07, 0.35, uProgression), 1.25));
    float distJet = length((pos - cibleJet) / max(rayonJet, 0.001));
    vec2 pTurb = pos * 4.6 - vec2(0.0, uTemps * 3.8);
    float turb2 = fbm(pTurb * 2.1 + fbm(pTurb, octaves) * 1.5 - vec2(0.0, uTemps * 2.2), octaves);
    float intensiteFlamme = smoothstep(0.08, 0.88, (1.0 - distJet) + (turb2 - 0.50) * 0.68) * phaseJet;
    vec3 couleurFlamme = paletteFeu(intensiteFlamme * 0.92) * intensiteFlamme * 1.45;

    // 4. Nuée de braises et cendres volantes
    float phaseBraises = smoothstep(0.28, 0.46, uProgression) * smoothstep(1.0, 0.84, uProgression);
    float braises = particulesAscendantes(pos + vec2(0.0, -uTemps * 0.52), uTemps, 16.0, 0.085);
    if (uQualite >= 0.75) {
        braises += particulesAscendantes(pos * 1.35 + vec2(3.1, -uTemps * 0.75), uTemps * 1.25, 25.0, 0.065) * 0.75;
    }
    vec3 couleurBraises = vec3(1.0, 0.48, 0.09) * braises * phaseBraises * 2.1;

    // 5. Sortie en alpha prémultiplié
    vec3 rgbFinal = couleurScene * masqueMatiere;
    float alphaFinal = masqueMatiere;

    vec3 emissif = couleurFlamme + lumiereCellules + couleurBraises;
    float alphaEmissif = clamp(max(emissif.r, max(emissif.g, emissif.b)) * 0.48, 0.0, 1.0);

    rgbFinal += emissif;
    alphaFinal = clamp(alphaFinal + alphaEmissif * (1.0 - alphaFinal), 0.0, 1.0);

    float fin = 1.0 - smoothstep(0.95, 1.0, uProgression);
    // Ajout du projet (demande de l'utilisateur) : quand tout a brûlé, des braises continuent de monter en
    // fond, derrière l'écran de fin. Elles apparaissent pendant que le reste s'éteint.
    float restes = particulesAscendantes(pos + vec2(1.7, -uTemps * 0.22), uTemps * 0.6, 11.0, 0.07) * smoothstep(0.80, 0.91, uProgression);
    vec3 rgbRestes = vec3(1.0, 0.48, 0.09) * restes * 1.2;
    float alphaRestes = clamp(restes * 0.6, 0.0, 1.0);

    // Ajout du projet : LA CAPTURE. Des traits de lumière convergent vers la Pokéball ouverte. On passe en
    // coordonnées polaires autour d'elle (distance, angle) : l'angle est découpé en secteurs, et dans certains
    // secteurs un point lumineux glisse vers le centre (la phase avance avec le temps, donc le point se rapproche).
    vec2 versBalle = posEcran - uPokeball;
    float distBalle = length(versBalle);
    float angleBalle = atan(versBalle.y, versBalle.x) * 14.0 / 3.14159265;
    float hasardSecteur = hachage1(vec2(floor(angleBalle), 3.0));
    float phase = fract(distBalle * 1.3 + uTemps * (0.7 + hasardSecteur * 0.6) + hasardSecteur);
    // Tête arrondie (premier smoothstep) puis traînée qui s'efface (le deuxième) ; le troisième l'affine en largeur.
    float trait = smoothstep(0.0, 0.05, phase) * smoothstep(0.34, 0.05, phase) * smoothstep(0.14, 0.0, abs(fract(angleBalle) - 0.5)) * step(0.45, hasardSecteur);
    // Visible entre le bord de la Pokéball et environ une hauteur d'écran autour d'elle.
    float aspiration = trait * smoothstep(1.3, 0.15, distBalle) * smoothstep(0.02, 0.12, distBalle) * uAspiration;
    float haloBalle = exp(-distBalle * 9.0) * 0.5 * uAspiration;
    vec3 rgbCapture = vec3(1.0, 0.5, 0.2) * aspiration * 1.6 + vec3(1.0, 0.3, 0.2) * haloBalle;
    float alphaCapture = clamp(aspiration + haloBalle * 0.6, 0.0, 1.0);

    gl_FragColor = vec4(rgbFinal * fin + rgbRestes + rgbCapture, clamp(alphaFinal * fin + alphaRestes + alphaCapture, 0.0, 1.0));
}
`;

// @ts-nocheck
// ─────────────────────────────────────────────────────────────────────────────────────────────
// PROTOTYPE (/labo/pokedex-3d) — modèle 3D du Pokédex en three.js.
// Ce fichier est REPRIS d'un fichier fourni par l'utilisateur (généré par une IA) : les générateurs de textures
// et la fonction buildPokedexAssembly, qui construit l'appareil pièce par pièce (corps, lentille, écran,
// charnière, volet articulé). Il est recopié tel quel, d'où « @ts-nocheck » (pas de types) et l'exclusion d'ESLint.
// Ajouts : les « export », et trois fonctions qui manquaient dans le fichier d'origine (createRoundedRectShape,
// createRoundedBoxMesh et createPillButton, réécrites d'après la façon dont le reste du fichier les appelle).
// Le code écrit pour ce projet est dans components/labo/Pokedex3D.tsx.
// ─────────────────────────────────────────────────────────────────────────────────────────────

import * as THREE from "three";

// Rectangle aux coins arrondis, centré sur l'origine (ajout : absent du fichier d'origine).
function createRoundedRectShape(largeur, hauteur, rayon) {
  const x = -largeur / 2;
  const y = -hauteur / 2;
  const forme = new THREE.Shape();
  forme.moveTo(x + rayon, y);
  forme.lineTo(x + largeur - rayon, y);
  forme.quadraticCurveTo(x + largeur, y, x + largeur, y + rayon);
  forme.lineTo(x + largeur, y + hauteur - rayon);
  forme.quadraticCurveTo(x + largeur, y + hauteur, x + largeur - rayon, y + hauteur);
  forme.lineTo(x + rayon, y + hauteur);
  forme.quadraticCurveTo(x, y + hauteur, x, y + hauteur - rayon);
  forme.lineTo(x, y + rayon);
  forme.quadraticCurveTo(x, y, x + rayon, y);
  return forme;
}

// Boîte aux coins arrondis et aux arêtes biseautées, centrée sur l'origine (ajout : absente du fichier d'origine).
// Le rectangle arrondi est « extrudé » (étiré en épaisseur) ; le biseau adoucit les arêtes, là où la lumière accroche.
function createRoundedBoxMesh(largeur, hauteur, profondeur, rayon, biseau, materiau) {
  const forme = createRoundedRectShape(largeur - biseau * 2, hauteur - biseau * 2, Math.max(rayon - biseau, 0.001));
  const geometrie = new THREE.ExtrudeGeometry(forme, {
    depth: Math.max(profondeur - biseau * 2, 0.001),
    bevelEnabled: true,
    bevelThickness: biseau,
    bevelSize: biseau,
    bevelSegments: 5,
    curveSegments: 24,
  });
  geometrie.center();
  const maillage = new THREE.Mesh(geometrie, materiau);
  maillage.castShadow = true;
  maillage.receiveShadow = true;
  return maillage;
}

// Bouton en forme de gélule (ajout : absent du fichier d'origine) : une boîte dont le rayon vaut la moitié de la hauteur.
function createPillButton(largeur, hauteur, profondeur, materiau) {
  return createRoundedBoxMesh(largeur, hauteur, profondeur, hauteur / 2, Math.min(0.012, profondeur / 3), materiau);
}

// ============================================================================
// GÉNÉRATEURS DE TEXTURES PROCÉDURALES PBR (Normal, Roughness, Studio HDRI)
// ============================================================================

/**
 * Crée une texture procédurale de micro-grain (plastique ABS mat, caoutchouc EPDM)
 */
function createMicroGrainTextures(scale = 256, intensity = 18) {
  const heightCanvas = document.createElement('canvas');
  heightCanvas.width = scale;
  heightCanvas.height = scale;
  const hCtx = heightCanvas.getContext('2d');
  const imgData = hCtx.createImageData(scale, scale);

  for (let i = 0; i < imgData.data.length; i += 4) {
    const val = 128 + (Math.random() - 0.5) * intensity;
    imgData.data[i] = val;
    imgData.data[i + 1] = val;
    imgData.data[i + 2] = val;
    imgData.data[i + 3] = 255;
  }
  hCtx.putImageData(imgData, 0, 0);

  // Conversion en Normal Map tangente (Sobel simplifié)
  const normCanvas = document.createElement('canvas');
  normCanvas.width = scale;
  normCanvas.height = scale;
  const nCtx = normCanvas.getContext('2d');
  const nData = nCtx.createImageData(scale, scale);
  const src = imgData.data;

  for (let y = 0; y < scale; y++) {
    for (let x = 0; x < scale; x++) {
      const idx = (y * scale + x) * 4;
      const xL = (y * scale + ((x - 1 + scale) % scale)) * 4;
      const xR = (y * scale + ((x + 1) % scale)) * 4;
      const yU = (((y - 1 + scale) % scale) * scale + x) * 4;
      const yD = (((y + 1) % scale) * scale + x) * 4;

      const dX = (src[xL] - src[xR]) / 255.0;
      const dY = (src[yU] - src[yD]) / 255.0;

      nData.data[idx] = Math.min(255, Math.max(0, (dX * 0.5 + 0.5) * 255));
      nData.data[idx + 1] = Math.min(255, Math.max(0, (dY * 0.5 + 0.5) * 255));
      nData.data[idx + 2] = 255;
      nData.data[idx + 3] = 255;
    }
  }
  nCtx.putImageData(nData, 0, 0);

  const normalMap = new THREE.CanvasTexture(normCanvas);
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(8, 8);

  const roughnessMap = new THREE.CanvasTexture(heightCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(8, 8);

  return { normalMap, roughnessMap };
}

/**
 * Crée la texture striée et brossée de la charnière métallique noire anodisée
 */
function createHingeKnurlTextures() {
  const size = 256;
  const normCanvas = document.createElement('canvas');
  normCanvas.width = size;
  normCanvas.height = size;
  const ctx = normCanvas.getContext('2d');

  // Fond neutre normale (128, 128, 255)
  ctx.fillStyle = 'rgb(128, 128, 255)';
  ctx.fillRect(0, 0, size, size);

  // Stries verticales fines sur le barillet de charnière
  for (let x = 0; x < size; x += 2) {
    const wave = Math.sin((x / size) * Math.PI * 64);
    const r = Math.floor(128 + wave * 35);
    ctx.fillStyle = `rgb(${r}, 128, 255)`;
    ctx.fillRect(x, 0, 1, size);
  }

  // Micro-brossage horizontal
  for (let y = 0; y < size; y++) {
    const g = 128 + Math.floor((Math.random() - 0.5) * 16);
    ctx.fillStyle = `rgba(128, ${g}, 255, 0.35)`;
    ctx.fillRect(0, y, size, 1);
  }

  const normalMap = new THREE.CanvasTexture(normCanvas);
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;
  return normalMap;
}

/**
 * Crée une texture de contact au sol douce et réaliste (Soft Studio Contact Shadow)
 */
export function createContactShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createRadialGradient(256, 256, 20, 256, 256, 240);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.92)');
  grad.addColorStop(0.45, 'rgba(0, 0, 0, 0.58)');
  grad.addColorStop(0.75, 'rgba(0, 0, 0, 0.18)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

/**
 * Crée un environnement HDRI studio sur-mesure avec softboxes rectangulaires
 * pour générer des lignes spéculaires nettes sur le plastique rouge laqué
 */
export function createStudioEnvironment(pmremGenerator) {
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x050507);

  // Softbox principale verticale à droite (crée le grand reflet allongé sur le volet)
  const rightSoftbox = new THREE.Mesh(
    new THREE.PlaneGeometry(4.5, 16),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(4.2, 4.2, 4.4), side: THREE.DoubleSide })
  );
  rightSoftbox.position.set(8, 2.5, 7);
  rightSoftbox.lookAt(0, 0, 0);
  envScene.add(rightSoftbox);

  // Softbox supérieure gauche (éclairant la lentille et le haut du boîtier)
  const topLeftSoftbox = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 5.5),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 3.5, 3.8), side: THREE.DoubleSide })
  );
  topLeftSoftbox.position.set(-7, 8, 6);
  topLeftSoftbox.lookAt(0, 0, 0);
  envScene.add(topLeftSoftbox);

  // Bande lumineuse latérale gauche (Rim light pour détacher la tranche et la charnière)
  const rimStripLeft = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 14),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(2.8, 2.9, 3.1), side: THREE.DoubleSide })
  );
  rimStripLeft.position.set(-10, 1, -4);
  rimStripLeft.lookAt(0, 0, 0);
  envScene.add(rimStripLeft);

  // Bande lumineuse arrière-droite (Rim light de profil)
  const rimStripBack = new THREE.Mesh(
    new THREE.PlaneGeometry(3.0, 14),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.4, 2.6), side: THREE.DoubleSide })
  );
  rimStripBack.position.set(7, 2, -9);
  rimStripBack.lookAt(0, 0, 0);
  envScene.add(rimStripBack);

  // Plafond diffus subtil
  const overheadPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 14),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.95, 1.05), side: THREE.DoubleSide })
  );
  overheadPanel.position.set(0, 12, 0);
  overheadPanel.rotation.x = Math.PI / 2;
  envScene.add(overheadPanel);

  // Sol studio sombre absorbant
  const darkFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0.02, 0.02, 0.025), side: THREE.DoubleSide })
  );
  darkFloor.position.set(0, -8, 0);
  darkFloor.rotation.x = -Math.PI / 2;
  envScene.add(darkFloor);

  const renderTarget = pmremGenerator.fromScene(envScene, 0.025);
  return renderTarget.texture;
}

// ============================================================================
// UTILITAIRES DE GÉOMÉTRIE 3D (Formes extrudées, biseaux, détails moulés)
// ============================================================================

/**
 * Crée une vis Allen / Torx noire encastrée avec puits chanfreiné et rondelle fine
 */
function createScrewMesh(radius, material, washerMat) {
  const group = new THREE.Group();

  // Puits / rondelle métallique périphérique
  const washer = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.85, radius * 1.18, 24),
    washerMat || material
  );
  washer.position.z = 0.002;
  group.add(washer);

  // Tête fraisée bombée
  const headGeo = new THREE.CylinderGeometry(radius * 0.92, radius * 0.85, 0.022, 24);
  headGeo.rotateX(Math.PI / 2);
  const head = new THREE.Mesh(headGeo, material);
  head.position.z = 0.004;
  group.add(head);

  // Empreinte hexagonale creuse (Allen) au centre
  const hexSocketGeo = new THREE.CylinderGeometry(radius * 0.46, radius * 0.42, 0.026, 6);
  hexSocketGeo.rotateX(Math.PI / 2);
  const hexSocketMat = new THREE.MeshStandardMaterial({ color: 0x030304, roughness: 0.9 });
  const hexSocket = new THREE.Mesh(hexSocketGeo, hexSocketMat);
  hexSocket.position.z = 0.005;
  group.add(hexSocket);

  return group;
}

/**
 * Génère une texture dynamique haute définition pour l'écran LCD
 * (éteint avec reflet diagonal de softbox + matrice de sous-pixels, ou allumé)
 */
export function createScreenCanvasTexture(isPoweredOn) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 630;
  const ctx = canvas.getContext('2d');

  if (!isPoweredOn) {
    // Écran OLED/LCD noir profond avec reflet diagonal net de studio
    const baseGrad = ctx.createLinearGradient(0, 0, 768, 630);
    baseGrad.addColorStop(0, '#040507');
    baseGrad.addColorStop(0.54, '#07090d');
    baseGrad.addColorStop(0.555, '#19202b');
    baseGrad.addColorStop(0.75, '#0d1118');
    baseGrad.addColorStop(1, '#050608');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, 768, 630);

    // Micro-grille de pixels LCD subtile visible en gros plan
    ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
    for (let x = 0; x < 768; x += 3) {
      ctx.fillRect(x, 0, 1, 630);
    }
    for (let y = 0; y < 630; y += 3) {
      ctx.fillRect(0, y, 768, 1);
    }
  } else {
    // Écran allumé avec interface radar / télémétrie Pokédex haute netteté
    const bgGrad = ctx.createRadialGradient(384, 315, 30, 384, 315, 480);
    bgGrad.addColorStop(0, '#0d3342');
    bgGrad.addColorStop(0.7, '#061924');
    bgGrad.addColorStop(1, '#020b10');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 768, 630);

    // Grille télémétrique
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
    ctx.lineWidth = 1.5;
    for (let x = 0; x <= 768; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 630);
      ctx.stroke();
    }
    for (let y = 0; y <= 630; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(768, y);
      ctx.stroke();
    }

    // Cercles concentriques de visée
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
    ctx.lineWidth = 2.5;
    [80, 160, 235].forEach((r) => {
      ctx.beginPath();
      ctx.arc(384, 305, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Réticule central lumineux
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(384, 40);
    ctx.lineTo(384, 570);
    ctx.moveTo(114, 305);
    ctx.lineTo(654, 305);
    ctx.stroke();

    // Forme d'onde sinusoïdale analytique en bas
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let x = 60; x < 708; x += 4) {
      const y = 530 + Math.sin(x * 0.045) * 22 * Math.sin(x * 0.01);
      if (x === 60) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Indicateurs de statut HUD en haut
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(42, 36, 130, 14);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.fillRect(186, 36, 75, 14);
    ctx.fillStyle = '#34d399';
    ctx.fillRect(615, 36, 110, 14);

    // Cadre intérieur lumineux
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.65)';
    ctx.lineWidth = 5;
    ctx.strokeRect(18, 18, 732, 594);

    // Sous-pixels RGB très fins
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    for (let y = 0; y < 630; y += 3) {
      ctx.fillRect(0, y, 768, 1);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Construit le groupe 3D complet du boîtier rouge articulé avec détails PBR réalistes
 */
export function buildPokedexAssembly() {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'Pokedex_Root';

  // Dimensions principales de référence
  const W = 3.2;
  const H = 4.55;
  const bodyDepth = 0.36;
  const lidDepth = 0.24;
  const cornerRadius = 0.22;

  // Textures procédurales PBR
  const absGrain = createMicroGrainTextures(256, 14);
  const rubberGrain = createMicroGrainTextures(256, 34);
  const hingeKnurlNormal = createHingeKnurlTextures();

  // --- MATÉRIAUX PHÉNOMÉNOLOGIQUES HAUTE PRÉCISION ---
  // Plastique rouge laqué miroir (Clearcoat 1.0, IOR 1.52, micro-ondulation subtile)
  const redGlossMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xd40f0f,
    roughness: 0.13,
    metalness: 0.03,
    ior: 1.52,
    reflectivity: 0.92,
    clearcoat: 1.0,
    clearcoatRoughness: 0.045,
    normalMap: absGrain.normalMap,
    normalScale: new THREE.Vector2(0.035, 0.035),
  });

  // Plastique rouge ABS moulé satiné pour l'intérieur du volet
  const redInnerMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xc20d0d,
    roughness: 0.26,
    metalness: 0.04,
    ior: 1.5,
    clearcoat: 0.65,
    clearcoatRoughness: 0.18,
    normalMap: absGrain.normalMap,
    normalScale: new THREE.Vector2(0.09, 0.09),
  });

  // Métal noir anodisé strié pour la charnière
  const hingeMetalMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1c20,
    roughness: 0.28,
    metalness: 0.88,
    normalMap: hingeKnurlNormal,
    normalScale: new THREE.Vector2(0.35, 0.25),
  });

  // Métal sombre brossé pour les vis Allen
  const screwMetalMaterial = new THREE.MeshStandardMaterial({
    color: 0x202328,
    roughness: 0.25,
    metalness: 0.92,
  });

  // Plastique noir mat grainé (D-pad, boutons)
  const matteBlackMaterial = new THREE.MeshStandardMaterial({
    color: 0x141518,
    roughness: 0.62,
    metalness: 0.08,
    normalMap: absGrain.normalMap,
    normalScale: new THREE.Vector2(0.18, 0.18),
  });

  // Caoutchouc EPDM noir mat texturé pour le joint d'étanchéité intérieur
  const epdmRubberMaterial = new THREE.MeshStandardMaterial({
    color: 0x111214,
    roughness: 0.84,
    metalness: 0.02,
    normalMap: rubberGrain.normalMap,
    normalScale: new THREE.Vector2(0.32, 0.32),
  });

  // Cadre écran gris clair satiné micro-texturé
  const lightGreyBezelMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xcbd0d8,
    roughness: 0.32,
    metalness: 0.1,
    clearcoat: 0.3,
    clearcoatRoughness: 0.25,
    normalMap: absGrain.normalMap,
    normalScale: new THREE.Vector2(0.06, 0.06),
  });

  // Bouton jaune vif laqué
  const yellowButtonMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xfacc15,
    roughness: 0.2,
    metalness: 0.04,
    clearcoat: 0.75,
    clearcoatRoughness: 0.1,
  });

  // Chrome poli pour la bague d'objectif
  const chromeMaterial = new THREE.MeshStandardMaterial({
    color: 0xe8edf5,
    roughness: 0.09,
    metalness: 0.98,
  });

  // ==========================================================================
  // 1. CORPS PRINCIPAL (Main Body)
  // ==========================================================================
  const mainBodyGroup = new THREE.Group();
  mainBodyGroup.name = 'MainBody';
  rootGroup.add(mainBodyGroup);

  // Coque arrière / base du corps
  const bodyBase = createRoundedBoxMesh(W, H, bodyDepth, cornerRadius, 0.045, redGlossMaterial);
  bodyBase.position.z = -bodyDepth / 2;
  mainBodyGroup.add(bodyBase);

  // Décrochement supérieur moulé caractéristique (la marche en S sur la face avant du corps)
  const stepShape = new THREE.Shape();
  const hw = W / 2 - 0.03;
  const hh = H / 2 - 0.03;
  stepShape.moveTo(-hw, hh - 0.16);
  stepShape.quadraticCurveTo(-hw, hh, -hw + 0.16, hh);
  stepShape.lineTo(hw - 0.16, hh);
  stepShape.quadraticCurveTo(hw, hh, hw, hh - 0.16);
  stepShape.lineTo(hw, hh - 0.62);
  stepShape.lineTo(0.45, hh - 0.62);
  stepShape.quadraticCurveTo(0.25, hh - 0.62, 0.08, hh - 0.82);
  stepShape.lineTo(-0.15, hh - 1.02);
  stepShape.quadraticCurveTo(-0.32, hh - 1.15, -0.55, hh - 1.15);
  stepShape.lineTo(-hw, hh - 1.15);
  stepShape.closePath();

  const stepGeo = new THREE.ExtrudeGeometry(stepShape, {
    steps: 1,
    depth: 0.045,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 4,
    curveSegments: 16,
  });
  const stepMesh = new THREE.Mesh(stepGeo, redGlossMaterial);
  stepMesh.position.z = -0.015;
  stepMesh.castShadow = true;
  stepMesh.receiveShadow = true;
  mainBodyGroup.add(stepMesh);

  // --- GRANDE LENTILLE OPTIQUE MULTICOUCHE (Haut gauche) ---
  const lensGroup = new THREE.Group();
  lensGroup.name = 'CameraLens';
  lensGroup.position.set(-0.92, 1.56, 0.03);
  mainBodyGroup.add(lensGroup);

  // Fût extérieur en métal noir anodisé avec filetages concentriques
  const barrelOuter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.39, 0.39, 0.06, 48, 1, true),
    hingeMetalMaterial
  );
  barrelOuter.rotation.x = Math.PI / 2;
  barrelOuter.position.z = 0.01;
  lensGroup.add(barrelOuter);

  const outerRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.368, 0.032, 24, 56),
    matteBlackMaterial
  );
  outerRing.position.z = 0.025;
  lensGroup.add(outerRing);

  // Anneau chromé chanfreiné intermédiaire
  const chromeRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.326, 0.022, 24, 56),
    chromeMaterial
  );
  chromeRing.position.z = 0.032;
  lensGroup.add(chromeRing);

  // Anneaux de filetage internes sombres anti-reflets (baffles optiques)
  [0.295, 0.265].forEach((r, idx) => {
    const baffle = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.01, 16, 48),
      matteBlackMaterial
    );
    baffle.position.z = 0.024 - idx * 0.008;
    lensGroup.add(baffle);
  });

  // Fond sombre interne de l'objectif
  const lensBack = new THREE.Mesh(
    new THREE.CircleGeometry(0.30, 48),
    new THREE.MeshStandardMaterial({ color: 0x030712, roughness: 0.15, metalness: 0.85 })
  );
  lensBack.position.z = 0.005;
  lensGroup.add(lensBack);

  // Diaphragme bleuté/violet multicouche interne
  const irisRing = new THREE.Mesh(
    new THREE.RingGeometry(0.095, 0.23, 48),
    new THREE.MeshPhysicalMaterial({
      color: 0x1e40af,
      emissive: 0x0a1f4d,
      roughness: 0.12,
      metalness: 0.6,
      iridescence: 0.9,
      iridescenceIOR: 1.45,
      clearcoat: 1.0,
    })
  );
  irisRing.position.z = 0.016;
  lensGroup.add(irisRing);

  // Pupille centrale profonde
  const pupilDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.095, 36),
    new THREE.MeshPhysicalMaterial({
      color: 0x020617,
      roughness: 0.05,
      metalness: 0.9,
      clearcoat: 1.0,
    })
  );
  pupilDisc.position.z = 0.018;
  lensGroup.add(pupilDisc);

  // Dôme en verre saphir convexe avec traitement antireflet irisé bleu/violet
  const glassDomeGeo = new THREE.SphereGeometry(0.32, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.3);
  glassDomeGeo.rotateX(Math.PI / 2);
  const glassDomeMat = new THREE.MeshPhysicalMaterial({
    color: 0x3b82f6,
    transmission: 0.86,
    opacity: 1,
    transparent: true,
    roughness: 0.02,
    ior: 1.72,
    thickness: 0.22,
    iridescence: 1.0,
    iridescenceIOR: 1.38,
    iridescenceThicknessRange: [180, 420],
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
  });
  const glassDome = new THREE.Mesh(glassDomeGeo, glassDomeMat);
  glassDome.position.z = -0.175;
  lensGroup.add(glassDome);

  // --- TROIS PETITES LEDS (Rouge, Jaune, Verte) sous la lentille ---
  const ledSpecs = [
    { name: 'LED_Red', color: 0xef4444, emissive: 0xdc2626, x: -1.16 },
    { name: 'LED_Yellow', color: 0xfacc15, emissive: 0xeab308, x: -0.92 },
    { name: 'LED_Green', color: 0x22c55e, emissive: 0x16a34a, x: -0.68 },
  ];
  const ledMeshes = [];

  ledSpecs.forEach((spec) => {
    const ledHolder = new THREE.Group();
    ledHolder.position.set(spec.x, 1.05, 0.035);

    const bezel = new THREE.Mesh(
      new THREE.TorusGeometry(0.058, 0.013, 16, 28),
      screwMetalMaterial
    );
    ledHolder.add(bezel);

    const bulbMat = new THREE.MeshPhysicalMaterial({
      color: spec.color,
      emissive: spec.emissive,
      emissiveIntensity: 0.35,
      roughness: 0.06,
      ior: 1.55,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
    });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.052, 24, 18), bulbMat);
    bulb.scale.z = 0.58;
    ledHolder.add(bulb);
    ledMeshes.push(bulb);
    mainBodyGroup.add(ledHolder);
  });

  // --- ÉCRAN PRINCIPAL ET CADRE GRIS CLAIR ---
  const screenGroup = new THREE.Group();
  screenGroup.name = 'MainScreen';
  screenGroup.position.set(0.06, -0.08, 0.015);
  mainBodyGroup.add(screenGroup);

  const screenBezelW = 2.48;
  const screenBezelH = 1.98;
  const bezelOuterShape = createRoundedRectShape(screenBezelW, screenBezelH, 0.12);
  const bezelHolePath = createRoundedRectShape(screenBezelW - 0.34, screenBezelH - 0.34, 0.05);
  bezelOuterShape.holes.push(bezelHolePath);

  const bezelGeo = new THREE.ExtrudeGeometry(bezelOuterShape, {
    steps: 1,
    depth: 0.045,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 4,
    curveSegments: 16,
  });
  const bezelMesh = new THREE.Mesh(bezelGeo, lightGreyBezelMaterial);
  bezelMesh.castShadow = true;
  bezelMesh.receiveShadow = true;
  screenGroup.add(bezelMesh);

  // Surface vitrée de l'écran LCD
  const initialScreenTex = createScreenCanvasTexture(false);
  const screenDisplayMat = new THREE.MeshPhysicalMaterial({
    map: initialScreenTex,
    emissiveMap: initialScreenTex,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.0,
    roughness: 0.08,
    metalness: 0.05,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
  });
  const screenPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(screenBezelW - 0.32, screenBezelH - 0.32),
    screenDisplayMat
  );
  screenPlane.position.z = 0.025;
  screenGroup.add(screenPlane);

  // --- CROIX DIRECTIONNELLE (D-PAD) EN BAS À GAUCHE AVEC FLÈCHES GRAVÉES ---
  const dpadGroup = new THREE.Group();
  dpadGroup.name = 'DPad';
  dpadGroup.position.set(-0.78, -1.58, 0.025);
  mainBodyGroup.add(dpadGroup);

  const armLen = 0.68;
  const armThick = 0.22;
  const dpadHoriz = createRoundedBoxMesh(armLen, armThick, 0.08, 0.03, 0.018, matteBlackMaterial);
  const dpadVert = createRoundedBoxMesh(armThick, armLen, 0.08, 0.03, 0.018, matteBlackMaterial);
  const dpadCenterDish = new THREE.Mesh(
    new THREE.CylinderGeometry(0.068, 0.055, 0.082, 28),
    matteBlackMaterial
  );
  dpadCenterDish.rotation.x = Math.PI / 2;
  dpadGroup.add(dpadHoriz, dpadVert, dpadCenterDish);

  // Petits triangles directionnels gravés sur les 4 branches du D-Pad
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(0, 0.035);
  arrowShape.lineTo(-0.032, -0.025);
  arrowShape.lineTo(0.032, -0.025);
  arrowShape.closePath();
  const arrowGeo = new THREE.ShapeGeometry(arrowShape);
  const arrowMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.9 });

  [
    { x: 0, y: 0.23, rot: 0 },
    { x: 0, y: -0.23, rot: Math.PI },
    { x: -0.23, y: 0, rot: Math.PI / 2 },
    { x: 0.23, y: 0, rot: -Math.PI / 2 },
  ].forEach((a) => {
    const arrow = new THREE.Mesh(arrowGeo, arrowMat);
    arrow.position.set(a.x, a.y, 0.042);
    arrow.rotation.z = a.rot;
    dpadGroup.add(arrow);
  });

  // --- BOUTONS PILULES SOUS L'ÉCRAN (Noir à gauche, Jaune à droite) ---
  const midBlackBtn = createPillButton(0.32, 0.11, 0.045, matteBlackMaterial);
  midBlackBtn.position.set(0.36, -1.24, 0.025);
  mainBodyGroup.add(midBlackBtn);

  const midYellowBtn = createPillButton(0.32, 0.11, 0.045, yellowButtonMaterial);
  midYellowBtn.position.set(0.92, -1.24, 0.025);
  mainBodyGroup.add(midYellowBtn);

  // --- DEUX PETITS BOUTONS EN BAS (Jaune à gauche, Noir à droite) ---
  // --- GRILLE DE HAUT-PARLEUR CIRCULAIRE PERFORÉE EN PROFONDEUR (Bas à droite) ---
  const speakerGroup = new THREE.Group();
  speakerGroup.name = 'SpeakerGrille';
  speakerGroup.position.set(0.76, -1.66, 0.002);
  mainBodyGroup.add(speakerGroup);

  const holeRadius = 0.021;
  const spacing = 0.078;
  const holeRimMat = new THREE.MeshStandardMaterial({ color: 0x5c0606, roughness: 0.5 });
  const holeCavityMat = new THREE.MeshBasicMaterial({ color: 0x040405 });

  for (let row = -4; row <= 4; row++) {
    for (let col = -4; col <= 4; col++) {
      const hx = col * spacing + (row % 2 !== 0 ? spacing * 0.25 : 0);
      const hy = row * spacing;
      if (Math.hypot(hx, hy) <= 0.34) {
        // Chanfrein sombre du trou percé dans la coque rouge
        const rim = new THREE.Mesh(
          new THREE.RingGeometry(holeRadius * 0.92, holeRadius * 1.18, 16),
          holeRimMat
        );
        rim.position.set(hx, hy, 0.0005);

        // Cavité acoustique profonde
        const hole = new THREE.Mesh(new THREE.CircleGeometry(holeRadius * 0.95, 16), holeCavityMat);
        hole.position.set(hx, hy, 0.001);
        speakerGroup.add(rim, hole);
      }
    }
  }

  // --- ENCOCHE DE VERROUILLAGE SUR LA TRANCHE DROITE DU CORPS ---
  const latchRecess = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.24, 0.14),
    matteBlackMaterial
  );
  latchRecess.position.set(W / 2 - 0.04, -0.25, -0.05);
  mainBodyGroup.add(latchRecess);

  // Vis de fixation aux coins du corps principal
  const bodyScrewPositions = [
    [-W / 2 + 0.18, H / 2 - 0.18, 0.032],
    [W / 2 - 0.18, H / 2 - 0.18, 0.032],
    [-W / 2 + 0.18, -H / 2 + 0.18, 0.002],
    [W / 2 - 0.18, -H / 2 + 0.18, 0.002],
    [-W / 2 + 0.18, 1.05, 0.032],
    [W / 2 - 0.22, 1.48, 0.002],
  ];
  bodyScrewPositions.forEach(([sx, sy, sz]) => {
    const screw = createScrewMesh(0.046, screwMetalMaterial, chromeMaterial);
    screw.position.set(sx, sy, sz);
    mainBodyGroup.add(screw);
  });

  // ==========================================================================
  // 2. CHARNIÈRE MÉTALLIQUE SEGMENTÉE STRIÉE (Côté gauche)
  // ==========================================================================
  const hingeX = -W / 2 - 0.055;
  const hingeZ = 0.035;
  const hingeGroup = new THREE.Group();
  hingeGroup.name = 'HingeAssembly';
  hingeGroup.position.set(hingeX, -0.1, hingeZ);
  rootGroup.add(hingeGroup);

  const numSegments = 7;
  const segHeight = 0.24;
  const segGap = 0.018;
  for (let i = 0; i < numSegments; i++) {
    const yOffset = (i - (numSegments - 1) / 2) * (segHeight + segGap);
    const segGeo = new THREE.CylinderGeometry(0.078, 0.078, segHeight, 32);
    const segMesh = new THREE.Mesh(segGeo, hingeMetalMaterial);
    segMesh.position.y = yOffset;
    segMesh.castShadow = true;
    segMesh.receiveShadow = true;
    hingeGroup.add(segMesh);

    // Chanfreins métalliques aux extrémités de chaque maillon de charnière
    const topCap = new THREE.Mesh(
      new THREE.TorusGeometry(0.074, 0.005, 10, 28),
      screwMetalMaterial
    );
    topCap.rotation.x = Math.PI / 2;
    topCap.position.y = yOffset + segHeight / 2;

    const botCap = topCap.clone();
    botCap.position.y = yOffset - segHeight / 2;
    hingeGroup.add(topCap, botCap);

    // Axe interne entre les maillons
    if (i < numSegments - 1) {
      const pin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.058, 0.058, segGap * 1.5, 24),
        matteBlackMaterial
      );
      pin.position.y = yOffset + (segHeight + segGap) / 2;
      hingeGroup.add(pin);
    }
  }

  // ==========================================================================
  // 3. VOLET AVANT ARTICULÉ (Pivotant autour de l'axe de la charnière gauche)
  // ==========================================================================
  const lidPivotGroup = new THREE.Group();
  lidPivotGroup.name = 'FrontLid_Pivot';
  // Le pivot est situé exactement au centre de l'axe de la charnière gauche
  lidPivotGroup.position.set(hingeX, 0, hingeZ);
  rootGroup.add(lidPivotGroup);

  const lidContainer = new THREE.Group();
  lidContainer.name = 'FrontLid_MeshGroup';
  // Décalage pour que le volet fermé recouvre parfaitement le corps principal (centre en X=0, Z > 0)
  lidContainer.position.set(-hingeX, 0, lidDepth / 2 - 0.02);
  lidPivotGroup.add(lidContainer);

  // Coque principale creuse du volet (rebord périphérique + fond)
  // On construit le volet avec une face extérieure lisse/biseautée et un intérieur en creux
  const lidOuterShell = createRoundedBoxMesh(
    W,
    H,
    lidDepth * 0.65,
    cornerRadius,
    0.04,
    redGlossMaterial
  );
  lidOuterShell.position.z = lidDepth * 0.18;
  lidContainer.add(lidOuterShell);

  // Rebord périphérique côté intérieur (créant la cavité creuse du volet)
  const rimOuter = createRoundedRectShape(W, H, cornerRadius);
  const rimInner = createRoundedRectShape(W - 0.22, H - 0.22, cornerRadius * 0.65);
  rimOuter.holes.push(rimInner);

  const rimGeo = new THREE.ExtrudeGeometry(rimOuter, {
    steps: 1,
    depth: lidDepth * 0.55,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 3,
    curveSegments: 16,
  });
  const rimMesh = new THREE.Mesh(rimGeo, redGlossMaterial);
  rimMesh.position.z = -lidDepth / 2;
  rimMesh.castShadow = true;
  rimMesh.receiveShadow = true;
  lidContainer.add(rimMesh);

  // Joint sombre d'étanchéité en caoutchouc EPDM texturé le long du rebord intérieur
  const gasketOuter = createRoundedRectShape(W - 0.14, H - 0.14, cornerRadius * 0.8);
  const gasketInner = createRoundedRectShape(W - 0.21, H - 0.21, cornerRadius * 0.68);
  gasketOuter.holes.push(gasketInner);
  const gasketGeo = new THREE.ExtrudeGeometry(gasketOuter, {
    steps: 1,
    depth: 0.022,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2,
    curveSegments: 16,
  });
  const gasketMesh = new THREE.Mesh(gasketGeo, epdmRubberMaterial);
  gasketMesh.position.z = -lidDepth / 2 - 0.006;
  lidContainer.add(gasketMesh);

  // --- FACE EXTÉRIEURE DU VOLET : RELIEFS GÉOMÉTRIQUES MOULÉS (visibles sur image2.jpg) ---
  // 1. Panneau supérieur moulé
  const topReliefShape = new THREE.Shape();
  const lw = W / 2 - 0.05;
  const lh = H / 2 - 0.05;
  topReliefShape.moveTo(-lw, lh - 0.14);
  topReliefShape.quadraticCurveTo(-lw, lh, -lw + 0.14, lh);
  topReliefShape.lineTo(lw - 0.14, lh);
  topReliefShape.quadraticCurveTo(lw, lh, lw, lh - 0.14);
  topReliefShape.lineTo(lw, lh - 0.58);
  topReliefShape.lineTo(0.45, lh - 0.58);
  topReliefShape.quadraticCurveTo(0.25, lh - 0.58, 0.05, lh - 0.78);
  topReliefShape.lineTo(-0.2, lh - 0.98);
  topReliefShape.quadraticCurveTo(-0.38, lh - 1.12, -0.6, lh - 1.12);
  topReliefShape.lineTo(-lw, lh - 1.12);
  topReliefShape.closePath();

  const reliefExtrudeOpts = {
    steps: 1,
    depth: 0.032,
    bevelEnabled: true,
    bevelThickness: 0.014,
    bevelSize: 0.014,
    bevelSegments: 4,
    curveSegments: 16,
  };

  const topReliefMesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(topReliefShape, reliefExtrudeOpts),
    redGlossMaterial
  );
  topReliefMesh.position.z = lidDepth * 0.48;
  lidContainer.add(topReliefMesh);

  // 2. Panneau inférieur moulé symétrique
  const botReliefShape = new THREE.Shape();
  botReliefShape.moveTo(-lw, -lh + 0.14);
  botReliefShape.quadraticCurveTo(-lw, -lh, -lw + 0.14, -lh);
  botReliefShape.lineTo(lw - 0.14, -lh);
  botReliefShape.quadraticCurveTo(lw, -lh, lw, -lh + 0.14);
  botReliefShape.lineTo(lw, -lh + 0.58);
  botReliefShape.lineTo(0.45, -lh + 0.58);
  botReliefShape.quadraticCurveTo(0.25, -lh + 0.58, 0.05, -lh + 0.78);
  botReliefShape.lineTo(-0.2, -lh + 0.98);
  botReliefShape.quadraticCurveTo(-0.38, -lh + 1.12, -0.6, -lh + 1.12);
  botReliefShape.lineTo(-lw, -lh + 1.12);
  botReliefShape.closePath();

  const botReliefMesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(botReliefShape, reliefExtrudeOpts),
    redGlossMaterial
  );
  botReliefMesh.position.z = lidDepth * 0.48;
  lidContainer.add(botReliefMesh);

  // 3. Plaque centrale trapézoïdale surélevée sur le devant du volet
  const centerPlateShape = new THREE.Shape();
  centerPlateShape.moveTo(-lw + 0.18, 0.96);
  centerPlateShape.lineTo(-0.55, 0.96);
  centerPlateShape.lineTo(0.28, 1.54);
  centerPlateShape.lineTo(lw - 0.24, 1.54);
  centerPlateShape.lineTo(lw - 0.24, -1.54);
  centerPlateShape.lineTo(0.28, -1.54);
  centerPlateShape.lineTo(-0.55, -0.96);
  centerPlateShape.lineTo(-lw + 0.18, -0.96);
  centerPlateShape.closePath();

  const centerPlateMesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(centerPlateShape, {
      steps: 1,
      depth: 0.025,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.012,
      bevelSegments: 3,
    }),
    redGlossMaterial
  );
  centerPlateMesh.position.z = lidDepth * 0.48;
  lidContainer.add(centerPlateMesh);

  // 4 vis noires Allen encastrées sur la face extérieure du volet
  const lidOuterScrews = [
    [-lw + 0.14, lh - 0.94, lidDepth * 0.515],
    [lw - 0.34, lh - 0.86, lidDepth * 0.508],
    [-lw + 0.14, -lh + 0.94, lidDepth * 0.515],
    [lw - 0.34, -lh + 0.86, lidDepth * 0.508],
  ];
  lidOuterScrews.forEach(([sx, sy, sz]) => {
    const screw = createScrewMesh(0.046, screwMetalMaterial, chromeMaterial);
    screw.position.set(sx, sy, sz);
    lidContainer.add(screw);
  });

  // Loquet métallique/noir mécanique sur le bord droit du volet
  const lidLatch = new THREE.Mesh(
    new THREE.BoxGeometry(0.11, 0.22, 0.12),
    hingeMetalMaterial
  );
  lidLatch.position.set(W / 2 - 0.06, -0.25, 0.04);
  lidContainer.add(lidLatch);

  // --- FACE INTÉRIEURE DU VOLET : NERVURES DE RENFORT ET PLOTS DE VIS ---
  const innerZ = -lidDepth * 0.16;

  // Nervures de renfort structurelles moulées en relief à l'intérieur du volet
  const ribPositions = [
    // Nervures horizontales
    { w: W - 0.3, h: 0.045, x: 0, y: 1.35 },
    { w: W - 0.3, h: 0.045, x: 0, y: 0.45 },
    { w: W - 0.3, h: 0.045, x: 0, y: -0.45 },
    { w: W - 0.3, h: 0.045, x: 0, y: -1.35 },
    // Nervures verticales
    { w: 0.045, h: H - 0.3, x: -0.75, y: 0 },
    { w: 0.045, h: H - 0.3, x: 0.75, y: 0 },
  ];

  ribPositions.forEach((rib) => {
    const ribMesh = new THREE.Mesh(
      new THREE.BoxGeometry(rib.w, rib.h, 0.045),
      redInnerMaterial
    );
    ribMesh.position.set(rib.x, rib.y, innerZ);
    ribMesh.castShadow = true;
    ribMesh.receiveShadow = true;
    lidContainer.add(ribMesh);
  });

  // Nervure diagonale caractéristique reproduisant le décrochement à l'intérieur du volet
  const diagRibGroup = new THREE.Group();
  const diagBar1 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.05, 0.05), redInnerMaterial);
  diagBar1.rotation.z = 0.55;
  diagBar1.position.set(0.1, 1.15, innerZ);
  const diagBar2 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.05, 0.05), redInnerMaterial);
  diagBar2.rotation.z = -0.55;
  diagBar2.position.set(0.1, -1.15, innerZ);
  diagRibGroup.add(diagBar1, diagBar2);
  lidContainer.add(diagRibGroup);

  // 4 Plots de vis cylindriques creux aux coins intérieurs du volet
  const bossCoords = [
    [-W / 2 + 0.26, H / 2 - 0.26],
    [W / 2 - 0.26, H / 2 - 0.26],
    [-W / 2 + 0.26, -H / 2 + 0.26],
    [W / 2 - 0.26, -H / 2 + 0.26],
  ];
  bossCoords.forEach(([bx, by]) => {
    const bossOuter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.095, 0.075, 20),
      redInnerMaterial
    );
    bossOuter.rotation.x = Math.PI / 2;
    bossOuter.position.set(bx, by, innerZ - 0.01);

    const bossHole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.038, 0.08, 16),
      matteBlackMaterial
    );
    bossHole.rotation.x = Math.PI / 2;
    bossHole.position.set(bx, by, innerZ - 0.012);

    // Vis métallique insérée au fond du plot intérieur
    const innerScrew = createScrewMesh(0.034, screwMetalMaterial);
    innerScrew.rotation.y = Math.PI;
    innerScrew.position.set(bx, by, innerZ - 0.048);

    lidContainer.add(bossOuter, bossHole, innerScrew);
  });

  // Ergot intérieur de verrouillage sur le bord droit du volet
  const innerCatch = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.26, 0.07),
    redInnerMaterial
  );
  innerCatch.position.set(W / 2 - 0.16, -0.25, innerZ - 0.015);
  lidContainer.add(innerCatch);

  return {
    rootGroup,
    lidPivotGroup,
    screenDisplayMat,
    ledMeshes,
  };
}

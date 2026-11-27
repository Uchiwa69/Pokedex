@AGENTS.md

# Pokédex — projet de fin de cours (Next.js)

Projet noté sur 20, suivi d'une évaluation sans le cours : l'étudiant doit comprendre tout le code.
Code simple, lisible, commenté en français quand une notion du cours est appliquée.

## Façon de travailler
- Travail phase par phase (0 à 11). À la fin de chaque phase : `npm run lint` et `npm run build` sans erreur,
  explication en 5 à 8 lignes en français (ce qui a été fait + QUELLE NOTION du cours), liste de ce qu'il faut
  tester dans le navigateur, commit Git clair, puis ARRÊT jusqu'à « Phase suivante ».
- Git : `main` est protégée. Tout développement se fait sur une branche dédiée ; aucun commit, push ni merge
  sur `main` sans accord explicite de l'utilisateur (un push sur `main` redéploie le site Vercel).
- Décision de design ouverte : proposer 2 options courtes et attendre le choix.
- Code et noms en français, comme dans le cours (CartePokemon, recupererPokemon, useSacoche…).
- Le dossier s'appelle « Pokédex » (accent + majuscule) : le nom npm du paquet est `pokedex`.

## Stack (imposée par le cours, ne pas changer)
- Next.js 16, App Router, TypeScript, sans dossier src/, alias @/*.
- next.config.ts : `cacheComponents: true` et `partialPrefetching: true` (ne JAMAIS les retirer),
  `raw.githubusercontent.com` autorisé dans images.remotePatterns.
- Tailwind CSS 4 : configuration dans app/globals.css avec @theme (pas de tailwind.config.js).
- Zustand pour les favoris et la sacoche : persist + skipHydration: true, réhydratés dans un composant client
  HydratationStores (useEffect → useFavoris.persist.rehydrate() et useSacoche.persist.rehydrate()), monté dans le layout.
- Données : PokéAPI https://pokeapi.co/api/v2 (lecture seule, sans clé).
- Ajout autorisé pour l'UX : la bibliothèque motion (import depuis "motion/react"), seulement dans des composants client.
- Tests : vitest, uniquement pour les fonctions pures de lib/combat.ts.
- Thème : UN SEUL THÈME, LE SOMBRE (décision de l'utilisateur du 25 novembre 2026, soir : le thème clair est retiré, `BoutonTheme`
  supprimé, `forcedTheme="dark"` dans `Fournisseurs`). Les jetons clairs restent dans `@theme static` mais ne s'affichent plus :
  ne plus vérifier le thème clair. Ce qui suit décrit l'ancien réglage à deux thèmes.
- Thème : DEUX THÈMES, sombre par défaut et clair (refonte demandée par l'utilisateur le 25 novembre 2026, qui
  remplace l'ancien « sombre uniquement » bleu nuit + accent lavande). next-themes : `defaultTheme="dark"`,
  `enableSystem={false}`, bascule par `BoutonTheme` (client) dans l'en-tête : les deux icônes sont dans la page et
  c'est `dark:` qui choisit (aucun état, donc aucune erreur d'hydratation). ThemeProvider dans un
  petit composant client Fournisseurs monté dans le layout, avec suppressHydrationWarning sur <html>. Tailwind 4 :
  `@custom-variant dark (&:where(.dark, .dark *));` dans globals.css. Toute retouche se vérifie DANS LES DEUX THÈMES.

## Conventions
```
app/
  layout.tsx (lang="fr", next/font, EnTete, PiedDePage, HydratationStores, contenu dans mx-auto max-w-7xl px-4 py-6 : 1280 px au plus, élargi
  depuis max-w-6xl à la demande de l'utilisateur ; grille en 2 / md:4 / xl:5 colonnes, 20 Pokémon par page pour que la
  dernière rangée soit toujours complète ; ne pas utiliser de seuil en pixels du type min-[1480px]: avec sm/md/lg,
  Tailwind le range avant eux et il est écrasé)
  page.tsx (liste) · loading.tsx · error.tsx (client, bouton Réessayer) · not-found.tsx
  pokemon/[nom]/page.tsx (fiche) · favoris/ · sacoche/ · combat/ · a-propos/
  api/aleatoire/route.ts (await connection(), Pokémon au hasard)
components/ CartePokemon, BadgeType, BarreRecherche, FiltreTypes, Pagination, SqueletteGrille, BarreStat,
            ChaineEvolution, BoutonFavori, BoutonSacoche, IndicateurSacoche, SpriteAnime, ListeAttaques,
            SocleEquipe, ArenaCombat, EffetAttaque…
lib/  types.ts (table TYPES : 18 types, clé anglaise, libellé FR, classes Tailwind complètes)
      conversion.ts (réponse brute → nos types, unités : taille en m, poids en kg)
      pokeapi.ts (fonctions serveur avec "use cache" + cacheLife("days") : recupererPokemon(nom) → Pokemon | null,
                  recupererListe, recupererTousLesNoms, recupererEspece, recupererEvolutions, recupererAttaque, recupererTypes)
      pokeapi-client.ts (version navigateur pour la page Favoris)
      combat.ts (fonctions pures : efficacité, dégâts, ordre des tours)
stores/ favoris.ts · sacoche.ts
hooks/  usePokemons · useRappelTemporise · useRaccourci · useTypesCouverts · useCri
```
Règles :
- Composants serveur par défaut. "use client" seulement pour de petites feuilles interactives, le plus bas possible.
- Les données restent en anglais (fire) et ne sont traduites qu'à l'affichage via TYPES.
- Jamais de classe Tailwind dynamique (`bg-type-${t}`) : table de correspondance, ou variable CSS --teinte.
- Toute donnée non mise en cache, ainsi que params et searchParams, est lue dans un composant sous <Suspense>.
  Idem pour usePathname dans le layout (routes dynamiques) : le composant Navigation est sous <Suspense>.
- null → notFound() ; une panne de l'API → une erreur levée, captée par error.tsx.
- Recherche, type et page vivent dans l'adresse (?q=&type=&page=), validés côté serveur.
- Les sélecteurs Zustand renvoient une seule valeur, jamais un objet créé à la volée.
- Bouton favori sorti du <Link> de la carte (positionné en absolute).
- Couleurs : toujours les jetons sémantiques de @theme (bg-fond, bg-surface, border-bordure, text-texte,
  text-texte-doux, bg-piste, accent…), jamais de couleur en dur dans les composants.

## Direction artistique actuelle (refonte du 25 novembre 2026 — elle PRIME sur la section « phase 6 » ci-dessous)
- Sombre « Pokédex tech » : fond `#0F1115`, surfaces `#171A21` / `#1E232D`, texte `#F8FAFC` / `#94A3B8`.
  Clair « Encyclopédie » : fond `#F4F5F8`, surfaces `#FFFFFF` / `#EEF1F6`, texte `#0F172A` / `#475569`.
  Clair dans `@theme static`, sombre dans `.dark`. Surfaces OPAQUES (plus de verre translucide), bordures à 8 %.
- UN SEUL accent, rouge, en deux jetons pour tenir 4,5:1 : `accent` = rouge qui s'écrit sur le fond (liens, icônes,
  filets, focus : `#EF4444` sombre, `#B91C1C` clair) ; `accent-plein` = rouge des boutons remplis avec texte blanc
  `sur-accent` (`#DC2626`, survol `accent-survol` `#B91C1C`). Blanc sur `#EF4444` ne fait que 3,8:1 : ne pas remplir
  un bouton avec `bg-accent`. `accent-bis` = rouge clair pour les dégradés. `texte-discret` = indications seulement.
- En-tête : onglets sans gélule autour, actif = `bg-piste` + filet rouge dessous ; une ligne à partir de `lg`.
  `IndicateurSacoche` affiche « n/6 » (à partir de `sm`) + les 6 Pokéballs ; `BoutonTheme` à droite.
- Accueil : `<h1>` texte « Pokédex National » + `NombreTotal` (le titre en particules React Bits est SUPPRIMÉ, fichiers
  retirés), libellé de recherche en `sr-only`, « n Pokémon trouvés » seulement s'il y a un filtre.
  `FiltreTypes disposition="grille"` : « Tous les types » seul sur sa ligne, puis 3 × 6 (`sm`) ou 2 × 9 (`lg`) ;
  libellé à côté du symbole à partir de `xl`. `puce-tuile` : fond teinté par `--teinte`, survol et `:active` réactifs.
- Cartes de la grille : mêmes éléments, halos adoucis (opacités baissées) pour rester lisibles dans les deux thèmes.
- `Projecteurs` : lumière blanche, thème sombre seulement. Écran du Pokédex 3D : couleur lue sur `--color-fond`.

## Direction artistique d'origine (phase 6 — direction B « Verre holographique », en partie remplacée ci-dessus)
- Jetons dans app/globals.css (@theme static + bloc .dark) : fond, surface (verre translucide), bordure, bordure-verre,
  texte, texte-doux, piste, accent (bleu-violet), accent-bis, sur-accent, danger, shadow-carte, shadow-lueur.
- Fond du site : UNI (choix de l'utilisateur) — pas de grille ni de lueurs derrière le contenu.
- Utilitaires maison (@utility) à réutiliser partout : `verre` (panneau : bordure, fond, ombre, arrondi 1.5rem),
  `etiquette` (petites capitales espacées pour les libellés secondaires : N°, TAILLE, VITESSE…),
  `bouton` + `bouton-principal` / `bouton-secondaire` (gélules de 44 px).
- Arrondis : panneaux = `verre` (rounded-3xl), contrôles = rounded-full. Tailles de texte : 3xl (h1), xl (h2), sm (texte), etiquette.
- `styleTeinte(type)` (lib/teinte.ts) pose --teinte ; cartes : dégradé, halo diffus, halo net au sol, lueur de survol.
- Cartes de même hauteur : `auto-rows-fr`, nom en `truncate`, badges `petit` sur une seule ligne.
- En-tête de page : `<header>` avec une `etiquette` au-dessus du h1.
- Un seul thème, le sombre : nuit bleu très sombre, verre fumé, lueurs de la teinte du type.
- Inspiration écran de Pokédex rétro-futuriste, sans logo officiel.
- Polices next/font : Chakra Petch pour les titres, Inter pour le texte.
- Une variable --teinte par carte (couleur du type principal) pour le dégradé, le halo derrière l'artwork et la lueur
  au survol. Numéro en filigrane géant.
- Espacements 2/4/6/8, deux ou trois tailles de texte, mêmes arrondis et mêmes ombres partout.
- Badges de type contrastés (texte foncé sur les types clairs, blanc sur poison, spectre et dragon).

## Animations
- Animer uniquement transform et opacity.
- Interface : moins de 400 ms, ressorts doux. Effets d'attaque : 0,8 à 1,5 s, uniquement dans l'arène.
- prefers-reduced-motion respecté partout (motion-reduce: en Tailwind, useReducedMotion() avec motion) :
  pas de lévitation, de particules ni de tremblement, juste des fondus.
- Aucun son automatique.

## Définition de « terminé » (à vérifier à chaque phase)
- npm run lint et npm run build passent, sans erreur d'hydratation dans la console.
- Rendu correct à 375 px (contraste du texte au moins 4,5:1) et avec les animations réduites.
- Tout fonctionne au clavier avec un focus visible ; alt sur chaque image ; un seul h1 par page ; les actions sont
  des <button>, les navigations des liens.

## Avancement des phases
0 Création · 1 Coque + thème · 2 Données + grille · 3 Fiche · 4 Recherche/filtre/pagination · 5 Favoris + sacoche
(puis déploiement Vercel) · 6 Direction artistique · 7 Animations · 8 Vue Équipe · 9 Attaques · 10 Combat · 11 Finitions.
Voir `git log` pour savoir quelle phase est terminée. Les 11 phases sont faites ; la suite = retouches à la demande.

## Ajouts après les phases (retouches)
- Fiche : `VitrineFiche` remplace l'illustration par `Carte3D` (three.js, importé dans un useEffect, démarré une fois
  la page chargée et le navigateur inoccupé). L'illustration reste l'affichage d'attente et le repli sans WebGL.
  `lib/carte3d.ts` dessine les deux faces dans des canvas 2D. `PanneauCarte3D` (carte au clic) est conservé, inutilisé.
- Carte 3D : effet holographique PAR TYPE (`lib/effets-types/` : `commun.ts` = outils GLSL, `types/` = une fonction
  `effetType` par type, `index.ts` = table, zones calmes, assemblage). C'est une couche additive À PART, entre la face
  et le reflet : le reflet d'origine de `Carte3D` ne doit pas être modifié (à `uForce` = 0, carte d'origine).
  Feuille holographique (`lib/effets-types/feuille.ts`, adaptée du « HoloCard » de React Bits) : couche de la face
  avant, SOUS l'effet du type (`renderOrder` 1/2/3 : feuille, effet, reflet), en alpha prémultiplié. Fine poussière
  blanche sur le bord + motif (arc-en-ciel, étoiles, rayons, cosmos, or). UNIQUEMENT DANS L'ATELIER (choix de
  l'utilisateur) : sur la fiche, la couche est cachée (`feuilleAvant.visible = false`) et la carte n'a que le reflet
  et l'effet de son type. Essayés puis retirés : motif selon la puissance, puis selon le stade d'évolution. Refusé par l'utilisateur (« guirlande ») : les hexagones multicolores du bord et le motif
  « paillettes » seul — ne pas les remettre. Elle dort carte de face et s'éveille quand elle penche ; force réglée par `uIntensite` (0.5).
  Shaders fournis par l'utilisateur (générés avec Gemini), corrigés ici : eau (voile uniforme), acier (moiré, `fwidth`).
  Filtres de l'accueil : le mode « éclat » des mêmes fonctions joue le FOND de l'effet (`lib/effets-types/eclat.ts` :
  un seul canvas WebGL plein écran réutilisé, shader préparé au survol/focus de la tuile par `preparerEclat`).
  Le shader joue SEUL, sans symboles par-dessus (choix de l'utilisateur) ; `EffetType` (tout en CSS) n'est plus que le
  repli quand `jouerEclat` renvoie false (moteur pas prêt, pas de WebGL, animations réduites = voile seul).
  Électrik a un éclat propre (éclairs verticaux en ligne brisée). Effet et éclat sont retirés quand l'accueil est mis
  en veille (nettoyage d'un useEffect dans `FiltreTypes`), sinon ils rejouaient au retour d'une fiche.
- Atelier, ajouts du 27 novembre 2026 : ATTAQUES INVENTÉES (formulaire « Inventer une attaque » : nom ≤ 20 caractères,
  type, puissance 0–250 ou vide = statut « — ») : `creerAttaquePerso` (identifiant `perso-<heure>`, champ `perso: true`),
  bornées par `nettoyerCarte` ; elles n'existent QUE sur la carte de l'atelier (jamais en combat ni en sacoche).
  EXPORT PNG (bouton « Exporter la carte », seulement si `perso`) : choix de l'utilisateur = la carte TELLE QU'ON LA VOIT
  (reflets, feuille, effet), pas la face à plat. `capturer` de `Carte3D` : textures remontées à `FINESSE_EXPORT`, image
  suivante rendue à `HAUTEUR_EXPORT` px (setPixelRatio), recopiée aussitôt dans un canvas 2D, recadrée sur l'opacité.
- Atelier de carte : `/atelier?pokemon=nom` (onglet « Atelier » du menu). `ChoixPokemonAtelier` (recherche via
  `/api/recherche` + « Mes cartes ») puis `AtelierCarte` (client). Le lien « Créer sa carte » sous la carte de la
  fiche (`VitrineFiche`) y mène avec le Pokémon déjà choisi. Styles classique / full art / chromatique / or, surnom, motif, effet de type,
  2 attaques au plus posées par glisser-déposer natif (+ bouton « Ajouter » pour clavier et tactile). Données et
  règles dans `lib/carte-perso.ts`, sauvegarde automatique dans `stores/cartes.ts` (persist, réhydraté par
  `HydratationStores`). `Carte3D` reçoit `perso` et met la carte à jour SUR PLACE (`appliquer` : texture
  redessinée, shaders réglés) sans recréer la scène. Mise en page de la face : `miseEnPage` (lib/carte3d.ts), les
  zones calmes des shaders en découlent (`zonesDeLaFace`). Sans `perso`, la carte de la fiche est inchangée.
- Accueil, haut de page (après l'introduction) : CENTRÉ (choisi par l'utilisateur dans `/labo/hero`, 4 propositions
  dans `components/labo/HerosAccueil.tsx`) : titre EN PARTICULES (`TitreParticules`, client : vrai `<h1>` en
  `sr-only` + canvas `aria-hidden` ; `components/ParticleText.tsx` est REPRIS TEL QUEL de React Bits, ne pas le
  réécrire ; deux lignes sous 640 px, sinon illisible), accroche, recherche en `max-w-2xl`, lien Atelier
  (bouton « Pokémon au hasard » essayé puis retiré à la demande de l'utilisateur), `FiltreTypes disposition="centre"` (prop : defaut / centre / etale). Les cartes de la grille ne
  changent pas. L'utilisateur doit envoyer des composants pour embellir le titre.
- Introduction : `Projecteurs` (client, adapté de « Spotlight New » d'Aceternity UI) = deux faisceaux doux qui
  descendent des coins de la scène, DERRIÈRE le Pokédex 3D (dans `ScenePokedex`, liés à `lumiereOpacite`).
  L'utilisateur les veut sur le Pokédex, PAS sur la liste de l'accueil (essayé puis retiré). Couleur = jeton accent.
- Accueil : introduction `IntroPokedex` (client, `components/`) autour de toute la page. Un Pokédex géant EN 3D
  (three.js, chargé à la demande : `lib/labo/pokedex3d.ts` = modèle repris d'un fichier fourni, `@ts-nocheck`, exclu
  d'ESLint ; `lib/labo/scene-pokedex.ts` = lumières et reflets validés par l'utilisateur) s'ouvre au défilement, puis
  on plonge dans son écran, où s'affiche LA VRAIE PAGE, réduite et découpée au format de l'écran. Pas de boucle
  d'animation : une image est dessinée à chaque changement de défilement, et l'écran est retrouvé en projetant ses
  coins par la caméra (`calerPage`). Pas d'image d'attente : scène vide sous le projecteur, puis fondu. En-tête masqué au début (`data-intro-debut` + `body:has()` dans globals.css), lumière de scène (`halo-scene`, dégradés radiaux seulement : un cône laissait des bandes).
  Pendant l'introduction la page est en `position: fixed` (elle ne défile pas : sa place ne vient que des
  transformations, sinon elle tremblait dans le cadre) ; la plongée se termine quand elle atteint sa taille normale.
  Jouée une fois par visite (sessionStorage `pokedex-intro-vue`), jamais en animations réduites.
  Deux composants : `IntroPokedex` (décide, porte la page) et `ScenePokedex` (l'appareil, présent seulement pendant
  l'introduction). Fin de plongée → la scène est RETIRÉE et le défilement compensé : le haut de la page redevient le
  haut du site (sinon pagination, logo et « Tous » ramenaient au Pokédex fermé). Pour la revoir à l'envers, insister à
  la molette tout en haut (`EFFORT_POUR_ROUVRIR`). Animations réduites lues par `useSyncExternalStore` (pas
  `useReducedMotion`, qui provoquait une erreur d'hydratation ici).
  Exception assumée à « transform et opacity seulement » : `clip-path` pendant la plongée.
  Version précédente en photos et variante Pokéball : dossier local `effets/` (hors dépôt) ; essais dans `/labo/intro`
  et `/labo/pokedex-3d`.
- Accueil : `FiltreTypes` (client) = tuiles avec symbole (`lib/glyphes.ts`), type actif optimiste (`useOptimistic` +
  `useTransition`), `<Link prefetch>` seulement au survol/focus, clics en rafale regroupés. `EffetType` joue la
  recette du type (mouvement, fond, anneaux) en CSS seul ; classes `effet-*` dans globals.css, toujours via une table
  de correspondance (jamais `effet-${x}`).
- Recherche : français ou anglais, sans accents (`normaliser` / `filtrerNoms` dans lib/recherche.ts). Les noms
  français viennent du CSV du dépôt PokeAPI/pokeapi (`recupererNomsFrancais`), repli sur l'anglais s'il est indisponible.
- lib/pokeapi.ts : `lire` retente 3 fois les échecs passagers (pas de file d'attente partagée). `"use cache: remote"`
  sur recupererPokemon, recupererTousLesNoms, recupererNomsDuType, recupererNomsFrancais ; recupererListe reste en
  `"use cache"` pour être préchargeable.
- Combat : effets d'attaque sur canvas (`lib/labo/moteur2d.ts`, recettes dans `lib/labo/effets2d.ts`, testées).
- Combat : animations d'attaques de Pokémon Showdown (`lib/showdown/`). `animations-attaques.ts`, `animations-communes.ts`
  et `effets.ts` sont REPRIS TELS QUELS (CC0, `@ts-nocheck`, exclus d'ESLint) : ne pas les réécrire. Le code du projet
  est `scene.ts` (adaptateur : refait `showEffect`, `backgroundEffect` et le déplacement des Pokémon avec
  `element.animate`) et `index.ts` (`jouerAnimation`, `aUneAnimation`). Chargé par `import()` au démarrage d'un combat.
  L'effet par type sur canvas reste le repli (attaque inconnue, animations réduites). Images dans `public/showdown/fx`
  (licences dans `public/showdown/LISEZMOI.txt`) ; crédits sur la page À propos.
- Grille : cascade d'apparition plafonnée aux 6 premières cartes. Images : `minimumCacheTTL` de 31 jours.
- Téléphone (retouches, sans effet sur ordinateur) : les canvas 3D pilotés par OrbitControls (`Carte3D`,
  `Visionneuse3D`) sont en `touch-action: pan-y` (à remettre APRÈS `new OrbitControls`, qui impose `none`) : le
  glissement vertical fait défiler la page, l'horizontal tourne l'objet. Sacoche : le détail d'un membre défile
  jusqu'à lui (< 768 px), stats et attaques avant le modèle 3D, un seul emplacement libre affiché. Combat : au
  démarrage la page défile jusqu'à l'arène (< 640 px), arène plus basse, bouton « Quitter » passé en bas.
- Compatibilité Safari / Firefox (vérifiée avec Playwright : moteurs WebKit et Firefox, pas le vrai Safari) :
  `TitreParticules` sans halo (`glow={false}` : l'ombre floue du canvas faisait tomber WebKit à 34 images/s) ;
  `useCri(url, surEchec)` : les cris sont en .ogg, illisible sur les Safari d'avant 2025 → `BoutonCri` l'annonce au
  lieu de ne rien faire ; champs de saisie à 16 px sur écran tactile (`@media (pointer: coarse)` dans globals.css),
  sinon iOS zoome la page au focus. Tailwind 4 impose de toute façon Safari 16.4+ / Firefox 128+.
- Cahier des charges du cours (grille sur 20, 19 étapes de TP) vérifié le 25 novembre 2026 : tout est couvert.
  `CompteurFavoris` (client) affiche le nombre de favoris dans l'en-tête, exigé par l'étape 15. Le README doit
  rester exact (20 par page, shaders, atelier) : le mettre à jour quand une fonctionnalité change.
- Nuée de points « Swarm Cursor » de React Bits : essayée dans l'en-tête puis dans le pied de page, RETIRÉE des deux
  à la demande de l'utilisateur (fichiers supprimés) — ne pas la remettre. Le pied de page est un simple composant
  serveur. Menu : Tous, Favoris, Sacoche, Combat, Atelier, Quiz (ordre voulu).
- En-tête et pied de page : fond `bg-cadre` (jeton `--color-cadre` : même couleur que la page en sombre, blanc en
  clair). L'en-tête reste flouté (`bg-cadre/85`).
- Fond de l'écran de fin (27 novembre 2026, demande de l'utilisateur) : l'anneau d'ASTÉROÏDES remplace le fond noir et
  ses braises (bloc « restes » retiré de `erosion.ts`). Effet « Astéroïdes » fourni par l'utilisateur (zip, licence MIT,
  `lib/asteroides/LICENSE`) : `lib/asteroides/core|environments|particles/` REPRIS TELS QUELS (les `.d.ts` à côté = types
  ajoutés) ; `lib/asteroides/scene.ts` = code du projet (sans l'objectif cinéma ni le cœur rouge ni les 8 blocs de la démo).
  `FondAsteroides` (client, calque fixe `-z-20` monté par `CompagnonPokeball`) n'a PAS de boucle : `SequenceFeu` écrit
  `fondFin` (lib/pokeball/pose.ts : visibilite, apparition, ouverture) d'après la progression de la brûlure puis appelle
  `fondFin.dessiner`. Le fond s'allume avec la désintégration (0,38→0,46), pas avant (il se voyait derrière Dracaufeu) ;
  l'écran de fin aussi. Le fondu transparent du haut du canvas de feu est GARDÉ (le retirer laissait un bord orange net
  sous l'en-tête, refusé par l'utilisateur).
  Au centre : POKÉBALL DE LAVE (`lib/asteroides/pokeball-lave.ts`), deux images GÉNÉRÉES PAR IA (Gemini) ouverte / fermée
  dans `public/pokeball-lave/`, sur un panneau face caméra DANS la scène (roches devant / derrière), boule opaque + lueur
  ajoutée (fond noir non détouré), fondu ouverte → fermée en bas de page (la capture). La Pokéball 3D (R3F) ne sert plus
  qu'en haut de l'accueil (poses titre / sortie). Centre de l'anneau = fondFin.fx/fy (0 / 0.08) par `setViewOffset` :
  titre en haut, bouton en bas (`justify-between`). Crédits sur la page À propos.
- Mesurer la vitesse : toujours `npm run build` + `npm start` (le mode dev est 5 à 10 fois plus lent).

## Vérifier le rendu sans navigateur interactif
- Captures : Chrome sans fenêtre sur le site Vercel
  (`chrome.exe --headless=new --window-size=1280,800 --screenshot=... URL`).
- Audit : `npx lighthouse URL --output=json --chrome-flags="--headless=new"` (émulation mobile, capture finale incluse).
- Le README n'a plus de captures (choix de l'utilisateur).
- Accueil (depuis le 25 novembre 2026) : titre géant, `CarrouselVedettes`, recherche (`#haut-liste`), types, grille,
  pagination, puis `SequenceFeu` et son écran de fin, le tout DANS `IntroPokedex`.
- Fin de page « l'écran brûle » : `components/SequenceFeu.tsx` (client) enveloppe l'écran de fin (ses `children`, rendus
  par le serveur) : celui-ci est `sticky` et suivi d'un bloc vide de 360svh (souffle 140svh, à ne pas changer ; désintégration 220svh après 420, 330 puis 270 jugés trop longs) (PAS un padding : un élément collant ne glisse
  que dans le contenu de son parent) ; un canvas transparent par-dessus, progression 0→1 lue à chaque image, boucle en
  pause hors écran (IntersectionObserver). Le souffle occupe 25 % du défilement et la désintégration 75 % (fonction
  `allonger`) : l'utilisateur la voulait longue. Rejouable en remontant puis redescendant, jamais en boucle ; pas de bouton
  « Passer » (retiré à sa demande). Écran de fin : « Attrapez-les tous ! » + un lien « Retour à la liste des Pokémon »,
  64svh, et la progression est ramenée à la course réellement atteignable : la désintégration finit pile en bas de page,
  sans défilement « dans le vide » avant le pied de page (demandé deux fois par l'utilisateur) ; des braises restent en fond.
  `lib/scenes-feu/` : `index.ts` (scène three.js), `erosion.ts` (shader fourni par l'utilisateur, généré avec Gemini, ADAPTÉ :
  les ajouts sont marqués « Ajout du projet »), `texte.ts` (titre qui brûle lettre par lettre, `data-lettre` / `data-bloc`).
  Trois images de Dracaufeu GÉNÉRÉES PAR IA dans `public/dracaufeu/` (repos, inspiration, souffle ; .webp détourés par un
  script hors dépôt), créditées sur la page À propos. Essayés puis retirés : Tortank et le jet d'eau, quatre autres
  variantes du shader (cinema, pyroclastique, leger, plaques), la page `/labo/elements` — récupérables dans Git.
- Carrousel des vedettes (accueil) : `components/FlexCarousel.tsx` est
  fourni par l'utilisateur et REPRIS TEL QUEL (ne pas le réécrire ; deux libellés d'accessibilité traduits). Il a ajouté la
  dépendance npm `ogl` (acceptée implicitement : c'est son composant). `CarrouselVedettes` (client) dessine une carte par
  Pokémon dans un canvas 2D (lueur du type, numéro, illustration) puis la passe en image ; `captureWheel={false}` et
  `className="overscroll-auto!"` pour que la molette fasse défiler la page (sinon elle reste bloquée sur le carrousel) ; il
  tourne quand même avec le défilement : une fausse touche fléchée lui est envoyée tous les 190 px (NE PAS changer cette vitesse : l'utilisateur la trouve bien). Pour qu'il tourne plus longtemps, il est
  ÉPINGLÉ (`sticky`) dans app/page.tsx AVEC la recherche et les types (l'utilisateur veut voir la suite de la page en bas
  pendant ce temps, pas un écran vide), et le bloc est suivi d'un vide de 55svh (120 jugé trop long) : c'est cette hauteur qu'on règle ; un vrai lien « Voir la fiche de … » suit la carte centrale.
- ATTENTION `npm install` : il supprime le paquet `shaders`, installé à la main pour la page locale `/labo/fond` (dossiers
  `effets/` et `app/labo/fond/` exclus par `.git/info/exclude`) et absent de package.json → le build casse. Le remettre
  avec `npm install shaders --no-save`.
- Pokéball 3D de l'accueil (26 novembre 2026, inspirée du site « Rewind » d'un camarade ; l'utilisateur a autorisé ses
  bibliothèques : `@react-three/fiber`, `@react-three/drei`, `gsap` ajoutés à package.json ; Lenis NON installé).
  `lib/pokeball/pose.ts` = objet `pose` partagé + une pose par moment (fractions d'écran, large / étroit) ;
  `components/CompagnonPokeball.tsx` (client) relie le défilement à la pose avec GSAP ScrollTrigger (`scrub`) et attend la
  fin de `IntroPokedex` (il guette la classe `fixed` de son parent) ; `components/three/ScenePokeball.tsx` = la Pokéball
  modélisée en code (demi-sphères, bande, bouton, couvercle à charnière, halo), chargée par `next/dynamic` sans rendu
  serveur, en pause quand elle est invisible. Calque fixe `-z-10` DERRIÈRE le contenu, `pointer-events-none`. Elle est à
  droite du titre, sort par le haut en 360 px, revient ouverte à travers la brûlure et se referme en bas de page.
- Cinématique de Dracaufeu enrichie (26 novembre 2026), tout dans `erosion.ts` (blocs « Ajout du projet ») : caméra qui
  avance vers la gueule puis recule au souffle (`zoomCamera`), recul du corps et battement des ailes par déformation de
  l'image, queue qui s'embrase, lueur orange sur le décor et sur les lettres du titre. CAPTURE : `SequenceFeu` passe la
  pose de la Pokéball au shader (`uPokeball`, `uAspiration` = ouverture × fondu) ; des traits de lumière convergent vers
  elle et ce qui reste de Dracaufeu rougit. La durée des flammes n'a pas changé.
- Générique de fin défilant (crédits du projet en fond de l'écran de fin) : essayé puis RETIRÉ à la demande de
  l'utilisateur le 26 novembre 2026 — ne pas le remettre. Il voulait à l'origine les paroles du générique de Pokémon :
  refusé (texte protégé).
- Arrivée après l'introduction (26 novembre 2026) : l'élan de la molette faisait descendre la page de plusieurs écrans.
  `retenirEnHaut` (dans `IntroPokedex`) remet la page à 0 à chaque défilement tant que le geste dure (au moins
  `RETENUE_MIN`, au plus `RETENUE_MAX`). `preventDefault` ne marche PAS ici : le navigateur refuse d'annuler une
  molette déjà lancée, d'où la correction après coup sur l'événement `scroll`.
- Tunnel de lumière pendant la plongée dans le Pokédex (shader maison, inspiré de loin du site de Lusion) : essayé puis
  RETIRÉ le 26 novembre 2026 (« rien à voir avec Lusion, on perd de vue la destination ») — ne pas le remettre. La
  plongée d'origine (la vraie page qui grandit dans l'écran) est conservée. Le code de sites tiers fourni par
  l'utilisateur ne doit pas être copié. Le carrousel ne tourne plus pendant l'introduction (on arrive sur Pikachu).
- Bugs du retour sur l'accueil corrigés le 26 novembre 2026 (Next met l'accueil en veille quand on le quitte et
  relance les effets au retour) : `CarrouselVedettes` ne dessine ses 12 cartes qu'UNE fois par visite (promesse gardée
  dans une variable de module), en JPEG 0,93 via `toDataURL` puis adresse `blob:` courte (NE PAS utiliser `toBlob` : le
  navigateur n'encode alors qu'au repos, le carrousel mettait 7 s à apparaître ; NE PAS passer de longues adresses
  `data:` à FlexCarousel, il les recopie à chaque rendu) ; l'entrée « rise » ne se joue qu'à la première arrivée ;
  `CompagnonPokeball` rappelle `ScrollTrigger.refresh()` à l'image suivante ; le canvas React Three Fiber est en
  `pointerEvents: none` (il bloquait les liens du pied de page).

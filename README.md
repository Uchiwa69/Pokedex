# Pokédex — Next.js 16

Un Pokédex complet construit avec **Next.js 16 (App Router)**, **TypeScript** et **Tailwind CSS 4**, à partir des
données publiques de la [PokéAPI](https://pokeapi.co) : liste, fiches détaillées, favoris, équipe, combats au tour
par tour, quiz et atelier de cartes holographiques. Projet de fin de cours.

**Démo en ligne : https://pokedex-pi-coral-47.vercel.app**

## Fonctionnalités

- **Introduction en 3D** : un Pokédex géant s'ouvre au défilement, puis on plonge dans son écran, où s'affiche le
  site. Jouée une fois par visite, jamais en animations réduites.
- **Liste des 1 025 Pokémon** en grille paginée (20 par page), avec noms français, sous un titre dessiné en
  particules.
- **Recherche par nom français ou anglais, ou par numéro**, même incomplet, sans tenir compte des accents ni des
  majuscules (« evoli » trouve Évoli, « char » trouve Charizard, « 25 » trouve Pikachu). Recherche, **filtre par type** et **pagination** sont
  entièrement pilotés par l'adresse (`?q=&type=&page=`) et validés côté serveur.
- **Filtre par type en tuiles** : un symbole original par type. Le type choisi est marqué actif immédiatement, sa
  liste est préchargée au survol, et un **éclat propre à chaque type** traverse l'écran (flammes pour Feu,
  caustiques pour Eau, éclairs pour Électrik, givre pour Glace…) : un shader plein écran, avec un repli en CSS.
- **Fiche détaillée** : **carte holographique en 3D** que l'on fait tourner à 360° (reflet qui suit le mouvement,
  effet animé propre au type du Pokémon, dos original), types, taille, poids, six statistiques, sprite animé (face / dos), cri, chaîne d'évolution
  cliquable et **attaques apprises par niveau** (type, catégorie, puissance, précision, PP, description).
- **Atelier** : on compose sa propre carte holographique — style (classique, full art, chromatique, or), surnom,
  motif brillant, effet de type, et jusqu'à deux attaques posées par glisser-déposer. La carte est enregistrée
  dans le navigateur.
- **Favoris** (leur nombre s'affiche dans l'en-tête) et **sacoche** conservés dans le navigateur ; la sacoche est une « arène d'équipe » : 6 socles animés,
  détail du membre sélectionné, surnoms, 4 attaques par Pokémon, ordre modifiable par glisser-déposer ou au clavier.
- **Mode combat** : ta sacoche contre une équipe tirée au hasard, au niveau 50 — efficacité des 18 types, dégâts,
  précision, ordre selon la vitesse, IA adverse, journal de combat accessible, et **effets d'attaque dessinés sur
  un canvas** (projectile, trajectoire, impact) choisis selon le type, la catégorie et la puissance de l'attaque.
- **Quiz « Qui est ce Pokémon ? »** : une silhouette, quatre propositions, révélation animée.
- **Direction artistique « verre holographique »** : thème sombre, panneaux translucides sur fond uni, une teinte
  par Pokémon (couleur de son type principal).
- **Animations** : apparition en cascade, inclinaison 3D des cartes, transition partagée de l'illustration entre la
  grille et la fiche (View Transitions) — uniquement `transform` et `opacity`, et réduites à de simples fondus avec
  `prefers-reduced-motion`. Aucun son automatique.
- **Accessibilité** : navigation au clavier, focus visible, libellés ARIA, zones `aria-live`, contrastes vérifiés.

## Stack

| Domaine | Choix |
| --- | --- |
| Framework | Next.js 16 — App Router, Cache Components (`"use cache"`), Partial Prerendering |
| Langage | TypeScript |
| Styles | Tailwind CSS 4 (configuration dans `app/globals.css` avec `@theme`) |
| État client | Zustand (`persist` + réhydratation après l'hydratation React) |
| Thème | next-themes (thème sombre imposé avec `forcedTheme`) |
| Animations | motion (`motion/react`) et CSS, `prefers-reduced-motion` respecté |
| 3D | three.js, chargé à la demande : carte holographique, effets de type (shaders GLSL), introduction |
| Tests | vitest (fonctions pures de `lib/combat.ts` et de `lib/labo/effets2d.ts`) |
| Données | PokéAPI v2 (lecture seule, sans clé) |
| Hébergement | Vercel |

## Architecture

```
app/          Routes : liste, fiche /pokemon/[nom], favoris, sacoche, combat, quiz, atelier, à propos, routes /api
components/   Composants d'interface — serveur par défaut, client seulement pour l'interactivité
hooks/        Hooks réutilisables (debounce, raccourci clavier, chargement client, cri…)
lib/          Accès à la PokéAPI, conversion des données, validation de l'adresse, moteur de combat,
              symboles des types, dessin de la carte 3D, effets par type (lib/effets-types), effets d'attaque
stores/       Stores Zustand (favoris, sacoche, cartes de l'atelier) avec leurs règles métier
```

Quelques principes suivis dans le code :

- **Composants serveur par défaut** ; `"use client"` uniquement sur de petites feuilles interactives.
- **Données mises en cache côté serveur** (`"use cache"` + `cacheLife("days")`, et `"use cache: remote"` pour le
  cache partagé de l'hébergeur) ; les 151 premières fiches sont générées au build avec `generateStaticParams`.
- **Appels à l'API tolérants aux pannes passagères** : un appel en échec est retenté jusqu'à trois fois, pour
  qu'une seule erreur sur les 20 appels d'une page ne fasse pas tomber toute la page.
- **Tout ce qui dépend de la requête** (`params`, `searchParams`) est lu sous `<Suspense>`.
- **L'état partageable vit dans l'adresse** : recherche, type, page, onglet de la fiche.
- **Réaction immédiate au clic** : le filtre affiche tout de suite le type choisi (`useOptimistic`,
  `useTransition`) pendant que le serveur prépare la liste, préchargée dès le survol (`<Link prefetch>`).
- **Les données restent en anglais** (`fire`) et ne sont traduites qu'à l'affichage.
- **Les règles métier vivent dans les stores** (6 Pokémon maximum, pas de doublon, 2 attaques par carte).
- **Le moteur de combat est fait de fonctions pures** : le hasard leur est passé en argument, ce qui les rend
  testables.
- **Le plus lourd est chargé le plus tard** : three.js n'est téléchargé qu'une fois la fiche affichée et le
  navigateur inoccupé ; l'illustration classique sert d'attente et de repli sans 3D.

## Qualité

Audit Lighthouse (mobile) sur la version de production, le 25 novembre 2026 :

| Page | Accessibilité | Bonnes pratiques | SEO |
| --- | --- | --- | --- |
| Accueil | 100 | 100 | 100 |
| Fiche | 100 | 100 | 100 |
| Sacoche | 100 | 100 | 100 |
| Favoris | 100 | 100 | 100 |
| Atelier | 100 | 100 | 100 |

Le site a aussi été parcouru sans erreur dans les moteurs de Safari (WebKit) et de Firefox, sur ordinateur et en
largeur de téléphone.

30 tests unitaires couvrent le moteur de combat et le choix des effets d'attaque (`npm test`).

## Lancer le projet

Prérequis : Node.js 20 ou plus.

```bash
npm install
npm run dev      # http://localhost:3000
```

Le mode développement recompile tout à la volée : il est nettement plus lent que le site réel. Pour juger la
vitesse, lancer plutôt `npm run build` puis `npm start`.

Autres commandes :

```bash
npm run lint        # ESLint
npm run typecheck   # vérification des types TypeScript
npm test            # tests unitaires (vitest)
npm run build       # build de production (nécessite un accès à la PokéAPI)
npm start           # sert le build de production
npm run clean       # supprime le dossier .next
```

Les mêmes commandes sont disponibles en raccourcis avec [`make`](Makefile) ou [`just`](justfile) :

```bash
make help    # ou : just
make check   # lint + typecheck + test + build, à lancer avant un commit
```

## Déploiement

Le site est déployé sur Vercel : https://pokedex-pi-coral-47.vercel.app (redéployé à chaque `git push` sur `main`).

L'application a besoin d'un serveur Node.js (rendu serveur, cache, routes dynamiques) : elle se déploie sur
[Vercel](https://vercel.com) ou tout hébergeur Node.js. Elle ne peut pas être servie telle quelle par un hébergement
purement statique.

## Crédits et mentions

- Données, illustrations, sprites et cris : [PokéAPI](https://pokeapi.co). Sprites animés issus de Pokémon Showdown.
- Noms français pour la recherche : fichier de données du dépôt [PokeAPI/pokeapi](https://github.com/PokeAPI/pokeapi).
- Animations d'attaques du mode combat : [Pokémon Showdown](https://github.com/smogon/pokemon-showdown-client) (CC0).
- Titre en particules, nuée de points du pied de page, feuille holographique de l'atelier :
  composants de [React Bits](https://reactbits.dev).
  Projecteurs de l'introduction : adaptés d'[Aceternity UI](https://ui.aceternity.com).
- Les effets par type (shaders GLSL) ont été générés avec Gemini, puis corrigés et intégrés pour ce projet.
- Les symboles des types, le décor et le dos de la carte holographique sont des dessins originaux réalisés pour
  ce projet.
- Pokémon est une marque de Nintendo / Game Freak / The Pokémon Company. Projet étudiant non commercial, sans
  affiliation avec ces sociétés.

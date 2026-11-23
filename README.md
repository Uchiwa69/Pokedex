# Pokédex — Next.js 16

Un Pokédex complet construit avec **Next.js 16 (App Router)**, **TypeScript** et **Tailwind CSS 4**, à partir des
données publiques de la [PokéAPI](https://pokeapi.co). Projet de fin de cours.

**Démo en ligne : https://pokedex-pi-coral-47.vercel.app**

> Statut : en cours de développement (phases 0 à 10 terminées sur 11).

## Fonctionnalités

- **Liste des 1 025 Pokémon** en grille paginée (24 par page), avec noms français.
- **Recherche** avec debounce, **filtre par type** et **pagination** entièrement pilotés par l'adresse
  (`?q=&type=&page=`), validés côté serveur.
- **Fiche détaillée** : illustration officielle, types, taille, poids, six statistiques et chaîne d'évolution cliquable.
- **Favoris** et **sacoche** conservés dans le navigateur ; la sacoche est une « arène d'équipe » : 6 socles animés,
  détail du membre sélectionné, surnoms, ordre modifiable par glisser-déposer ou au clavier.
- **Thème clair / sombre** qui suit le système, avec choix mémorisé.
- **Accessibilité** : navigation au clavier, focus visible, libellés ARIA, contrastes vérifiés dans les deux thèmes.

- **Direction artistique « verre holographique »** : fond à grille fine et lueurs, panneaux translucides, une teinte
  par Pokémon (couleur de son type principal), soignée en clair comme en sombre.

- **Animations** : apparition en cascade, inclinaison 3D des cartes, transition partagée de l'illustration entre la
  grille et la fiche (View Transitions), sprite animé, cri au clic — le tout coupé avec « animations réduites ».

- **Attaques** : onglet de la fiche listant les attaques apprises par niveau (nom français, type, catégorie,
  puissance, précision, PP, description) ; chaque membre de la sacoche reçoit ses 4 meilleures attaques.

- **Mode combat** : ta sacoche contre une équipe tirée au hasard, au niveau 50 — efficacité des 18 types, dégâts,
  précision, ordre selon la vitesse, IA adverse, effets d'attaque animés par type, journal de combat accessible.

À venir : quiz « Qui est ce Pokémon ? », audit et finitions.

## Stack

| Domaine | Choix |
| --- | --- |
| Framework | Next.js 16 — App Router, Cache Components (`"use cache"`), Partial Prerendering |
| Langage | TypeScript |
| Styles | Tailwind CSS 4 (configuration dans `app/globals.css` avec `@theme`) |
| État client | Zustand (`persist` + réhydratation après l'hydratation React) |
| Thème | next-themes |
| Animations | motion (`motion/react`) et CSS, `prefers-reduced-motion` respecté |
| Tests | vitest (fonctions pures de `lib/combat.ts`) |
| Données | PokéAPI v2 (lecture seule, sans clé) |

## Architecture

```
app/          Routes (liste, fiche /pokemon/[nom], favoris, sacoche, combat, à propos)
components/   Composants d'interface — serveur par défaut, client seulement pour l'interactivité
hooks/        Hooks réutilisables (debounce, raccourci clavier, chargement client…)
lib/          Accès à la PokéAPI, conversion des données, validation des paramètres d'adresse
stores/       Stores Zustand (favoris, sacoche) avec leurs règles métier
```

Quelques principes suivis dans le code :

- **Composants serveur par défaut** ; `"use client"` uniquement sur de petites feuilles interactives.
- **Données mises en cache côté serveur** (`"use cache"` + `cacheLife("days")`) ; les 151 premières fiches sont
  générées au build avec `generateStaticParams`.
- **Tout ce qui dépend de la requête** (`params`, `searchParams`) est lu sous `<Suspense>`.
- **Les données restent en anglais** (`fire`) et ne sont traduites qu'à l'affichage.
- **Les règles métier vivent dans les stores** (6 Pokémon maximum, pas de doublon).

## Lancer le projet

Prérequis : Node.js 20 ou plus.

```bash
npm install
npm run dev      # http://localhost:3000
```

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

- Données et images : [PokéAPI](https://pokeapi.co).
- Pokémon est une marque de Nintendo / Game Freak / The Pokémon Company. Projet étudiant non commercial, sans
  affiliation avec ces sociétés.

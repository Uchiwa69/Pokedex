# Pokédex — raccourcis de développement (https://just.systems).
# Chaque recette délègue aux scripts npm (package.json reste la seule source de vérité).
# Usage : just <recette>      Liste des recettes : just

# Sous Windows, les recettes s'exécutent avec PowerShell.
set windows-shell := ["powershell.exe", "-NoLogo", "-NoProfile", "-Command"]

# Affiche la liste des recettes
default:
    @just --list --unsorted

# Installe les dépendances à l'identique du package-lock.json
install:
    npm ci

# Lance le serveur de développement (http://localhost:3000)
dev:
    npm run dev

# Analyse le code avec ESLint
lint:
    npm run lint

# Vérifie les types TypeScript
typecheck:
    npm run typecheck

# Lance les tests unitaires (vitest)
test:
    npm test

# Construit la version de production
build:
    npm run build

# Sert la version de production (après build)
start:
    npm start

# Vérification complète avant un commit : lint + typecheck + test + build
check: lint typecheck test build

# Supprime les fichiers générés (.next)
clean:
    npm run clean

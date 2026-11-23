# Pokédex — raccourcis de développement.
# Chaque cible délègue aux scripts npm (package.json reste la seule source de vérité).
# Usage : make <cible>      Liste des cibles : make help

.DEFAULT_GOAL := help
.PHONY: help install dev lint typecheck test build start check clean

help: ## Affiche cette aide
	@echo "Cibles disponibles :"
	@echo "  install    Installe les dependances (npm ci)"
	@echo "  dev        Lance le serveur de developpement (http://localhost:3000)"
	@echo "  lint       Analyse le code avec ESLint"
	@echo "  typecheck  Verifie les types TypeScript"
	@echo "  test       Lance les tests unitaires (vitest)"
	@echo "  build      Construit la version de production"
	@echo "  start      Sert la version de production (apres build)"
	@echo "  check      Verification complete avant un commit : lint + typecheck + test + build"
	@echo "  clean      Supprime les fichiers generes (.next)"

install: ## Installe les dépendances à l'identique du package-lock.json
	npm ci

dev: ## Lance le serveur de développement
	npm run dev

lint: ## Analyse le code avec ESLint
	npm run lint

typecheck: ## Vérifie les types TypeScript
	npm run typecheck

test: ## Lance les tests unitaires
	npm test

build: ## Construit la version de production
	npm run build

start: ## Sert la version de production
	npm start

check: lint typecheck test build ## Vérification complète avant un commit

clean: ## Supprime les fichiers générés
	npm run clean

# Kibaru
Boutique de vêtements femme, homme et enfant et chaussures femme/homme, inspirée de la navigation par univers de Kiabi, avec une identité propre.

- Front : Angular, Tailwind CSS, Angular Material, PWA installable.
- Backend : Java 21, Spring Boot, PostgreSQL, migrations Flyway.
- Devise affichée : FCFA (XOF).
- Commande sans compte : coordonnées obligatoires, devis validé par le serveur, demande enregistrée et redirection WhatsApp vers +221 77 672 27 01. Aucun paiement en ligne.
- Administration : produits, jusqu’à 8 photos, tailles, couleurs, pointures, stocks, catégories, suivi des commandes et statistiques des ventes confirmées, paramètres et localisation GPS.
- Compte facultatif pour retrouver ses commandes ; espace équipe sous /admin.

## Démarrage
Backend : cd backend puis mvn spring-boot:run. Front : cd frontend puis npm ci et npm start. Origine de développement : http://localhost:4201.

## Vérification
Backend : mvn -B -Duser.timezone=UTC verify. Front : npm ci, npm audit --audit-level=high, npm run build, npx playwright test.
Le workflow GitHub Actions vérifie les deux projets sur main et les pull requests.

## Déploiement
Voir deploy/README.md. Domaine : https://kibaru.duckdns.org. Base et volumes dédiés, aucun port PostgreSQL exposé. Les secrets sont conservés hors Git.
Aucun produit ni stock fictif n’est publié ; les produits réels et leurs photos se créent dans l’administration.

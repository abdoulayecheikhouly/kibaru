# Déployer Kibaru
Créer /opt/kibaru, y conserver compose.yml et .env (0600), les sources sous repository/.
Construire docker build -t kibaru-backend:TAG repository/backend et docker build -t kibaru-frontend:TAG repository/frontend, puis renseigner les tags .env et exécuter docker compose up -d.
Proxy Caddy : kibaru.duckdns.org { reverse_proxy kibaru-frontend:8080 } sur le réseau externe samakeur_default.
Les conteneurs fonctionnent sans privilèges, les volumes kibaru_database et kibaru_uploads persistent.
Avant chaque migration : sauvegarder PostgreSQL par docker compose exec -T db pg_dump -U kibaru kibaru dans un fichier privé.
Ne jamais lancer docker compose down -v en production. Pour revenir à la version précédente, remettre les anciens tags ; restaurer une sauvegarde si une migration n’est pas rétrocompatible.
Les secrets ne doivent pas apparaître dans les logs ou dans Git. Aucun déploiement automatique par clé SSH n’est activé par ce workflow de vérification.

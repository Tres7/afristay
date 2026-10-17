-- Rôle PostgreSQL à droits minimaux pour l'application (API, workers, relais, consumer).
--
-- Le rôle propriétaire (celui qui a créé la base) ne sert plus qu'aux migrations. L'application tourne avec
-- kwaba_app : lire et écrire des lignes, rien d'autre (ni créer, ni modifier, ni supprimer une table, ni créer de
-- rôle). Si l'API est compromise, l'attaquant ne peut ni détruire le schéma ni s'octroyer d'autres droits.
--
-- À exécuter une fois, connecté avec le rôle propriétaire de la base :
--   psql "$DATABASE_URL_PROPRIETAIRE" -v mot_de_passe="'<mot de passe long et aléatoire>'" -f deploy/postgres/roles.sql
-- Puis :
--   - services web / workers : POSTGRES_USER=kwaba_app et ce mot de passe ;
--   - job de migration (manage.py migrate) : identifiants du rôle propriétaire, qui crée les nouvelles tables
--     (les droits par défaut ci-dessous les ouvrent automatiquement à kwaba_app).

\set ON_ERROR_STOP on

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'kwaba_app') THEN
        CREATE ROLE kwaba_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
    END IF;
END $$;

ALTER ROLE kwaba_app WITH PASSWORD :mot_de_passe;
-- Une requête bloquée ne doit pas tenir des verrous indéfiniment
ALTER ROLE kwaba_app SET statement_timeout = '30s';
ALTER ROLE kwaba_app SET idle_in_transaction_session_timeout = '60s';

-- Personne d'autre que le propriétaire ne crée d'objet dans le schéma public
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO kwaba_app;
SELECT format('GRANT CONNECT ON DATABASE %I TO kwaba_app', current_database()) \gexec

-- Tables et séquences existantes
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO kwaba_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO kwaba_app;

-- Tables et séquences créées plus tard par les migrations (lancées avec le rôle propriétaire)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO kwaba_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO kwaba_app;

-- Journal d'audit : l'application ajoute des lignes mais ne peut ni les modifier ni les effacer
REVOKE UPDATE, DELETE ON securite_journal_audit FROM kwaba_app;

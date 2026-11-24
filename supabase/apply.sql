-- Fresh database only: base migrations run once; discovery metadata can rerun alone.
-- SQL Editor users run migration files individually, in filename order.
\set ON_ERROR_STOP on
\ir migrations/202611110001_integrity.sql
\ir migrations/202611110002_access.sql
\ir migrations/202611110003_moderation.sql
\ir migrations/202611110004_queries.sql
\ir migrations/202611210001_discovery_metadata.sql
\ir migrations/202611210002_ingredient_dictionary.sql
\ir migrations/202611220001_dish_matching.sql
\ir migrations/202611230001_service_role_grants.sql

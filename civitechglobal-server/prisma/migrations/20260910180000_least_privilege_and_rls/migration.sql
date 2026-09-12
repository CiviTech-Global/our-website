-- Least-privilege database roles, and row-level security as defence in depth.
--
-- WHAT THIS BUYS, PRECISELY
--
-- The API currently connects as the database owner, which can drop tables,
-- read every schema and disable any protection below. That is more authority
-- than the application ever needs, and a leaked connection string or an
-- injection that escapes Prisma's parameterisation inherits all of it.
--
--   civitech_app       DML only. No DDL, no ownership, no TRUNCATE, no CREATE
--                      on the schema. Cannot drop a table or disable RLS.
--   civitech_readonly  SELECT, and only on tables a reporting tool has any
--                      business reading. Never CVs, attachments, tokens or
--                      the users table.
--
-- Row-level security is ENABLED but not FORCED. Enabled means a role with no
-- policy sees no rows even if somebody grants it SELECT, so adding a new
-- consumer has to be a deliberate, reviewed act rather than one GRANT. Not
-- forced means the owner still bypasses it, which is what keeps migrations and
-- the seed working.
--
-- What RLS does NOT do here is stop an injection on the application's own
-- connection — that connection legitimately holds the app policy. Prisma's
-- parameterised queries and the privilege split above are what address that.
-- Writing this down so nobody mistakes the control for one it is not.
--
-- Roles are created NOLOGIN and passwordless. Ansible sets a password out of
-- band; a credential in a committed migration is not a credential.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'civitech_app') THEN
    CREATE ROLE civitech_app NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'civitech_readonly') THEN
    CREATE ROLE civitech_readonly NOLOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO civitech_app, civitech_readonly;

-- Deliberately no CREATE: the application must not be able to add or alter
-- objects in the schema it runs against.
REVOKE CREATE ON SCHEMA public FROM civitech_app, civitech_readonly;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO civitech_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO civitech_app;

-- Tables created by a later migration inherit the same grants, so a new model
-- does not silently arrive without them.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO civitech_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO civitech_app;

-- Reporting reads the catalog and the pipeline, never the people.
GRANT SELECT ON
  insurance_categories, insurance_products, insurance_subcategories,
  insurance_requests, project_requests, project_proposals, contact_messages
TO civitech_readonly;

-- Enable RLS everywhere, then give the application role a policy on each. A
-- table with RLS on and no policy for your role returns nothing.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'admin_roles', 'client_identities', 'contact_messages',
    'insurance_categories', 'insurance_products', 'insurance_subcategories',
    'insurance_requests', 'project_attachments', 'project_proposals',
    'project_requests', 'refresh_tokens', 'resume_submissions',
    'user_tokens', 'users'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format(
      'CREATE POLICY app_full_access ON %I FOR ALL TO civitech_app USING (true) WITH CHECK (true)', t
    );
  END LOOP;
END
$$;

-- Read-only policies exist only for the tables granted above; everything else
-- stays invisible to that role even if a GRANT is added later by mistake.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'insurance_categories', 'insurance_products', 'insurance_subcategories',
    'insurance_requests', 'project_requests', 'project_proposals', 'contact_messages'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY readonly_select ON %I FOR SELECT TO civitech_readonly USING (true)', t
    );
  END LOOP;
END
$$;

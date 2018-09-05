-- Load views (excluding materialized views).
--
-- Parameters:
-- whitelist: array or comma-delimited string of LIKE conditions applied to
--   tables. If specified, overrides all other parameters.
-- allowedSchemas: array or comma-delimited string of LIKE conditions applied
--   to schemas.
-- blacklist: array or comma-delimited string of LIKE conditions applied
--   negatively to tables.
-- exceptions: array or comma-delimited string of LIKE conditions which
--   override blacklisted tables.

SELECT * FROM (
  SELECT
    v.schemaname AS schema,
    v.viewname AS name,
    array_agg(DISTINCT c.attname::text) AS columns,
    pg_relation_is_updatable(cls.oid::regclass, true) & 8 >= 8 AS is_insertable_into,
    FALSE AS is_matview
  FROM pg_views v
  JOIN pg_catalog.pg_namespace nsp
    ON nsp.nspname = v.schemaname
  JOIN pg_catalog.pg_class cls
    ON cls.relnamespace = nsp.oid
    AND cls.relname = v.viewname
  JOIN pg_catalog.pg_attribute c
    ON c.attrelid = cls.oid
    AND c.attnum > 0
  WHERE schemaname <> 'pg_catalog' AND schemaname <> 'information_schema'
  GROUP BY v.schemaname, v.viewname, cls.oid
) views
WHERE CASE
  WHEN $(whitelist) <> '' THEN
    -- whitelist specific tables, with fully-qualified name (no schema assumes public).
    replace((views.schema || '.'|| views.name), 'public.', '') LIKE ANY(string_to_array(replace($(whitelist), ' ', ''), ','))
  WHEN $(allowedSchemas) <> '' OR $(blacklist) <> '' THEN ((
    $(allowedSchemas) = ''
    OR
    -- allow specific schemas (none or '' assumes all):
    schema = ANY(string_to_array(replace($(allowedSchemas), ' ', ''), ','))
  ) AND (
    $(blacklist) = ''
    OR
    -- blacklist tables using LIKE by fully-qualified name (no schema assumes public):
    replace((schema || '.'|| name), 'public.', '') NOT LIKE ALL(string_to_array(replace($(blacklist), ' ', ''), ','))
  )) OR
    -- make exceptions for specific tables, with fully-qualified name or wildcard pattern (no schema assumes public).
    replace((schema || '.'|| name), 'public.', '') LIKE ANY(string_to_array(replace($(exceptions), ' ', ''), ','))
  ELSE TRUE
END;

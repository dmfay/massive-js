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
  SELECT schemaname AS schema, viewname AS name
  FROM pg_views
  WHERE schemaname <> 'pg_catalog' AND schemaname <> 'information_schema'
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

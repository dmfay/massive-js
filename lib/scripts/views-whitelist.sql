-- REQUIRES ONE ARGUMENT:
-- $1 must be empty string, or comma-delimited string, or array of string as schema names to INCLUDE.
SELECT * FROM (
  SELECT schemaname AS schema, viewname AS name
  FROM pg_views
  WHERE schemaname <> 'pg_catalog' AND schemaname <> 'information_schema'
  UNION
  SELECT schemaname AS schema, matviewname AS name
  FROM pg_matviews
) v
WHERE (
  -- whitelist specific tables, with fully-qualified name (no schema assumes public).
  CASE WHEN $1 = '' THEN 1=1
  ELSE replace((v.schema || '.'|| v.name), 'public.', '') LIKE ANY(string_to_array(replace($1, ' ', ''), ','))
  END
)
ORDER BY v.schema, v.name;

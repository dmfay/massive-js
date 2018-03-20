-- Load non-system functions. The whitelist and blacklist are overlapped such
-- that more specific blacklist entries may override more general whitelist
-- entries.
--
-- Parameters:
-- functionWhitelist: array or comma-delimited string of LIKE conditions.
-- functionBlacklist: array or comma-delimited string of LIKE conditions.

SELECT * FROM (
  SELECT DISTINCT
    n.nspname AS schema,
    (NOT p.proretset) AS "singleRow",
    (t.typtype IN ('b', 'd', 'e', 'r')) AS "singleValue",
    p.proname AS name,
    p.pronargs AS "paramCount",
    p.provariadic AS "isVariadic"
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  JOIN pg_type t on p.prorettype = t.oid
  WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
) fns
WHERE CASE
  WHEN $(functionWhitelist) <> '' THEN
    -- whitelist specific functions, with fully-qualified name (no schema assumes public).
    replace((fns.schema || '.'|| fns.name), 'public.', '') LIKE ANY(string_to_array(replace($(functionWhitelist), ' ', ''), ','))
  WHEN $(allowedSchemas) <> '' OR $(functionBlacklist) <> '' THEN ((
    $(allowedSchemas) = ''
    OR
    -- allow specific schemas (none or '' assumes all):
    schema = ANY(string_to_array(replace($(allowedSchemas), ' ', ''), ','))
  ) AND (
    $(functionBlacklist) = ''
    OR
    -- blacklist tables using LIKE by fully-qualified name (no schema assumes public):
    replace((schema || '.'|| name), 'public.', '') NOT LIKE ALL(string_to_array(replace($(functionBlacklist), ' ', ''), ','))
  )) OR
    -- make exceptions for specific functions, with fully-qualified name or wildcard pattern (no schema assumes public).
    replace((schema || '.'|| name), 'public.', '') LIKE ANY(string_to_array(replace($(exceptions), ' ', ''), ','))
  ELSE TRUE
END
ORDER BY schema, name;

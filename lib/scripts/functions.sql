-- Load non-system functions. The whitelist and blacklist are overlapped such
-- that more specific blacklist entries may override more general whitelist
-- entries.
--
-- Parameters:
-- functionWhitelist: array or comma-delimited string of LIKE conditions.
-- functionBlacklist: array or comma-delimited string of LIKE conditions.

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
  AND n.nspname NOT LIKE 'pgp%'
  AND (
    -- blacklist functions using LIKE by fully-qualified name (no schema assumes public):
    $(functionBlacklist) = ''
    OR
    replace((n.nspname || '.'|| p.proname), 'public.', '') NOT LIKE ALL(string_to_array(replace($(functionBlacklist), ' ', ''), ','))
  ) AND (
    -- whitelist functions using LIKE by fully-qualified name (no schema assumes public):
    $(functionWhitelist) = ''
    OR
    replace((n.nspname || '.'|| p.proname), 'public.', '') LIKE ANY(string_to_array(replace($(functionWhitelist), ' ', ''), ','))
  )
ORDER BY n.nspname, p.proname;

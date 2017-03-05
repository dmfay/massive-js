-- Include and/or exclude functions with a name matching the string pattern passed in (i.e. "pg_%")
-- inclusion/exclusion is schema - aspecific, no schema assumes 'public'
SELECT DISTINCT
  n.nspname AS schema,
  (NOT p.proretset) AS return_single_row,
  (t.typtype IN ('b', 'd', 'e', 'r')) AS return_single_value,
  p.proname AS name,
  p.pronargs AS param_count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_type t on p.prorettype = t.oid
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND n.nspname NOT LIKE 'pgp%'
  AND (-- blacklist functions using LIKE by fully-qualified name (no schema assumes public):
    CASE WHEN $1 = '' THEN 1=1
    ELSE replace((n.nspname || '.'|| p.proname), 'public.', '') NOT LIKE ALL(string_to_array(replace($1, ' ', ''), ','))
    END
  ) AND (-- whitelist functions using LIKE by fully-qualified name (no schema assumes public):
    CASE WHEN $2 = '' THEN 1=1
    ELSE replace((n.nspname || '.'|| p.proname), 'public.', '') LIKE ANY(string_to_array(replace($2, ' ', ''), ','))
    END
  )
ORDER BY n.nspname, p.proname;

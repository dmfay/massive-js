-- REQUIRES THREE ARGUMENTS:
-- $1, $2, $2 all must be empty string, or comma-delimited string, or array of string:
SELECT * FROM (
  SELECT schemaname AS schema, viewname AS name
  FROM pg_views
  WHERE schemaname <> 'pg_catalog' AND schemaname <> 'information_schema'
  UNION
  SELECT schemaname AS schema, matviewname AS name
  FROM pg_matviews
) v WHERE ((
    -- allow specific schemas (none or '' assumes all):
    CASE WHEN $1 ='' THEN 1=1
    ELSE schema = ANY(string_to_array(replace($1, ' ', ''), ','))
    END
  ) AND (
    -- blacklist tables using LIKE by fully-qualified name (no schema assumes public):
    CASE WHEN $2 = '' THEN 1=1
    ELSE replace((schema || '.'|| name), 'public.', '') NOT LIKE ALL(string_to_array(replace($2, ' ', ''), ','))
    END
  )
) OR (-- make exceptions for specific tables, with fully-qualified name or wildcard pattern (no schema assumes public).
  CASE WHEN $3 = '' THEN 1=0
  ELSE replace((schema || '.'|| name), 'public.', '') LIKE ANY(string_to_array(replace($3, ' ', ''), ','))
  END
);

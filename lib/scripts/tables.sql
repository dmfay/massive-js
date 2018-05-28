-- Load tables.
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
  SELECT t.table_schema AS schema,
    t.table_name AS name,
    parent.relname AS parent,
    array_agg(DISTINCT kc.column_name::text) FILTER (WHERE kc.column_name IS NOT NULL) AS pk,
    array_agg(DISTINCT c.column_name::text) AS columns,
    TRUE AS is_insertable_into
  FROM information_schema.tables t
  LEFT OUTER JOIN information_schema.table_constraints tc
    ON tc.table_schema = t.table_schema
    AND tc.table_name = t.table_name
    AND tc.constraint_type = 'PRIMARY KEY'
  LEFT OUTER JOIN information_schema.key_column_usage kc
    ON kc.constraint_schema = tc.table_schema
    AND kc.table_name = tc.table_name
    AND kc.constraint_name = tc.constraint_name
  JOIN information_schema.columns c
    ON c.table_schema = t.table_schema
    AND c.table_name = t.table_name
  JOIN pg_catalog.pg_namespace nsp
    ON nsp.nspname = t.table_schema
  JOIN pg_catalog.pg_class cls
    ON cls.relnamespace = nsp.oid
    AND cls.relname = t.table_name

  -- get parent table if there is one
  LEFT OUTER JOIN pg_catalog.pg_inherits inh ON inh.inhrelid = cls.oid
  LEFT OUTER JOIN pg_catalog.pg_class AS parent ON inh.inhparent = parent.oid
  LEFT OUTER JOIN pg_catalog.pg_namespace AS parentschema
    ON parentschema.oid = parent.relnamespace

  WHERE t.table_schema NOT IN ('information_schema', 'pg_catalog')
    AND t.table_type NOT IN ('VIEW', 'FOREIGN TABLE')
  GROUP BY t.table_schema, t.table_name, parent.relname

  UNION

  SELECT t.table_schema AS schema,
    t.table_name AS name,
    NULL AS parent,
    NULL AS pk,
    array_agg(c.column_name::text) AS columns,
    CASE t.is_insertable_into WHEN 'YES' THEN TRUE ELSE FALSE END AS is_insertable_into
  FROM information_schema.tables t
  JOIN information_schema.columns c
    ON c.table_schema = t.table_schema
    AND c.table_name = t.table_name
  WHERE t.table_type = 'FOREIGN TABLE'
  GROUP BY t.table_schema, t.table_name, t.is_insertable_into
) tables
WHERE CASE
  WHEN $(whitelist) <> '' THEN
    -- whitelist specific tables, with fully-qualified name (no schema assumes public).
    replace((tables.schema || '.'|| tables.name), 'public.', '') LIKE ANY(string_to_array(replace($(whitelist), ' ', ''), ','))
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

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
  SELECT tc.table_schema AS schema,
    tc.table_name AS name,
    NULL AS parent,
    kc.column_name AS pk,
    TRUE AS is_insertable_into,
    array_agg(c.column_name::text) AS columns
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kc
    ON kc.constraint_schema = tc.table_schema
    AND kc.table_name = tc.table_name
    AND kc.constraint_name = tc.constraint_name
  JOIN information_schema.columns c
    ON c.table_schema = tc.table_schema
    AND c.table_name = tc.table_name
  WHERE tc.constraint_type = 'PRIMARY KEY'
  GROUP BY tc.table_schema, tc.table_name, kc.column_name

  UNION

  SELECT tc.table_schema AS schema,
    child.relname AS name,
    parent.relname AS parent,
    kc.column_name AS pk,
    TRUE AS is_insertable_into,
    array_agg(c.column_name::text) AS columns
  FROM pg_catalog.pg_inherits
  JOIN pg_catalog.pg_class AS child ON (inhrelid = child.oid)
  JOIN pg_catalog.pg_class AS parent ON (inhparent = parent.oid)
  JOIN information_schema.table_constraints tc ON tc.table_name = parent.relname
  JOIN information_schema.key_column_usage kc
    ON kc.constraint_schema = tc.table_schema
    AND kc.table_name = tc.table_name
    AND kc.constraint_name = tc.constraint_name
  JOIN information_schema.columns c
    ON c.table_schema = tc.table_schema
    AND c.table_name = tc.table_name
  WHERE tc.constraint_type = 'PRIMARY KEY'
  GROUP BY tc.table_schema, child.relname, parent.relname, kc.column_name

  UNION

  SELECT t.table_schema AS schema,
    t.table_name AS name,
    NULL AS parent,
    NULL AS pk,
    CASE t.is_insertable_into WHEN 'YES' THEN TRUE ELSE FALSE END AS is_insertable_into,
    array_agg(c.column_name::text) AS columns
  FROM information_schema.tables t
  JOIN information_schema.columns c
    ON c.table_schema = t.table_schema
    AND c.table_name = t.table_name
  WHERE table_type = 'FOREIGN TABLE'
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

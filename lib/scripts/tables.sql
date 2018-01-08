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
    array_agg(DISTINCT kc.column_name::text) AS pk,
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
  GROUP BY tc.table_schema, tc.table_name

  UNION

  SELECT ctc.table_schema AS schema,
    child.relname AS name,
    parent.relname AS parent,
    array_agg(DISTINCT kc.column_name::text) AS pk,
    TRUE AS is_insertable_into,
    array_agg(c.column_name::text) AS columns
  FROM pg_catalog.pg_inherits

  -- child table schema+name
  JOIN pg_catalog.pg_class AS child ON inhrelid = child.oid
  JOIN pg_catalog.pg_namespace AS childschema
    ON childschema.oid = child.relnamespace

  -- parent table schema+name
  JOIN pg_catalog.pg_class AS parent ON inhparent = parent.oid
  JOIN pg_catalog.pg_namespace AS parentschema
    ON parentschema.oid = parent.relnamespace

  -- pk info from parent
  JOIN information_schema.table_constraints ptc
    ON ptc.table_schema = parentschema.nspname
    AND ptc.table_name = parent.relname
  JOIN information_schema.key_column_usage kc
    ON kc.constraint_schema = ptc.table_schema
    AND kc.table_name = ptc.table_name
    AND kc.constraint_name = ptc.constraint_name

  -- column info from child
  JOIN information_schema.table_constraints ctc
    ON ctc.table_schema = childschema.nspname
    AND ctc.table_name = child.relname
  JOIN information_schema.columns c
    ON c.table_schema = ctc.table_schema
    AND c.table_name = ctc.table_name

  -- filter foreign tables
  JOIN information_schema.tables t
    ON t.table_schema = childschema.nspname
    AND t.table_name = child.relname

  WHERE ptc.constraint_type = 'PRIMARY KEY'
    AND t.table_type <> 'FOREIGN TABLE'
  GROUP BY ctc.table_schema, child.relname, parent.relname

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

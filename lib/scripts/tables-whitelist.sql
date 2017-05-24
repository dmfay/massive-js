-- REQUIRES ONE ARGUMENT:
-- $1 must be empty string, or comma-delimited string, or array of string as schema names to INCLUDE.
SELECT tc.table_schema AS schema, tc.table_name AS name, kc.column_name AS pk
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kc
    ON kc.table_name = tc.table_name AND
       kc.constraint_schema = tc.table_schema AND
       kc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND (
    -- whitelist specific tables, with fully-qualified name (no schema assumes public).
    CASE WHEN $1 = '' THEN 1=1
    ELSE replace((tc.table_schema || '.'|| tc.table_name), 'public.', '') LIKE ANY(string_to_array(replace($1, ' ', ''), ','))
    END
  )
ORDER BY tc.table_schema, tc.table_name, kc.position_in_unique_constraint;

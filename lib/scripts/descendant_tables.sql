-- REQUIRES THREE ARGUMENTS:
-- $1, $2, $2 all must be empty string, or comma-delimited string, or array of string:
SELECT c.relname AS child, p.relname AS parent, tc.table_schema as schema
FROM pg_catalog.pg_inherits
    JOIN pg_catalog.pg_class AS c ON (inhrelid = c.oid)
    JOIN pg_catalog.pg_class AS p ON (inhparent = p.oid)
    JOIN information_schema.tables tc ON c.relname = tc.table_name
WHERE
    ((case -- allow specific schemas (none or '' assumes all):
      when $1 ='' then 1=1
      else tc.table_schema = any(string_to_array(replace($1, ' ', ''), ',')) end)
    and
    (case -- blacklist tables using LIKE by fully-qualified name (no schema assumes public):
      when $2 = '' then 1=1
      else replace((tc.table_schema || '.'|| tc.table_name), 'public.', '') not like all(string_to_array(replace($2, ' ', ''), ',')) end))
    or
    (case -- make exceptions for specific tables, with fully-qualified name or wildcard pattern (no schema assumes public).
      when $3 = '' then 1=0
      -- Below can use '%' as wildcard. Change 'like' to '=' to require exact names:
      else replace((tc.table_schema || '.'|| tc.table_name), 'public.', '') like any(string_to_array(replace($3, ' ', ''), ',')) end)
;

-- REQUIRES THREE ARGUMENTS:
-- $1, $2, $2 all must be empty string, or comma-delimited string, or array of string: 
select v.table_schema as schema, v.table_name as name
from information_schema.views v
where v.table_schema <> 'pg_catalog' and v.table_schema <> 'information_schema' and (
      (case -- allow specific schemas (none or '' assumes all):
        when $1 ='' then 1=1 
        else v.table_schema = any(string_to_array(replace($1, ' ', ''), ',')) end)
      and
      (case -- blacklist tables using LIKE by fully-qualified name (no schema assumes public):
        when $2 = '' then 1=1 
        else replace((v.table_schema || '.'|| v.table_name), 'public.', '') not like all(string_to_array(replace($2, ' ', ''), ',')) end)
    ) or (
      case -- make exceptions for specific tables, with fully-qualified name or wildcard pattern (no schema assumes public). 
        when $3 = '' then 1=0
        -- Below can use '%' as wildcard. Change 'like' to '=' to require exact names: 
        else replace((v.table_schema || '.'|| v.table_name), 'public.', '') like any(string_to_array(replace($3, ' ', ''), ',')) end
    )
order by v.table_schema,
         v.table_name;
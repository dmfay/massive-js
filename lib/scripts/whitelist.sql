-- REQUIRES ONE ARGUMENT:
-- $1 must be empty string, or comma-delimited string, or array of string as schema names to INCLUDE. 
select tc.table_schema as schema, tc.table_name as name, kc.column_name as pk
from 
    information_schema.table_constraints tc
    join information_schema.key_column_usage kc 
        on kc.table_name = tc.table_name and
           kc.constraint_schema = tc.table_schema and
           kc.constraint_name = tc.constraint_name 
where 
    tc.constraint_type = 'PRIMARY KEY'
    and 
    (case -- whitelist specific tables, with fully-qualified name (no schema assumes public). 
      when $1 = '' then 1=1
      -- Below can use '%' as wildcard. Change '=' to 'like' to allow patterns rather then exact names: 
      else replace((tc.table_schema || '.'|| tc.table_name), 'public.', '') = any(string_to_array(replace($1, ' ', ''), ',')) end)
order by tc.table_schema,
         tc.table_name,
         kc.position_in_unique_constraint;
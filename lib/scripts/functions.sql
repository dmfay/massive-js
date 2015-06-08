-- Exclude functions with a name matching the string pattern passed in (i.e. "pg_%")
-- exclusion is schema - aspecific, no schema assumes 'public'
select routines.routine_schema as "schema", 
  routines.routine_name as "name", routines.data_type,
  (
    select count(1) from information_schema.parameters 
    where routines.specific_name=parameters.specific_name
      and parameter_mode = 'IN'
  ) as param_count
from information_schema.routines
where routines."routine_schema" not in ('pg_catalog','information_schema')
  and routines.routine_name not like 'pgp%'
  and
  (case -- blacklist functions using LIKE by fully-qualified name (no schema assumes public):
    when $1 = '' 
    then 1=1 
    else replace((routines.routine_schema || '.'|| routines.routine_name), 'public.', '')  not like all(string_to_array(replace($1, ' ', ''), ',')) end)
order by routine_name;
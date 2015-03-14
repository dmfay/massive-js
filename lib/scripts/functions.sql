SELECT routines.routine_schema as "schema", 
routines.routine_name as "name", routines.data_type,
(
  select count(1) from information_schema.parameters 
  where routines.specific_name=parameters.specific_name
    and parameter_mode = 'IN'
) as param_count
FROM information_schema.routines
WHERE routines."routine_schema" NOT IN('pg_catalog','information_schema')
AND routines.routine_name NOT LIKE 'pgp%'
order by routine_name
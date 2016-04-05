select routines.routine_schema as "schema",
  routines.routine_name as "name", routines.data_type,
  (
    select count(1) from information_schema.parameters
    where routines.specific_name = parameters.specific_name
      and parameter_mode = 'IN'
  ) as param_count
from information_schema.routines
where routines.routine_schema not in ('pg_catalog','information_schema')
   -- includes
  and (case
      when routines.routine_schema = 'public'
        then routines.routine_name
        else routines.routine_schema || '.' || routines.routine_name
    end) like all($1::text[])

   -- excludes
  and (case
      when routines.routine_schema = 'public'
        then routines.routine_name
        else routines.routine_schema || '.' || routines.routine_name
    end) not like all($2::text[])

	-- schema
	and routines.routine_schema like some($3::text[])

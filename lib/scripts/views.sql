select * from (
  select schemaname as schema, viewname as name
  from pg_views
  where schemaname not in ('pg_catalog', 'information_schema')
  union
  select schemaname as schema, matviewname as name
  from pg_matviews
 ) v
 where
  -- includes
  (case
      when v.schema = 'public'
        then v.name
        else v.schema || '.' || v.name
    end) like all($1::text[])

   -- excludes
  and (case
     when v.schema = 'public'
        then v.name
        else v.schema || '.' || v.name
    end) not like all($2::text[])

	-- schema
	and v.schema like some($3::text[])

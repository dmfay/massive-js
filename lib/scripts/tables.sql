select schema, name, array_agg(pk::text) as pk from (
	select
	  tc.table_schema as schema,
	  tc.table_name as name,
	  kc.column_name as pk
	from
	  information_schema.table_constraints tc
	    join information_schema.key_column_usage kc
	      on kc.table_name = tc.table_name and
	      kc.constraint_schema = tc.table_schema and
	      kc.constraint_name = tc.constraint_name
	where
	  tc.constraint_type = 'PRIMARY KEY'
	   -- includes
	  and (case
	      when tc.table_schema = 'public'
		then tc.table_name
		else tc.table_schema || '.' || tc.table_name
	    end) like all($1::text[])

	   -- excludes
	  and (case
	      when tc.table_schema = 'public'
		then tc.table_name
		else tc.table_schema || '.' || tc.table_name
	    end) not like all($2::text[])

		-- schema
		and tc.table_schema like some($3::text[])
	order by tc.table_schema,
	    tc.table_name,
	    kc.position_in_unique_constraint
	    ) t
group by schema, name

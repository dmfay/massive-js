SELECT t.typname AS name, array_agg(e.enumlabel)::TEXT[] AS enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
GROUP BY t.typname;

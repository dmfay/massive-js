SELECT nspname,proname, proargnames,proargmodes
FROM    pg_catalog.pg_namespace n
JOIN    pg_catalog.pg_proc p
ON      p.pronamespace = n.oid
where nspname in('public')
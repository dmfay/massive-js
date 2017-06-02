-- this is a sql script with a comment
select field from (values ('one'), ('two')) fields (field) -- where field = $1;

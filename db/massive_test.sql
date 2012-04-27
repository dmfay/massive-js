
-- in the terminal (assuming you have PostGres installed)...
-- createdb massive_test
-- psql massive_test
-- (run the command below)

drop table products;
create table products (id serial,name varchar(255), price decimal(8,2));
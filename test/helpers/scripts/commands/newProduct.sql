BEGIN;
insert into products(name, price, description, in_stock)
values ($1, $2, $3, $4);
END;
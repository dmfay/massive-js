CREATE SCHEMA public;

CREATE SEQUENCE one_counter;
CREATE SEQUENCE another_counter;

CREATE TABLE a_table (
  id SERIAL NOT NULL PRIMARY KEY,
  val TEXT,
  counter INT NOT NULL DEFAULT nextval('one_counter')
);

INSERT INTO a_table (val) VALUES ('one'), ('two'), ('three');

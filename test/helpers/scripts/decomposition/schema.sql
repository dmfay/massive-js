CREATE SCHEMA public;

CREATE TABLE users (
  id serial primary key,
  username text
);

CREATE TABLE tests (
  id serial primary key,
  user_id int,
  name text
);

CREATE TABLE issues (
  id serial primary key,
  test_id int,
  description text
);

ALTER TABLE tests ADD FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE issues ADD FOREIGN KEY (test_id) REFERENCES tests(id);

INSERT INTO users (username) VALUES ('alice'), ('bob'), ('carol');
INSERT INTO tests (user_id, name) VALUES
  (1, 'alice''s test'),
  (3, 'carol''s first test'),
  (3, 'carol''s second test');
INSERT INTO issues (test_id, description) VALUES
  (1, 'alice''s issue'),
  (3, 'carol''s issue');

CREATE VIEW everything AS
SELECT u.id as user_id, u.username, t.id as test_id, t.name, i.id, i.description
FROM users u
LEFT OUTER JOIN tests t ON t.user_id = u.id
LEFT OUTER JOIN issues i ON i.test_id = t.id;

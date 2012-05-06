PG_TESTS = test/pg*_spec.coffee
MYSQL_TESTS = test/mysql*_spec.coffee

test: test-pg test-mysql

test-pg:
	@./node_modules/.bin/mocha $(PG_TESTS)

test-mysql:
	@./node_modules/.bin/mocha $(MYSQL_TESTS)

setup-pg:
	@coffee test/pg_helper.coffee setup

setup-mysql:
	@coffee test/mysql_helper.coffee setup

.PHONY: test pg mysql setup-pg setup-mysql
'use strict';

/**
 * Collapses tabular result sets into a (hierarchical) object graph based on
 * column nomenclature. Given a query that selects parent and child columns as
 * parent__id, parent__val, children__id, children__val, this will return an
 * array of objects in the form
 *
 * {id: 1, val: 'parent val', children: [{id: 11, val: 'child val'}]}
 *
 * and so on.
 *
 * The optional options parameter may be an object with properties of the same
 * name as any child entities (so 'children' in the example query above). Each
 * child property defines behavior for the matching entity.
 *
 * If the options for 'children' contain {single: true} then children will be
 * a single object rather than an array.
 *
 * If the options for 'children' contain {pk: 'my_id'} then the primary key of
 * rows in children will be defined as my_id for purposes of filtering
 * duplicates; otherwise, the primary key name will be assumed to be the same
 * as the 'pk' parameter.
 *
 * Sample options object:
 * {1to1child: {single: true}, custompkchild: {pk: 'my_id'}}
 *
 * @param  {[type]} parent  Name of the parent entity, the first part of parent__id.
 * @param  {[type]} pk      Name of the parent primary key field, also applied to children unless overridden.
 * @param  {[type]} options Options defining special behavior (see above).
 * @param  {[type]} data    Data to operate on.
 * @return {[type]}         Transformed object graph.
 */
exports = module.exports = function (parent, pk, options, data) {
	if (data === undefined) {
		data = options;
		options = {};
	}

	if (!data || data.length === 0) {
		return [];
	}

	/* schemata defines the structural relationships of the entity-models and the fields each model consists of, and maps
	 * the final field names to the original columns in the query resultset.
	 * example: {id: parent__id, name: parent__name, children: {id: children__id, name: children__name}} */
	var schemata = Object.keys(data[0]).reduce(function (acc, c) {
		var tuple = c.split('__');
		var entity = acc;
		var name;

		do {
			name = tuple.shift();

			if (name !== parent) {	// avoid creating a parent schema, we want that to be the root
									// this almost certainly does Bad things if the graph is cyclic
									// but fortunately we don't need to worry about that since the
									// column name format can't define a backwards relationship
				if (!entity.hasOwnProperty(name)) {
					entity[name] = {};
				}

				entity = entity[name];
			}
		} while (tuple.length > 1);	// walk as deep as we need to for child__grandchild__greatgrandchild__fieldname etc

		entity[tuple.pop()] = c;	// set {fieldname: path__to__fieldname} pair

		return acc;
	}, {});

	/* mapping is a nested dictionary of id:entity but otherwise in the form of the final structure we're trying to build,
	 * effectively hashing ids to ensure we don't duplicate any entities in cases where multiple dependent tables are
	 * joined into the source query.
	 *
	 * example: {1: {id: 1, name: 'hi', children: {111: {id: 111, name: 'ih'}}} */
	var mapping = data.reduce(function (acc, row) {
		return (function build (obj, schema, parents, name) {
			var opts = options[name] || {};
			var pkField = name + '__' + (opts.pk || pk);

			if (parents.length) {
				pkField = parents.join('__') + '__' + pkField;	// anything deeper than child__id needs to build the full column name
			}

			var id = row[pkField];

			if (id === null) {						// null id means this entity doesn't exist and was likely outer joined in
				return;
			} else if (!obj.hasOwnProperty(id)) {	// this entity is new
				obj[id] = {};
			}

			Object.keys(schema).forEach(function (c) {
				if (typeof schema[c] === 'string') {	// c is a field
					obj[id][c] = row[schema[c]];
				} else {								// c is a relation
					if (!obj[id].hasOwnProperty(c)) {
						obj[id][c] = {};				// current object does not have relation defined, initialize it
					}

					// if parent isn't the root schema include that when we recurse, otherwise ignore
					build(obj[id][c], schema[c], (name !== parent) ? parents.concat([name]): parents, c);
				}
			});

			return obj;
		})(acc, schemata, [], parent);
	}, {});

	/* Build the final graph. The structure and data already exists in mapping, but we need to transform the {id: entity} structures
	 * into arrays of entities (or flat objects if required).
	 *
	 * example: [{id: 1, name: 'hi', children: [{id: 111, name: 'ih'}]}] */
	return (function transform(schema, map, accumulator) {
		// for every id:entity pair in the current level of mapping, if the schema defines any dependent
		// entities recurse and transform them, then push the current object into the accumulator and return
		return Object.keys(map).reduce(function (acc, k) {
			Object.keys(schema)
				.filter(function (c) { return typeof schema[c] === 'object'; })	// just structure now
				.forEach(function (c) {
					// we have to init & pass the accumulator into the *next* recursion since the single
					// option is defined on the child rather than the parent
					var accumulator = options[c] && options[c].single ? {} : [];
					map[k][c] = transform(schema[c], map[k][c], accumulator);

					if (options[c] && options[c].sort) {
						var sort = options[c].sort;

						map[k][c].sort(function (a, b) {
							if (a[sort] > b[sort]) { return 1; }
							else if (a[sort] < b[sort]) { return -1; }

							return 0;
						});
					}
				});

			if (Array.isArray(accumulator)) { acc.push(map[k]); }
			else { acc = map[k]; }

			return acc;
		}, []);
	})(schemata, mapping, []);
};
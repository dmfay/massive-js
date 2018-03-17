'use strict';

const assert = require('chai').assert;
const decompose = require('../../lib/util/decompose');

describe('decompose', function () {
  it('should return empty if given empty data and schema', function () {
    assert.deepEqual([], decompose({}, []));
  });

  it('should return empty if given empty data and non-empty schema', function () {
    assert.deepEqual([], decompose({
      pk: 'id',
      columns: {field: 'field'}
    }, []));
  });

  it('should throw if it finds a null root pk', function () {
    assert.throws(() => decompose({
      pk: 'parent_id',
      columns: {parent_id: 'id', parent_val: 'val'},
      children: {
        pk: 'children_id',
        columns: {children_id: 'id', children_val: 'val'},
        array: true
      }
    }, [
      {parent_id: 1, parent_val: 'p1', children_id: 11, children_val: 'c1'},
      {parent_id: null, parent_val: null, children_id: null, children_val: null}
    ]));
  });

  it('should collapse simple tree structures', function () {
    const data = decompose({
      pk: 'parent_id',
      columns: {parent_id: 'id', parent_val: 'val'},
      children: {
        pk: 'children_id',
        columns: {children_id: 'id', children_val: 'val'},
        array: true
      }
    }, [
      {parent_id: 1, parent_val: 'p1', children_id: 11, children_val: 'c1'},
      {parent_id: 1, parent_val: 'p1', children_id: 12, children_val: 'c2'}
    ]);

    assert.deepEqual(data, [{id: 1, val: 'p1', children: [{id: 11, val: 'c1'}, {id: 12, val: 'c2'}]}]);
  });

  it('should handle objects', function () {
    const data = decompose({
      pk: 'parent_id',
      columns: {parent_id: 'id', parent_val: 'val'},
      children: {
        pk: 'children_id',
        columns: {children_id: 'id', children_val: 'val'},
        array: true // force an array even though this can only ever be a flat row
      }
    }, {parent_id: 1, parent_val: 'p1', children_id: 11, children_val: 'c1'});

    assert.deepEqual(data, [{id: 1, val: 'p1', children: [{id: 11, val: 'c1'}]}]);
  });

  it('can use arrays of column names if no mapping is needed', function () {
    const data = decompose({
      pk: 'parent_id',
      columns: ['parent_id', 'parent_val'],
      children: {
        pk: 'children_id',
        columns: ['children_id', 'children_val'],
        array: true
      }
    }, [
      {parent_id: 1, parent_val: 'p1', children_id: 11, children_val: 'c1'},
      {parent_id: 1, parent_val: 'p1', children_id: 12, children_val: 'c2'}
    ]);

    assert.deepEqual(data, [{parent_id: 1, parent_val: 'p1', children: [{children_id: 11, children_val: 'c1'}, {children_id: 12, children_val: 'c2'}]}]);
  });

  it.skip('sorts children based on the order in which rows appear', function () {
    let data = decompose({
      pk: 'parent_id',
      columns: {parent_id: 'id', parent_val: 'val'},
      children: {
        pk: 'children_id',
        columns: {children_id: 'id', children_val: 'val'},
        array: true
      }
    }, [
      {parent_id: 1, parent_val: 'p1', children_id: 11, children_val: 'c2'},
      {parent_id: 1, parent_val: 'p1', children_id: 12, children_val: 'c1'}
    ]);

    assert.deepEqual(data, [{id: 1, val: 'p1', children: [{id: 11, val: 'c2'}, {id: 12, val: 'c1'}]}]);

    data = decompose({
      pk: 'parent_id',
      columns: {parent_id: 'id', parent_val: 'val'},
      children: {
        pk: 'children_id',
        columns: {children_id: 'id', children_val: 'val'},
        array: true
      }
    }, [
      {parent_id: 1, parent_val: 'p1', children_id: 12, children_val: 'c1'},
      {parent_id: 1, parent_val: 'p1', children_id: 11, children_val: 'c2'}
    ]);

    assert.deepEqual(data, [{id: 1, val: 'p1', children: [{id: 12, val: 'c1'}, {id: 11, val: 'c2'}]}]);
  });

  it('should collapse multiple children with the same parent', function () {
    const data = decompose({
      pk: 'parent_id',
      columns: {parent_id: 'id', parent_val: 'val'},
      children1: {
        pk: 'children1_id',
        columns: {children1_id: 'id', children1_val: 'val'},
        array: true
      },
      children2: {
        pk: 'children2_id',
        columns: {children2_id: 'id', children2_val: 'val'},
        array: true
      }
    }, [
      {parent_id: 1, parent_val: 'p1', children1_id: 11, children1_val: 'c1', children2_id: 21, children2_val: 'd1'},
      {parent_id: 1, parent_val: 'p1', children1_id: 12, children1_val: 'c2', children2_id: 22, children2_val: 'd2'},
      {parent_id: 1, parent_val: 'p1', children1_id: 12, children1_val: 'c2', children2_id: 23, children2_val: 'd3'}
    ]);

    assert.deepEqual(data, [{
      id: 1,
      val: 'p1',
      children1: [{id: 11, val: 'c1'}, {id: 12, val: 'c2'}],
      children2: [{id: 21, val: 'd1'}, {id: 22, val: 'd2'}, {id: 23, val: 'd3'}]
    }]);
  });

  it('should collapse children into other children', function () {
    const data = decompose({
      pk: 'parent_id',
      columns: {parent_id: 'id', parent_val: 'val'},
      children1: {
        pk: 'children1_id',
        columns: {children1_id: 'id', children1_val: 'val'},
        array: true,
        children2: {
          pk: 'children1_children2_id',
          columns: {children1_children2_id: 'id', children1_children2_val: 'val'},
          array: true
        }
      }
    }, [
      {parent_id: 1, parent_val: 'p1', children1_id: 11, children1_val: 'c1', children1_children2_id: 21, children1_children2_val: 'd1'},
      {parent_id: 1, parent_val: 'p1', children1_id: 12, children1_val: 'c2', children1_children2_id: 22, children1_children2_val: 'd2'},
      {parent_id: 1, parent_val: 'p1', children1_id: 12, children1_val: 'c2', children1_children2_id: 23, children1_children2_val: 'd3'}
    ]);

    assert.deepEqual(data, [{
      id: 1,
      val: 'p1',
      children1: [{
        id: 11,
        val: 'c1',
        children2: [{id: 21, val: 'd1'}]
      }, {
        id: 12,
        val: 'c2',
        children2: [{id: 22, val: 'd2'}, {id: 23, val: 'd3'}]
      }]
    }]);
  });

  it('should create empty child arrays from null children', function () {
    const data = decompose({
      pk: 'parent_id',
      columns: {parent_id: 'id', parent_val: 'val'},
      children: {
        pk: 'children_id',
        columns: {children_id: 'id', children_val: 'val'},
        array: true
      }
    }, [
      {parent_id: 1, parent_val: 'p1', children_id: null, children_val: null},
      {parent_id: 2, parent_val: 'p2', children_id: 11, children_val: 'c1'}
    ]);

    assert.deepEqual(data, [{id: 1, val: 'p1', children: []}, {id: 2, val: 'p2', children: [{id: 11, val: 'c1'}]}]);
  });

  it('should create empty child arrays from null children at any level', function () {
    const data = decompose({
      pk: 'parent_id',
      columns: {parent_id: 'id', parent_val: 'val'},
      children: {
        pk: 'children_id',
        columns: {children_id: 'id', children_val: 'val'},
        array: true,
        grandchildren: {
          pk: 'grandchildren_id',
          columns: {grandchildren_id: 'id', grandchildren_val: 'val'},
          array: true
        }
      }
    }, [
      {parent_id: 1, parent_val: 'p1', children_id: 11, children_val: 'c1', grandchildren_id: 111, grandchildren_val: 'g1'},
      {parent_id: 1, parent_val: 'p1', children_id: 11, children_val: 'c1', grandchildren_id: 112, grandchildren_val: 'g2'},
      {parent_id: 1, parent_val: 'p1', children_id: 12, children_val: 'c2', grandchildren_id: 121, grandchildren_val: 'g3'},
      {parent_id: 2, parent_val: 'p2', children_id: null, children_val: null, grandchildren_id: null, grandchildren_val: null},
      {parent_id: 3, parent_val: 'p3', children_id: 31, children_val: 'c3', grandchildren_id: null, grandchildren_val: null},
      {parent_id: 3, parent_val: 'p3', children_id: 32, children_val: 'c4', grandchildren_id: 321, grandchildren_val: 'g4'}
    ]);

    assert.deepEqual(data, [{
      id: 1, val: 'p1', children: [{
        id: 11,
        val: 'c1',
        grandchildren: [{
          id: 111,
          val: 'g1'
        }, {
          id: 112,
          val: 'g2'
        }]
      }, {
        id: 12,
        val: 'c2',
        grandchildren: [{
          id: 121,
          val: 'g3'
        }]
      }]
    }, {
      id: 2,
      val: 'p2',
      children: []
    }, {
      id: 3,
      val: 'p3',
      children: [{
        id: 31,
        val: 'c3',
        grandchildren: []
      }, {
        id: 32,
        val: 'c4',
        grandchildren: [{
          id: 321,
          val: 'g4'
        }]
      }]
    }]);
  });

  it('should collapse object descendants', function () {
    const data = decompose({
      pk: 'parent_id',
      columns: {parent_id: 'id', parent_val: 'val'},
      child: {
        pk: 'child_id',
        columns: {child_id: 'id', child_val: 'val'},
        grandchild: {
          pk: 'grandchild_id',
          columns: {grandchild_id: 'id', grandchild_val: 'val'}
        }
      }
    }, [
      {parent_id: 1, parent_val: 'p1', child_id: 11, child_val: 'c1', grandchild_id: 111, grandchild_val: 'g1'}
    ]);

    assert.deepEqual(data, [{id: 1, val: 'p1', child: {id: 11, val: 'c1', grandchild: {id: 111, val: 'g1'}}}]);
  });

  it('should not create nodes for null object descendants', function () {
    const data = decompose({
      pk: 'parent_id',
      columns: {parent_id: 'id', parent_val: 'val'},
      child: {
        pk: 'child_id',
        columns: {child_id: 'id', child_val: 'val'},
        grandchild: {
          pk: 'grandchild_id',
          columns: {grandchild_id: 'id', grandchild_val: 'val'}
        }
      }
    }, [
      {parent_id: 1, parent_val: 'p1', child_id: 11, child_val: 'c1', grandchild_id: null, grandchild_val: null}
    ]);

    assert.deepEqual(data, [{id: 1, val: 'p1', child: {id: 11, val: 'c1'}}]);
  });

  it('consolidates duplicate children by pk', function () {
    // this dataset is 'bad' in that you're not usually going to see 100% duplicate rows unless you've really screwed up
    // but it's more legible than reproducing the 'multiple children' data and tests the deduplication just the same
    const data = decompose({
      pk: 'parent_id',
      columns: {parent_id: 'id', parent_val: 'val'},
      children: {
        pk: 'children_child_id',
        columns: {children_child_id: 'child_id', children_val: 'val'},
        array: true
      }
    }, [
      {parent_id: 1, parent_val: 'p1', children_child_id: 11, children_val: 'c1'},
      {parent_id: 1, parent_val: 'p1', children_child_id: 12, children_val: 'c2'},
      {parent_id: 1, parent_val: 'p1', children_child_id: 12, children_val: 'c2'}
    ]);

    assert.deepEqual(data, [{id: 1, val: 'p1', children: [{child_id: 11, val: 'c1'}, {child_id: 12, val: 'c2'}]}]);
  });

  it('should apply new parents only in the correct scope', function () {
    const data = decompose({
      pk: 'this_id',
      columns: {
        this_id: 'id',
        this_name: 'name',
        this_notes: 'notes',
        this_archived: 'archived'
      },
      account: {
        pk: 'account_id',
        columns: {account_id: 'id'}
      },
      contact: {
        pk: 'this_id',
        columns: {contact_email: 'email', contact_phone: 'phone'}
      },
      address: {
        pk: 'this_id',
        columns: {
          address_number: 'number',
          address_street: 'street',
          address_complement: 'complement',
          address_neighborhood: 'neighborhood',
          address_city: 'city',
          address_state: 'state',
          address_zipCode: 'zipCode'
        },
        coords: {
          pk: 'this_id',
          columns: {
            address_coords_latitude: 'latitude',
            address_coords_longitude: 'longitude'
          }
        }
      },
      labels: {
        pk: 'labels_id',
        columns: {
          labels_id: 'id',
          labels_name: 'name',
          labels_color: 'color',
          labels_type: 'type'
        },
        array: true
      }
    }, [
      {
        'this_id': 1,
        'account_id': 1,
        'this_name': 'Eduardo Luiz',
        'contact_email': 'email',
        'contact_phone': 'phone',
        'this_notes': null,
        'this_archived': false,
        'address_zipCode': 'zip',
        'address_street': 'street',
        'address_number': 'number',
        'address_complement': null,
        'address_neighborhood': null,
        'address_city': 'Sao Paulo',
        'address_state': 'Sao Paulo',
        'address_coords_latitude': '1',
        'address_coords_longitude': '2',
        'labels_id': '297726d0-301d-4de6-b9a4-e439b81f44ba',
        'labels_name': 'Contrato',
        'labels_color': 'yellow',
        'labels_type': 1
      }, {
        'this_id': 1,
        'account_id': 1,
        'this_name': 'Eduardo Luiz',
        'contact_email': 'email',
        'contact_phone': 'phone',
        'this_notes': null,
        'this_archived': false,
        'address_zipCode': 'zip',
        'address_street': 'street',
        'address_number': 'number',
        'address_complement': null,
        'address_neighborhood': null,
        'address_city': 'Sao Paulo',
        'address_state': 'Sao Paulo',
        'address_coords_latitude': '1',
        'address_coords_longitude': '2',
        'labels_id': '1db6e07f-91e2-42fb-b65c-9a364b6bad4c',
        'labels_name': 'Particular',
        'labels_color': 'purple',
        'labels_type': 1
      }
    ]);

    assert.deepEqual(data, [{
      'id': 1,
      'account': {
        'id': 1
      },
      'name': 'Eduardo Luiz',
      'contact': {
        'email': 'email',
        'phone': 'phone'
      },
      'notes': null,
      'archived': false,
      'address': {
        'zipCode': 'zip',
        'street': 'street',
        'number': 'number',
        'complement': null,
        'neighborhood': null,
        'city': 'Sao Paulo',
        'state': 'Sao Paulo',
        'coords': {
          'latitude': '1',
          'longitude': '2'
        }
      },
      'labels': [
        {
          'id': '297726d0-301d-4de6-b9a4-e439b81f44ba',
          'name': 'Contrato',
          'color': 'yellow',
          'type': 1
        }, {
          'id': '1db6e07f-91e2-42fb-b65c-9a364b6bad4c',
          'name': 'Particular',
          'color': 'purple',
          'type': 1
        }
      ]
    }]);
  });

  it.skip('should accept and use pk arrays', function () {
    const data = decompose({
      pk: ['parent_id_one', 'parent_id_two'],
      columns: {parent_id_one: 'id_one', parent_id_two: 'id_two', parent_val: 'val'},
      children1: {
        pk: ['children1_id_one', 'children1_id_two'],
        columns: {children1_id_one: 'cid_one', children1_id_two: 'cid_two', children1_val: 'val'},
        array: true,
        children2: {
          pk: ['children1_children2_id_one', 'children1_children2_id_two'],
          columns: {children1_children2_id_one: 'ccid_one', children1_children2_id_two: 'ccid_two', children1_children2_val: 'val'},
          array: true
        }
      }
    }, [
      {
        parent_id_one: 1,
        parent_id_two: 2,
        parent_val: 'p1',
        children1_id_one: 11,
        children1_id_two: 12,
        children1_val: 'c1',
        children1_children2_id_one: 21,
        children1_children2_id_two: 22,
        children1_children2_val: 'd1'
      }, {
        parent_id_one: 1,
        parent_id_two: 2,
        parent_val: 'p1',
        children1_id_one: 13,
        children1_id_two: 14,
        children1_val: 'c2',
        children1_children2_id_one: 23,
        children1_children2_id_two: 24,
        children1_children2_val: 'd2'
      }, {
        parent_id_one: 1,
        parent_id_two: 2,
        parent_val: 'p1',
        children1_id_one: 13,
        children1_id_two: 14,
        children1_val: 'c2',
        children1_children2_id_one: 25,
        children1_children2_id_two: 26,
        children1_children2_val: 'd3'
      }, {
        parent_id_one: 3,
        parent_id_two: 4,
        parent_val: 'p2',
        children1_id_one: 15,
        children1_id_two: 16,
        children1_val: 'c3',
        children1_children2_id_one: 27,
        children1_children2_id_two: 28,
        children1_children2_val: 'd4'
      }
    ]);

    assert.deepEqual(data, [{
      id_one: 1,
      id_two: 2,
      val: 'p1',
      children1: [{
        id_one: 11,
        id_two: 12,
        val: 'c1',
        children2: [{id_one: 21, id_two: 22, val: 'd1'}]
      }, {
        id_one: 13,
        id_two: 14,
        val: 'c2',
        children2: [
          {id_one: 23, id_two: 24, val: 'd2'},
          {id_one: 25, id_two: 26, val: 'd3'}
        ]
      }]
    }, {
      id_one: 3,
      id_two: 4,
      val: 'p2',
      children1: [{
        id_one: 15,
        id_two: 16,
        val: 'c3',
        children2: [{id_one: 26, id_two: 28, val: 'd4'}]
      }]
    }]);
  });
});

var Massive = require('./lib/massive');

var JSONStream = require('JSONStream')

var m = new Massive({
  connectionString: 'postgres://ingouser:123456@localhost/ingo',
  preparedStatements: true
});

m.load()
  .then(function() {
    // load happen
    console.log('>>>>>>>>>>>>>>>>>>>>>>>');
    return m.users.find({ id: { '<': 100, '>': 20 } }, { columns: 'email', stream: false });
  })
  //.then(function(stream) {
  //  stream.pipe(JSONStream.stringify()).pipe(process.stdout)
  //})
  //.then(function(rows) {
  //  console.log(rows)
  //})
  .catch(function(err) {
    console.log(err.stack);
  });

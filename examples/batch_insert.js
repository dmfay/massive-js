var massive = require("../lib/massive");
massive.connect("postgresql://postgres@localhost/test");

//drop the table
console.log("dropping...")
massive.dropTable("products").execute();


//create the table
console.log("creating products table")
massive.createTable("products", {
  name : "string",
  price : "money",
  timestamps : true
}).execute();

//add some data - in a batch
console.log("Inserting 2 products...");
var products = new massive.Model("products", "id");
var items = [
  {name:"stuffy stuff", price: 12.00},
  {name:"poofy poof", price: 24.00}
];
products.insertBatch(items).execute(function(err,result){
  if(err) console.log("oops - " + err);
});

//pull back out
console.log("Wanna see em?")
var query = products.select();
query.on("row", function(row){
  console.log("Hi, I'm product " + row.name);
})

//we charge too little
console.log("let's update our prices")
query = products.update({price : 100.00}, {"id >" :  0}).execute(function(err,result){
  if(err) console.log("Ohhhh mann! " + err);
  console.log("All set!")
});

console.log("Updated pricing...")
var query = products.select();
query.on("row", function(row){
  console.log(row.name + " is now priced at " + row.price);
})


//drop it all
console.log("all done...")
products.delete().execute(function(err,result){
  if(err) console.log("Ohhhh mann! " + err);
  console.log("See ya!")
})
Sane Data Access for Node and Relational Databases
=========================================

I don't know much about NodeJS - well I know enough to know that I love it. It's very fun, and I wanted to write a module for it. I'm not quite there yet, so the code in this repo is me, screwing around.

Wanna Help?
----------
If you know Javascript and you dig Massive - I could use some help with this. Right now it's hard-wired to PostGres and yes I know most Node folks use a document store and that's great. If you need or want to use a regular relational system - well why not use something fun like Massive?

Have a look at the test file (such as it is) and you'll see how I've wired it all together. Nothing crazy - lots of fun.

What You Need
-----------
Obviously, be sure to have NodeJS > 6.1 installed. You'll also need the following modules:

* mocha
* should
* pg

I like to use CoffeeScript for testing, so please be sure to follow that convention (I'd be very happy). However, the core is written in JS and I'd like to keep it that way.

Thank Yous
---------
Much of this code is lifted from NodeJS Orm: https://github.com/dresende/node-orm. It inspired me as the syntax was quite close to what I wanted to do - however it did just a bit more than I wanted and wasn't flexible like Massive is. 
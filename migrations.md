# Migrations and Massive

Massive does not include a framework for applying migrations to upgrade a database schema. This is by design: Massive focuses on data _access_, not on schema development.

There are many migration frameworks available, each representing its own variation on the theme of applying a sequence of pending changesets to a database and each having its own advantages and disadvantages. No one framework is clearly best for every possible scenario, so evaluate your circumstances carefully when selecting one.

There's one major distinguishing factor among migration frameworks which is important to keep in mind. Some frameworks simply run SQL files stored alongside your project in source control, while others expect you to write migrations as a program using an API which the framework transforms into SQL for you (and some allow you to use either at will). Migration APIs may appear more friendly at first, especially to novice SQL users, but SQL-centric frameworks have several advantages:

* Raw SQL can be tuned and optimized directly
* Using SQL eliminates the temptation to modify records outside the database with a (hugely inefficient) retrieve-change-persist approach
* SQL files are portable to other frameworks and development languages, should the need arise
* If you aren't already conversant with SQL, it's a great way to learn a very useful skill!

Overall: use what works for you. My personal favorite migration framework is [sqitch](https://sqitch.org), a minimalist SQL-centric change management system distributed as a standalone application instead of a dependency, freeing it from concerns about your platform, application programming language, or even database. However, it can be complicated to install on certain systems where packages are not already available.

# Contributing

## Issues

If something goes wrong or does not behave as expected, please raise an issue to report it. At minimum it should include steps to reproduce, and the more detailed the description, the better; if at all possible, please include a minimal code sample that reproduces the problem.

Please do _not_ close bugs on your own unless the problem turned out to be on your end. A `fixes` directive in a pull request, however, is completely fine.

New feature requests and ideas are also welcome! Massive is intentionally somewhat minimalist, but I'm more invested in it being _useful_ than I am in simplicity for its own sake. If something will make life easier without straying too far from the library's core purpose of facilitating data access, I'm all ears.

I am not, however, going to make any promises regarding the speed with which I'll get around to implementing anyone else's suggestions on my own. So if there's something you'd really like to see, please do raise an issue to discuss it, but also consider submitting a pull request! And speaking of...

## Pull Requests

Want to contribute code to Massive? Awesome! I'm always happy to review pull requests. Here are some guidelines to make the process as smooth as possible:

* First, if it's a big new feature or something else which involves a lot of effort, please open an issue to discuss before you put too much time into it.
* Stay focused. If you're tinkering with multiple things, use branches to ensure that your pull request only includes the relevant commits.
* Lint your code (your editor may do this for you; alternatively, `npm run lint`) to ensure that your formatting is consistent with the existing code style.
* Run the tests (`npm test`) before you commit or submit a pull request. Your changes will be picked up by continuous integration, but it's a lot faster to do it locally.

Pull requests which introduce **new functionality** must have reasonably thorough tests for it before they will be integrated.

Pull requests which **fix bugs** should include at least one testcase demonstrating the failure being fixed, if there isn't one already failing.

Pull requests **in general** should not cause any new test or lint failures. Continuous integration runs on every pull request and any problems can be examined in the TravisCI build logs.

### Testing

Massive uses [Mocha](https://mochajs.org/) and [Chai](http://chaijs.com/) to test. Test cases which invoke asynchronous functions can use [co-mocha](https://github.com/blakeembrey/co-mocha) generators to `yield` the async calls.

To run the tests, you will need to have Postgres (>=9.5) running. If you have Docker installed, you can `docker run dmfay/pg-massive` instead to spin up a Postgres container with everything set up for you. Otherwise, ensure that the `postgres` superuser has `trust` authentication enabled for local ipv4 connections in your `pg_hba.conf`, and create an empty `massive` database:

```
createdb massive
```

Run the tests with npm:

```
npm test
```

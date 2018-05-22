# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="4.8.3"></a>
## [4.8.3](https://github.com/dmfay/massive-js/compare/v4.8.2...v4.8.3) (2018-05-22)


### Bug Fixes

* delimit junction table names in deep inserts ([bbd784d](https://github.com/dmfay/massive-js/commit/bbd784d))



<a name="4.8.2"></a>
## [4.8.2](https://github.com/dmfay/massive-js/compare/v4.8.0...v4.8.2) (2018-05-12)


### Bug Fixes

* fields can be restricted in document searches (fixes [#595](https://github.com/dmfay/massive-js/issues/595)) ([162b3d9](https://github.com/dmfay/massive-js/commit/162b3d9))
* support traversal properly inside documents (fixes [#594](https://github.com/dmfay/massive-js/issues/594)) ([8b49661](https://github.com/dmfay/massive-js/commit/8b49661))



<a name="4.8.0"></a>
# [4.8.0](https://github.com/dmfay/massive-js/compare/v4.7.2...v4.8.0) (2018-05-06)


### Bug Fixes

* **package:** update pg-promise to version 8.3.0 ([#587](https://github.com/dmfay/massive-js/issues/587)) ([8111477](https://github.com/dmfay/massive-js/commit/8111477))
* **package:** update pg-promise to version 8.4.0 ([#588](https://github.com/dmfay/massive-js/issues/588)) ([8c8dfac](https://github.com/dmfay/massive-js/commit/8c8dfac))


### Features

* refresh materialized views ([ac278af](https://github.com/dmfay/massive-js/commit/ac278af))



<a name="4.7.2"></a>
## [4.7.2](https://github.com/dmfay/massive-js/compare/v4.7.1...v4.7.2) (2018-04-17)


### Bug Fixes

* better messaging for deep insert errors (closes [#556](https://github.com/dmfay/massive-js/issues/556)) ([#571](https://github.com/dmfay/massive-js/issues/571)) ([8ff4045](https://github.com/dmfay/massive-js/commit/8ff4045))
* throw an appropriate error if decompose encounters a null root pk (closes [#568](https://github.com/dmfay/massive-js/issues/568)) ([#570](https://github.com/dmfay/massive-js/issues/570)) ([5569060](https://github.com/dmfay/massive-js/commit/5569060))
* use Object.hasOwnProperty (fixes [#579](https://github.com/dmfay/massive-js/issues/579)) ([d0c4bec](https://github.com/dmfay/massive-js/commit/d0c4bec))



<a name="4.7.1"></a>
## [4.7.1](https://github.com/dmfay/massive-js/compare/v4.7.0...v4.7.1) (2018-03-10)


### Bug Fixes

* date casting in documents should use timestamptz (fixes [#563](https://github.com/dmfay/massive-js/issues/563)) ([a8c603f](https://github.com/dmfay/massive-js/commit/a8c603f))
* **package:** update commander to version 2.15.0 ([#562](https://github.com/dmfay/massive-js/issues/562)) ([d5434f9](https://github.com/dmfay/massive-js/commit/d5434f9))
* **package:** update pg-promise to version 8.1.1 ([#560](https://github.com/dmfay/massive-js/issues/560)) ([4265e21](https://github.com/dmfay/massive-js/commit/4265e21)), closes [#554](https://github.com/dmfay/massive-js/issues/554)
* **package:** update pg-promise to version 8.2.0 ([#566](https://github.com/dmfay/massive-js/issues/566)) ([9cd4e65](https://github.com/dmfay/massive-js/commit/9cd4e65))



<a name="4.7.0"></a>
# [4.7.0](https://github.com/dmfay/massive-js/compare/v4.6.6...v4.7.0) (2018-02-22)


### Features

* option to disable deepInsert (fixes [#550](https://github.com/dmfay/massive-js/issues/550)) ([b66e255](https://github.com/dmfay/massive-js/commit/b66e255))



<a name="4.6.6"></a>
## [4.6.6](https://github.com/dmfay/massive-js/compare/v4.6.5...v4.6.6) (2018-02-20)


### Bug Fixes

* ensure the columns array has no duplicates when using composite keys ([#549](https://github.com/dmfay/massive-js/issues/549)) ([1024485](https://github.com/dmfay/massive-js/commit/1024485))



<a name="4.6.5"></a>
## [4.6.5](https://github.com/dmfay/massive-js/compare/v4.6.4...v4.6.5) (2018-02-14)


### Bug Fixes

* **package:** update commander to version 2.14.0 ([#532](https://github.com/dmfay/massive-js/issues/532)) ([157a17c](https://github.com/dmfay/massive-js/commit/157a17c))
* **package:** update pg-promise to version 7.5.2 ([#538](https://github.com/dmfay/massive-js/issues/538)) ([b4cec78](https://github.com/dmfay/massive-js/commit/b4cec78)), closes [#537](https://github.com/dmfay/massive-js/issues/537)
* rework table load for inheritance with proper pk tracking (fixes [#539](https://github.com/dmfay/massive-js/issues/539)) ([#540](https://github.com/dmfay/massive-js/issues/540)) ([4d35bc8](https://github.com/dmfay/massive-js/commit/4d35bc8))



<a name="4.6.4"></a>
## [4.6.4](https://github.com/dmfay/massive-js/compare/v4.6.3...v4.6.4) (2018-02-03)


### Bug Fixes

* decompose should preserve ordering of query results ([#531](https://github.com/dmfay/massive-js/issues/531)) ([d13bb2f](https://github.com/dmfay/massive-js/commit/d13bb2f))



<a name="4.6.3"></a>
## [4.6.3](https://github.com/dmfay/massive-js/compare/v4.6.2...v4.6.3) (2018-01-12)


### Bug Fixes

* **package:** update commander to version 2.13.0 ([#523](https://github.com/dmfay/massive-js/issues/523)) ([c173bb8](https://github.com/dmfay/massive-js/commit/c173bb8))
* pass decompose option from non-select statements (fixes [#522](https://github.com/dmfay/massive-js/issues/522)) ([#524](https://github.com/dmfay/massive-js/issues/524)) ([19c668b](https://github.com/dmfay/massive-js/commit/19c668b))



<a name="4.6.2"></a>
## [4.6.2](https://github.com/dmfay/massive-js/compare/v4.6.1...v4.6.2) (2018-01-08)


### Bug Fixes

* prevent double-counting foreign tables which inherit from other tables ([90ec61e](https://github.com/dmfay/massive-js/commit/90ec61e))



<a name="4.6.1"></a>
## [4.6.1](https://github.com/dmfay/massive-js/compare/v4.6.0...v4.6.1) (2018-01-05)



<a name="4.6.0"></a>
# [4.6.0](https://github.com/dmfay/massive-js/compare/v4.5.0...v4.6.0) (2018-01-01)


### Bug Fixes

* **package:** update commander to version 2.12.0 ([#513](https://github.com/dmfay/massive-js/issues/513)) ([cf35ce6](https://github.com/dmfay/massive-js/commit/cf35ce6))


### Features

* merge entities to compose database api (closes [#387](https://github.com/dmfay/massive-js/issues/387)) ([#520](https://github.com/dmfay/massive-js/issues/520)) ([c1a1d5f](https://github.com/dmfay/massive-js/commit/c1a1d5f))



<a name="4.5.0"></a>
# [4.5.0](https://github.com/dmfay/massive-js/compare/v4.4.0...v4.5.0) (2017-11-12)


### Bug Fixes

* improve connect/reload handling in tests ([6f47708](https://github.com/dmfay/massive-js/commit/6f47708))


### Features

* deep insert into related tables ([6bb4c6b](https://github.com/dmfay/massive-js/commit/6bb4c6b))
* deprecate columns for split fields+exprs with idiomatic json traversal ([1deba7f](https://github.com/dmfay/massive-js/commit/1deba7f))
* variadic function support (closes [#431](https://github.com/dmfay/massive-js/issues/431)) ([ae00a50](https://github.com/dmfay/massive-js/commit/ae00a50))



<a name="4.4.0"></a>
# [4.4.0](https://github.com/dmfay/massive-js/compare/v4.3.0...v4.4.0) (2017-10-10)


### Features

* option to exclude materialized views ([#392](https://github.com/dmfay/massive-js/issues/392)) ([da4119c](https://github.com/dmfay/massive-js/commit/da4119c))



<a name="4.3.0"></a>
# [4.3.0](https://github.com/dmfay/massive-js/compare/v4.2.0...v4.3.0) (2017-09-29)



<a name="4.2.0"></a>
# [4.2.0](https://github.com/dmfay/massive-js/compare/v4.1.0...v4.2.0) (2017-09-20)



<a name="4.1.0"></a>
# [4.1.0](https://github.com/dmfay/massive-js/compare/v4.0.1...v4.1.0) (2017-09-17)



<a name="4.0.1"></a>
## [4.0.1](https://github.com/dmfay/massive-js/compare/v4.0.0...v4.0.1) (2017-09-14)


### Bug Fixes

* **package:** update mz to version 2.7.0 ([#464](https://github.com/dmfay/massive-js/issues/464)) ([cbb61d6](https://github.com/dmfay/massive-js/commit/cbb61d6))



<a name="4.0.0"></a>
# [4.0.0](https://github.com/dmfay/massive-js/compare/v3.2.0...v4.0.0) (2017-09-06)



<a name="3.2.0"></a>
# [3.2.0](https://github.com/dmfay/massive-js/compare/v3.1.0...v3.2.0) (2017-08-11)



<a name="3.1.0"></a>
# [3.1.0](https://github.com/dmfay/massive-js/compare/v3.0.0...v3.1.0) (2017-07-22)



<a name="3.0.0"></a>
# [3.0.0](https://github.com/dmfay/massive-js/compare/v3.0.0-rc1...v3.0.0) (2017-06-25)



<a name="3.0.0-rc1"></a>
# [3.0.0-rc1](https://github.com/dmfay/massive-js/compare/v2.6.1...v3.0.0-rc1) (2017-05-31)



<a name="2.6.1"></a>
## [2.6.1](https://github.com/dmfay/massive-js/compare/2.2.0...v2.6.1) (2017-05-11)



<a name="2.2.0"></a>
# [2.2.0](https://github.com/dmfay/massive-js/compare/2.1.0...2.2.0) (2016-03-28)



<a name="2.1.0"></a>
# [2.1.0](https://github.com/dmfay/massive-js/compare/2.0.6...2.1.0) (2015-12-08)



<a name="2.0.6"></a>
## [2.0.6](https://github.com/dmfay/massive-js/compare/2.0.5...2.0.6) (2015-08-12)



<a name="2.0.5"></a>
## 2.0.5 (2015-07-08)




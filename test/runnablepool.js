var
assert = require('assert'),
util = require('util'),
path = require('path'),
os = require('os'),
RunnablePool = require('../lib/runnablepool').RunnablePool;


/*jslint
	unparam: true
*/

describe('runnablepool', function () {
	describe('100 runs', function() {
		it('should run 100 times', function (done) {
			var
			BATCH_RESULT_COUNT = 0,
			BATCH_ERROR_COUNT = 0,
			i = 0,
			pool = new RunnablePool({
				modulePath: __dirname + '/dep/test_runnable.js'
			});
			pool.on('result', function() {
				BATCH_RESULT_COUNT++;
			});
			pool.on('error', function() {
				BATCH_ERROR_COUNT++;
			});
			pool.on('end', function(runnables, err){
				var runCount = 0;
				runnables.forEach(function(item) {
					runCount += item.runCount;
				});

				assert.equal(runnables.length, os.cpus().length);
				assert.equal(BATCH_RESULT_COUNT, 100);
				assert.equal(BATCH_ERROR_COUNT, 0);
				assert.equal(runCount, 100);
				done();
			});

			for (i = 0; i < 100; i++) {
				pool.run();
			}
		});
	});

	describe('run 1 time with default config', function() {
		it('should have 1 result', function (done) {
			var	pool = new RunnablePool({
				modulePath: __dirname + '/dep/test_runnable.js'
			});
			pool.on('result', function (pid, err, result) {
				assert.notStrictEqual(pid, null);
				assert.notStrictEqual(result, null);
				assert.equal(result, 'TestRunnable run');
				done();
			});
			pool.run();
		});
	});

	describe('run 100 time with 1 CPU', function() {
		it('should run 100 times on 1 cpu', function (done) {
			var
			BATCH_RESULT_COUNT = 0,
			BATCH_ERROR_COUNT = 0,
			i = 0,
			pool = new RunnablePool({
				modulePath: __dirname + '/dep/test_runnable.js',
				maxRunnables: 1
			});
			pool.on('result', function() {
				BATCH_RESULT_COUNT++;
			});
			pool.on('error', function() {
				BATCH_ERROR_COUNT++;
			});
			pool.on('end', function (runnables, err) {
				assert.equal(BATCH_RESULT_COUNT, 100);
				var runCount = 0;
				runnables.forEach(function(item) {
						runCount += item.runCount;
				});
				assert.equal(runCount, 100);
				assert.equal(runnables.length, 1);
				assert.equal(BATCH_ERROR_COUNT, 0);
				done();
			});
			for (i = 0; i < 100; i++) {
				pool.run();
			}
		});
	});

	describe('2 runs with 1s timeout', function() {
		it('should have no result', function (done) {
			var
			BATCH_RESULT_COUNT = 0,
			BATCH_ERROR_COUNT = 0,
			i = 0,
			pool = new RunnablePool({
				modulePath: __dirname + '/dep/test_runnable_timeout.js',
				timeout: 1 // 1s
			});
			pool.on('result', function() {
				BATCH_RESULT_COUNT++;
			});
			pool.on('error', function() {
				BATCH_ERROR_COUNT++;
			});
			pool.on('end', function (runnables, err) {
				assert.equal(BATCH_RESULT_COUNT, 0);
				assert.equal(BATCH_ERROR_COUNT, 2);
				var runCount = 0;
				runnables.forEach(function(item) {
						runCount += item.runCount;
				});
				assert.equal(runCount, 0);
				assert.equal(runnables.length, 0);
				done();
			});
			for (i = 0; i < 2; i++) {
				pool.run();
			}
		});
	});

	describe('Run 100 times a runnable that throw an exception', function() {
		it('should have 100 error results', function (done) {
			var
			BATCH_RESULT_COUNT = 0,
			BATCH_ERROR_COUNT = 0,
			i = 0,
			pool = new RunnablePool({
				modulePath: __dirname + '/dep/test_runnable_exception.js'
			});
			pool.on('result', function(err) {
				if (err) {
					BATCH_RESULT_COUNT++;
				}
			});
			pool.on('error', function(err) {
				BATCH_ERROR_COUNT++;
			});
			pool.on('end', function (runnables, err) {
				assert.equal(BATCH_RESULT_COUNT, 100);
				assert.equal(BATCH_ERROR_COUNT, 0);
				var runCount = 0;
				runnables.forEach(function(item) {
						runCount += item.runCount;
				});
				assert.equal(runCount, 100);
				assert.equal(runnables.length, os.cpus().length);
				done();
			});
			for (i = 0; i < 100; i++) {
				pool.run();
			}
		});
	});

	describe('Run a runnable that throw an exception', function() {
		it('should have 1 error result', function (done) {
			var pool = new RunnablePool({
				modulePath: __dirname + '/dep/test_runnable_exception.js'
			});
			pool.on('result', function (pid, result) {
				assert.notStrictEqual(pid, null);
				assert.notStrictEqual(result, null);
				assert.equal(result.message, 'test runnable exception');
				assert.notStrictEqual(result.stack, null);
				done();
			});
			pool.run();
		});
	});

	describe('Run a runnable with a number as param', function() {
		it('should return result with this number', function (done) {
			var pool = new RunnablePool({
				modulePath: __dirname + '/dep/test_runnable_params.js'
			});
			pool.on('result', function (pid, err, result) {
				assert.equal(result, 666);
				done();
			});
			pool.run(666);
		});
	});

	describe('Run a runnable with a string as param', function() {
		it('should return result with this string', function (done) {
			var	pool = new RunnablePool({
				modulePath: __dirname + '/dep/test_runnable_params.js'
			});
			pool.on('result', function (pid, err, result) {
				assert.equal(result, 'test');
				done();
			});
			pool.run('test');
		});
	});

	describe('Run a runnable with args options', function() {
		it('should return them', function (done) {
			var pool = new RunnablePool({
					modulePath: __dirname + '/dep/test_runnable_args.js',
					args: ['foo', 'bar']
			});
			pool.on('result', function (pid, err, result) {
				assert.notStrictEqual(result.indexOf('foo'), -1);
				assert.notStrictEqual(result.indexOf('bar'), -1);
				done();
			});
			pool.run();
		});
	});

	describe('Run 100 times, abort on first result', function() {
		it('should return not return 100 result', function (done) {
			var
			BATCH_RESULT_COUNT = 0,
			BATCH_ERROR_COUNT = 0,
			i = 0,
			pool = new RunnablePool({
					modulePath: __dirname + '/dep/test_runnable.js'
			});
			pool.on('result', function() {
					BATCH_RESULT_COUNT++;
					pool.abort();
			});
			pool.on('error', function() {
					BATCH_ERROR_COUNT++;
			});
			pool.on('end', function (runnables, err) {
				assert.notEqual(BATCH_RESULT_COUNT, 100);
				var runCount = 0;
				runnables.forEach(function(item) {
					runCount += item.runCount;
				});
				assert.notEqual(runCount, 100);
				assert.equal(BATCH_ERROR_COUNT, 0);
				done();
			});
			for (i = 0; i < 100; i++) {
				pool.run();
			}
		});
	});
});
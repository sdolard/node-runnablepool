var 
vows = require('vows'),
assert = require('assert'),
util = require('util'),
path = require('path'),
os = require('os'),

rp = require('../lib/runnablepool'),
BATCH_RESULT_COUNT = 0,
BATCH_ERROR_COUNT = 0;
exports.suite1 = vows.describe('runnablepool').
addBatch({
		'When running a runnable 100 times with default config': {
			topic: function () {
				BATCH_RESULT_COUNT = 0;
				BATCH_ERROR_COUNT = 0;
				var 
				i = 0, 
				pool = new rp.RunnablePool({
						modulePath: __dirname + '/test_runnable.js'
				});
				pool.on('result', function() {
						BATCH_RESULT_COUNT++;
				});
				pool.on('error', function() {
						BATCH_ERROR_COUNT++;
				});
				pool.on('end', this.callback);
				for (i = 0; i < 100; i++) {
					pool.run();
				}
			},
			'It received 100 results': function (runnables, err) {
				assert.equal(BATCH_RESULT_COUNT, 100);
			},
			'It has been run 100 times': function (runnables, err) {
				var runCount = 0;
				runnables.forEach(function(item) {
						runCount += item.runCount;
				});
				assert.equal(runCount, 100);
			},
			'All cpu where used': function (runnables, err) {
				assert.equal(runnables.length, os.cpus().length);
			},
			'It received 0 error': function (runnables, err) {
				assert.equal(BATCH_ERROR_COUNT, 0);
			}
		}
}).addBatch({
		'When running a runnable 1 time with default config': {
			topic: function () {
				var 
				pool = new rp.RunnablePool({
						modulePath: __dirname + '/test_runnable.js'
				});
				pool.on('result', this.callback);
				pool.run();
			},
			'It received 1 result': function (pid, err, result) {
				assert.isNotNull(pid);
				assert.isNotNull(result);
			},
			'result correspond': function (pid, err, result) {
				assert.equal(result, 'TestRunnable run');
			}
		}
}).
addBatch({
		'When running a runnable 100 times with 1 CPU': {
			topic: function () {
				BATCH_RESULT_COUNT = 0;
				BATCH_ERROR_COUNT = 0;
				var 
				i = 0, 
				pool = new rp.RunnablePool({
						modulePath: __dirname + '/test_runnable.js',
						maxRunnables: 1
				});
				pool.on('result', function() {
						BATCH_RESULT_COUNT++;
				});
				pool.on('error', function() {
						BATCH_ERROR_COUNT++;
				});
				pool.on('end', this.callback);
				for (i = 0; i < 100; i++) {
					pool.run();
				}
			},
			'It received 100 results': function (runnables, err) {
				assert.equal(BATCH_RESULT_COUNT, 100);
			},
			
			'It has been run 100 times': function (runnables, err) {
				var runCount = 0;
				runnables.forEach(function(item) {
						runCount += item.runCount;
				});
				assert.equal(runCount, 100);
			},
			'1 cpu is used': function (runnables, err) {
				assert.equal(runnables.length, 1);
			},
			'It received 0 error': function (runnables, err) {
				assert.equal(BATCH_ERROR_COUNT, 0);
			}
		}
}).
addBatch({
		'When running a timeout runnable 2 time': {
			topic: function () {
				BATCH_RESULT_COUNT = 0;
				BATCH_ERROR_COUNT = 0;
				var 
				i = 0, 
				pool = new rp.RunnablePool({
						modulePath: __dirname + '/test_runnable_timeout.js',
						timeout: 1 // 2s
				});
				pool.on('result', function() {
						BATCH_RESULT_COUNT++;
				});
				pool.on('error', function() {
						BATCH_ERROR_COUNT++;
				});
				pool.on('end', this.callback);
				for (i = 0; i < 2; i++) {
					pool.run();
				}
			},
			'It received 0 results': function (runnables, err) {
				assert.equal(BATCH_RESULT_COUNT, 0);
			},
			'It received 2 error': function (runnables, err) {
				assert.equal(BATCH_ERROR_COUNT, 2);
			},
			'It has been run 0 times': function (runnables, err) {
				var runCount = 0;
				runnables.forEach(function(item) {
						runCount += item.runCount;
				});
				assert.equal(runCount, 0);
			},
			'0 cpu is used': function (runnables, err) {
				assert.equal(runnables.length, 0);
			}
		}
}).
addBatch({
		'When running a runnable that throw an exception 100 time': {
			topic: function () {
				BATCH_RESULT_COUNT = 0;
				BATCH_ERROR_COUNT = 0;
				var 
				i = 0, 
				pool = new rp.RunnablePool({
						modulePath: __dirname + '/test_runnable_exception.js'
				});
				pool.on('result', function() {
						BATCH_RESULT_COUNT++;
				});
				pool.on('error', function() {
						BATCH_ERROR_COUNT++;
				});
				pool.on('end', this.callback);
				for (i = 0; i < 100; i++) {
					pool.run();
				}
			},
			'It received 100 results': function (runnables, err) {
				assert.equal(BATCH_RESULT_COUNT, 100);
			},
			'It received 0 error': function (runnables, err) {
				assert.equal(BATCH_ERROR_COUNT, 0);
			},
			'It has been run 100 times': function (runnables, err) {
				var runCount = 0;
				runnables.forEach(function(item) {
						runCount += item.runCount;
				});
				assert.equal(runCount, 100);
			},
			'All cpu were used': function (runnables, err) {
				assert.equal(runnables.length, os.cpus().length);
			}
		}
}).
addBatch({
		'When running a runnable that throw an exception 1 time': {
			topic: function () {
				BATCH_ERROR_COUNT = 0;
				var 
				i = 0, 
				pool = new rp.RunnablePool({
						modulePath: __dirname + '/test_runnable_exception.js'
				});
				pool.on('result', this.callback);
				for (i = 0; i < 1; i++) {
					pool.run();
				}
			},
			'It received 1 result': function (pid, result) {
				assert.isNotNull(pid);
				assert.isNotNull(result);
			},
			'Exception message correspond': function (pid, result) {
				assert.equal(result.message, 'test runnable exception');
			},
			'Stack is join to result': function (pid, result) {
				assert.isNotNull(result.stack);
			}
		}
}).
addBatch({
		'When running a runnable 1 time with a number as params': {
			topic: function () {
				BATCH_RESULT_COUNT = 0;
				BATCH_ERROR_COUNT = 0;
				var 
				i = 0, 
				pool = new rp.RunnablePool({
						modulePath: __dirname + '/test_runnable_params.js'
				});
				pool.on('result', this.callback);
				pool.run(666);
			},
			'Result is valid': function (pid, err, result) {
				assert.equal(result, 666);
			}
		}
}).
addBatch({
		'When running a runnable 1 time with a string as params': {
			topic: function () {
				BATCH_RESULT_COUNT = 0;
				BATCH_ERROR_COUNT = 0;
				var 
				i = 0, 
				pool = new rp.RunnablePool({
						modulePath: __dirname + '/test_runnable_params.js'
				});
				pool.on('result', this.callback);
				pool.run('test');
			},
			'Result is valid': function (pid, err, result) {
				assert.equal(result, 'test');
			}
		}
}).
addBatch({
		'When running a runnable 1 time with args option': {
			topic: function () {
				BATCH_RESULT_COUNT = 0;
				BATCH_ERROR_COUNT = 0;
				var 
				i = 0, 
				pool = new rp.RunnablePool({
						modulePath: __dirname + '/test_runnable_args.js',
						args: ['foo', 'bar']  
				});
				pool.on('result', this.callback);
				pool.run();
			},
			'Result is valid': function (pid, err, result) {
				assert.include(result, 'foo');
				assert.include(result, 'bar');
			}
		}
}).
addBatch({
		'When running a runnable 100 and aborting at first result': {
			topic: function () {
				BATCH_RESULT_COUNT = 0;
				BATCH_ERROR_COUNT = 0;
				var 
				i = 0, 
				pool = new rp.RunnablePool({
						modulePath: __dirname + '/test_runnable.js'
				});
				pool.on('result', function() {
						BATCH_RESULT_COUNT++;
						pool.abort();
				});
				pool.on('error', function() {
						BATCH_ERROR_COUNT++;
				});
				pool.on('end', this.callback);
				for (i = 0; i < 100; i++) {
					pool.run();
				}
			},
			'It not received 100 results': function (runnables, err) {
				assert.notEqual(BATCH_RESULT_COUNT, 100);
			},
			
			'It not has been run 100 times': function (runnables, err) {
				var runCount = 0;
				runnables.forEach(function(item) {
						runCount += item.runCount;
				});
				assert.notEqual(runCount, 100);
			},
			'It received 0 error': function (runnables, err) {
				assert.equal(BATCH_ERROR_COUNT, 0);
			}
		}
});

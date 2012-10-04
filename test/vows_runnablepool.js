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
				var 
				i = 0, 
				pool = new rp.RunnablePool({
						modulePath: __dirname + '/test_runnable.js' // Here is our Runnable script
				});
				pool.on('result', function() {
						BATCH_RESULT_COUNT++;
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
			}
		}
}).addBatch({
'When running a runnable 100 times with 1 CPU': {
	topic: function () {
		BATCH_RESULT_COUNT = 0;
		var 
		i = 0, 
		pool = new rp.RunnablePool({
				modulePath: __dirname + '/test_runnable.js', // Here is our Runnable script,
				maxRunnables: 1
		});
		pool.on('result', function() {
				BATCH_RESULT_COUNT++;
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
	}
}
}).addBatch({
'When running a timeout runnable 1 time': {
	topic: function () {
		BATCH_RESULT_COUNT = 0;
		BATCH_ERROR_COUNT = 0;
		var 
		i = 0, 
		pool = new rp.RunnablePool({
				modulePath: __dirname + '/test_runnable_timeout.js', // Here is our Runnable script
				timeout: 1 // 2s
		});
		pool.on('result', function() {
				BATCH_RESULT_COUNT++;
		});
		pool.on('error', function() {
				BATCH_ERROR_COUNT++;
		});
		pool.on('end', this.callback);
		for (i = 0; i < 1; i++) {
			pool.run();
		}
	},
	'It received 0 results': function (runnables, err) {
		assert.equal(BATCH_RESULT_COUNT, 0);
	},
	'It received 1 error': function (runnables, err) {
		assert.equal(BATCH_ERROR_COUNT, 1);
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
});

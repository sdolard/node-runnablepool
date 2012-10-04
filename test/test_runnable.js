var
util = require('util'),
rp = require('../lib/runnablepool'),
TestRunnable = (function () {
		
		function TestRunnable () {
			this.verbose = false;
			rp.Runnable.call(this);
		}
		util.inherits(TestRunnable, rp.Runnable);
		
		TestRunnable.prototype.run = function(config, callback){
			// Do you stuff here.
			// Once you done, just call callback function with results as params
			callback('TestRunnable run');
		};
	
		return TestRunnable;
}()),
run = new TestRunnable();

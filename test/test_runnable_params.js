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
			callback(config);
		};
	
		return TestRunnable;
}()),
run = new TestRunnable();

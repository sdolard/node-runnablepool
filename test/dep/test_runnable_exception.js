var
util = require('util'),
rp = require('../../lib/runnablepool'),
TestRunnable = (function () {

		function TestRunnable () {
			this.verbose = false;
			rp.Runnable.call(this);
		}
		util.inherits(TestRunnable, rp.Runnable);

		TestRunnable.prototype.run = function(config, callback){
			/*jslint unparam: true */
			throw new Error('test runnable exception');
		};

		return TestRunnable;
}()),
run = new TestRunnable();

var
util = require('util'),
rp = require('../lib/runnablepool'),
BasicRunnable = (function () {
		
		function BasicRunnable () {
			this.verbose = false;
			rp.Runnable.call(this);
		}
		util.inherits(BasicRunnable, rp.Runnable);
		
		BasicRunnable.prototype.run = function(config, callback){
			// Do you stuff here.
			// Once you done, just call callback function with results as params
			callback('BasicRunnable run');
		};
	
		return BasicRunnable;
}()),
run = new BasicRunnable(); // class must be instanciated: it's got interfaces to be managed by the pooler.

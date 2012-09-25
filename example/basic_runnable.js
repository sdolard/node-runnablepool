
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
			callback('BasicRunnable run');
		};
	
		return BasicRunnable;
}()),
run = new BasicRunnable();

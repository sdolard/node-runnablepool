
var
util = require('util'),
runnable = require('../lib/runnable'),
run,
BasicRunnable = (function () {
		
		function BasicRunnable () {
			runnable.Runnable.call(this);
		}
		util.inherits(BasicRunnable, runnable.Runnable);
		
		BasicRunnable.prototype.run = function(config, callback){
			callback('BasicRunnable run');
		};
	
		return BasicRunnable;
}());


run = new BasicRunnable();

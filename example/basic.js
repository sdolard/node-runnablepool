var
util = require('util'),
i = 0,
rp = require('../lib/runnablepool'),
pool = new rp.RunnablePool({
		modulePath: __dirname + '/basic_runnable.js' // Here is our Runnable script
});
pool.on('result', function(pid, err, result) {
		if (err) {
			if (err.stack) {
				return console.log(util.format('pid %d > %s', pid, err.stack));
			}
			return console.log(util.format('pid: %d > Error : ', pid, err.message));
		}
		console.log(result);
});

pool.on('end', function(runnables) {
		runnables.forEach(function(runnable) {
				console.log(util.format('pid %d run count: %d', runnable.pid, runnable.runCount));
		});
		console.log('end');
});


pool.on('error', function(error) {
		console.log(error.message);
});

for(i = 0; i < 1000; i++) {
	pool.run();
}

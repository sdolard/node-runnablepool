var
util = require('util'),
i = 0,
rp = require('../lib/runnablepool'),
pool = new rp.RunnablePool({
		verbose: false,
		modulePath: './basic_runnable.js'
});
pool.on('result', function(pid, err, result) {
		if (err) {
			if (err.stack) {
				return console.log(util.format('pid %d > %s', pid, err.stack));
			}
			return console.log(util.format('pid: %d > Error : ', pid, err.message));
		}
		console.log(result[0]);
});

pool.on('end', function(runnables) {
		runnables.forEach(function(runnable) {
				console.log(util.format('pid %d run count: %d', runnable.pid, runnable.runCount));
		});
});

for(i = 0; i < 2000; i++) {
	pool.run();
}

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

for(i = 0; i < 1; i++) {
	pool.run();
}

var
i = 0,
wp = require('../lib/worker_pool'),
pool = new wp.WorkerPool({
		modulePath: './basic_runnable.js'
});
pool.on('result', function(err, result) {
		if (err) {
			return console.log(err.message);
		}
		console.log(result);
});

for(i = 0; i < 10000; i++) {
	pool.run();
}

var
i = 0,
wp = require('../lib/worker_pool'),
pool = new wp.WorkerPool({
		//maxWorkers: 1,
		workerFile: './basic_runnable.js',
		verbose: false
});
pool.on('result', function(err, result) {
		if (err) {
			return console.log(err.message);
		}
		console.log(result);
});

for(i = 0; i < 100000; i++) {
	pool.run();
}

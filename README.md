# node-runnablepool [![Build Status](https://secure.travis-ci.org/sdolard/node-runnablepool.png?branch=master)](http://travis-ci.org/sdolard/node-runnablepool)
A runnable (fork) pool lib.
An easy way to use multi proc with node.

https://npmjs.org/package/runnablepool



### Installing runnablepool

```
[sudo] npm install [-g] runnablepool
```


## Usage
### Lib: inherits from Runnable class. 
```javascript
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
run = new BasicRunnable();

```

### Lib: instanciate a RunnablePool with BasicRunnable script 
```javascript
var
util = require('util'),
i = 0,
rp = require('../lib/runnablepool'),
pool = new rp.RunnablePool({
		modulePath: './basic_runnable.js'
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
});

for(i = 0; i < 2000; i++) {
	pool.run();
}

```

### Examples
* pooler: examples/basic.js
* runnable: examples/basic_runnable.js



## Debug
### Juste call run.run() 
```javascript
var
util = require('util'),
rp = require('../lib/runnablepool'),
BasicRunnable = (function () {
		[...]
}()),
run = new BasicRunnable();
run.run(); // do forget to remove it once you are done !

```

### Run it as usual
node basic_runnable.js


## License
node-runnablepool is licensed under the MIT license.

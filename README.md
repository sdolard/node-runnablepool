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
Create a dedicated file to run the Runnable instance. 
See examples/basic_runnable.js
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

```

### Examples
* pooler: examples/basic.js
* runnable: examples/basic_runnable.js



## Debug
### Just call run.run() 
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


## Classes
### RunnablePool
```javascript		
/**
* @constructor
* @param {number} config.maxRunnables: max proc to use. Default to os.cpus().length
* @param {String} config.modulePath: module path see child_process.fork params
* @param {Array} config.args: see child_process.fork params
* @param {Object} config.options: see child_process.fork params
* @param {Boolean} config.verbose: verbose mode. Default to false
* @param {Number} config.timeout: time in seconds to wait for a result before killing process. Default to 30
* Emit 'result' function({Number} pid, {Error || undefined} err, {Mixed} result) for each results
* Emit 'end' function({Array of {{Number} pid, {Number} runCount }} runnables) once all results are done
* Emit 'error' function({Error} error})
*/
function RunnablePool (config)


/**
* @public
* @param {Mixed} config to pass to runnable script
* This method fill the pooler
*/
Runnable.prototype.run = function(config)
		
```

## License
node-runnablepool is licensed under the MIT license.

var
cp = require('child_process'),
os = require('os'),
util = require('util'),
EventEmitter = require('events').EventEmitter,

Runnable = (function(){
		/**
		* @constructor
		* @param {String} config.modulePath: module path see child_process.fork params
		* @param {Array} config.args: see child_process.fork params
		* @param {Object} config.options: see child_process.fork params
		* @param {Number} config.timeout: time in seconds to wait for a result before killing process. Default to 30
		*/
		function Runnable(config) {
			config = config || {};
			this.modulePath = config.modulePath || __dirname +'/runnable.js';
			this.args = config.args;
			this.options = config.options;
			this.verbose = config.verbose;
			this.timeout = Math.max(config.timeout || 30, 1); // seconds 
			
			this._busy = false;
			this._fork = cp.fork(this.modulePath, this.args, this.options);
			this._fork.on('message', this._onRunnableMessage.bind(this));
			this._fork.on('exit', this._onRunnableExit.bind(this));
			this._fork.on('close', this._onRunnableClose.bind(this));
			this._fork.on('disconnect', this._onRunnableDisconnect.bind(this));
			this._runCount = 0;
			this._timeoutId = -1;
		}
		util.inherits(Runnable, EventEmitter);
		
		Runnable.prototype._onRunnableMessage = function(message) {
			message = message || {};
			message.event = message.event || '';
			
			var response = {
				pid: this._fork.pid
			};
			
			switch(message.event) {
			case 'result': // edition	
				this._log('received result: %s', util.inspect(message.result, true, 100));
				this.setFree(); 
				response.result = message.result;
				this.emit('result', response);
				break;
				
			case 'error': // err
				this._log('received error: %s', util.inspect(message, true, 100));
				this.setFree();
				response.err =  message.err;
				this.emit('result', response);
				break;
				
			default:
				this._log('received message: ', message.message);
			}
		};
		
		Runnable.prototype._onRunnableExit = function(exitCode, signal) {
			this._log(util.format('exit. code: %d, signal: %d', exitCode, signal));
		};
		
		Runnable.prototype._onRunnableClose = function() {
			this._log('close');
		};
		
		Runnable.prototype._onRunnableDisconnect = function() {
			this._log('disconnect');
		};
		
		/**
		* @public
		* @param {Mixed} config to pass to runnable script 
		*/
		Runnable.prototype.run = function(config){
			var message;
			if (this._busy) {
				return this._eexception({
						code: 'EBUSY',
						message: 'Can\'t run. Runnable is already busy'
				});
			}
			this._busy = true;
			message = {
				event: 'run',
				config: config.config
			};
			
			this._runCount++;
			this._fork.send(message);
			this._log('send: %s', util.inspect(message));
			
			// timeout
			this._timeoutId = setTimeout(this._onTimeout.bind(this), this.timeout * 1000);
			
		};
		
		Runnable.prototype.disconnect = function() {
			this._fork.disconnect();
			return this._runCount;
		};
		
		Runnable.prototype._log = function() {
			if (!this.verbose) {
				return;
			}
			var 
			args = arguments,
			v = util.format('%d Runnable %d# ', parseInt((new Date()).getTime(), 10), this._fork.pid);
			args[0] = args[0].replace('\n', '\n' + v);
			args[0] = v.concat(args[0]);
			console.error.apply(console, args);
		};
		
		/**
		* @private
		*/
		Runnable.prototype._eexception = function(exception) {
			var error;
			if (exception instanceof Error) {
				error = exception;
			} else {
				error = new Error(exception.message);
				Error.captureStackTrace(error, Runnable.prototype._eexception); // we do not trace this function
				error.code = exception.code;
			}
			
			this.emit('error', error);
		};
		                                                     
		/**
		* @private
		*/
		Runnable.prototype._onTimeout = function() {
			this._log(util.format('Run timeout (%ds). Killing process...', this.timeout));			
			this._fork.removeAllListeners('exit');
			this._fork.on('exit', this._onKilled.bind(this));
			this._fork.kill();
		};
		
		
		/**
		* @private
		*/
		Runnable.prototype._onKilled = function(exitCode, signal) {
			this._log(util.format('Process killed. Code: %d, signal: %d', exitCode, signal));
			this._eexception({
					code: 'ETIMEOUT',
					pid: this._fork.pid,
					message: util.format('Run timeout (%ds). Process killed (%d)', this.timeout, this._fork.pid)
			});
		};
			
			
		/**
		* @private
		*/
		Runnable.prototype.setFree = function() {
			this._busy = false;
			clearTimeout(this._timeoutId);
			this._timeoutId = -1;
		};
		
		return Runnable;
		
}());

exports.RunnablePool = (function() {
		
		function emptyFn() {}
		
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
		function RunnablePool (config) {
			
			config = config || {};
			
			this.maxRunnables = Math.max(Math.min(config.maxRunnables, 24) || os.cpus().length, 1);
			this.modulePath = config.modulePath || ''; //TODO: check if exists
			this.args = config.args;
			this.options = config.options;
			this.verbose = config.verbose;
			this.timeout = Math.max(config.timeout || 30, 1); // seconds 
			
			this._runnableStack = [];
			this._freeRunnables = [];
			this._busyRunnables = {
				count: 0
			};
			this._lastRunnableId = 0;
		}
		util.inherits(RunnablePool, EventEmitter);
		
		
		/**
		* @public
		* @param {Mixed} config to pass to runnable script 
		* This method fill the pooler
		*/
		RunnablePool.prototype.run = function(config) {
			config = config || {};  
			
			this._unshift({
					id: this._createId(),
					config: config
			});
		};
		
		RunnablePool.prototype._unshift = function (runnable){
			this._runnableStack.unshift(runnable);
			this._pop();
		};
		
		RunnablePool.prototype._pop = function (){
			var freeRunnable;
			if (this._runnableStack.length === 0) {
				return this._eexception({
						code: 'ESTACKEMPTY',
						message: 'There is nothing to run'
				});
			}

			freeRunnable = this._getFreeRunnable();
			if (!freeRunnable) {
				return;
			}
			freeRunnable.run(this._runnableStack.pop());
		};
		
		RunnablePool.prototype._getFreeRunnable = function(){
			var freeRunnable;
			
			if (this._freeRunnables.length > 0) {
				this._log('Getting a freeRunnable');
				freeRunnable = this._freeRunnables.pop();
				this._busyRunnables[freeRunnable._fork.pid] = freeRunnable;
				this._busyRunnables.count++;
				return freeRunnable;
			}
			
			if (this._busyRunnables.count === this.maxRunnables) {
				this._log('No free runnable. Waiting one...');
				return;
			}
			
			return this._createRunnable();
		};
		
		RunnablePool.prototype._createRunnable = function() {
			this._log(util.format('Creating new runnable (\'%s\')...', this.modulePath));
			var runnable = new Runnable({
					modulePath: this.modulePath,
					args: this.args,
					options: this.options,
					verbose: this.verbose,
					timeout: this.timeout
			});
			runnable.on('result', this._onRunnableResult.bind(this));
			runnable.on('error', this._onRunnableError.bind(this));
			this._log('New runnable created. pid: %d', runnable._fork.pid);
	
			this._busyRunnables[runnable._fork.pid] = runnable;
			this._busyRunnables.count++;
				
			return runnable;
		};
		
		RunnablePool.prototype._onRunnableResult = function(response) {
			process.nextTick(function() {
					this.emit('result', response.pid, response.err, response.result);
			}.bind(this));
			
			this._freeRunnables.push(this._busyRunnables[response.pid]);
			
			this._onRunnableFree(response.pid);
		};
	
		RunnablePool.prototype._onRunnableError = function(error) {
			this._eexception(error);
			
			if (error.code === 'ETIMEOUT') {
				this._onRunnableFree(error.pid);
			}
		};
		
		RunnablePool.prototype._onRunnableFree = function(pid) {
			this._busyRunnables.count--;
			delete this._busyRunnables[pid];
			
			if(this._runnableStack.length > 0) {
				this._log('A Runnable was released. Running next...');
				this._pop();
				return;
			}
			this._log('runnable stack is empty');
			if (this._busyRunnables.count > 0) {
				this._log('Runnables still busy...');
				return;		
			}
			this._log('No runnables busy. Disconnecting...');
			this._disconnectRunnables();
		};
		
		RunnablePool.prototype._disconnectRunnables = function(){
			var
			runnable,
			pid = 0,
			pidRunCount = 0,
			runnables = [],
			disconnectedCount = this._freeRunnables.length;
			
			function onExit() {
				disconnectedCount--;
				if (disconnectedCount <= 0) {
					process.nextTick(function() {
							this.emit('end', runnables);
					}.bind(this));
				}
			}
			if (this._freeRunnables.length === 0) {
				process.nextTick(function() {
						return this.emit('end', []);
				}.bind(this));
			}
			while (this._freeRunnables.length > 0) {
				runnable = this._freeRunnables.pop();
				pid = runnable._fork.pid;
				runnable._fork.on('exit', onExit.bind(this));
				pidRunCount = runnable.disconnect();
				runnables.push({
						pid: pid,
						runCount: pidRunCount
				});
				this._log(util.format('pid %d run: %d', pid, pidRunCount));
			}
			
		};
		
		RunnablePool.prototype._createId = function() {
			return this._lastRunnableId++;
		};
		
		RunnablePool.prototype._log = function() {
			if (!this.verbose) {
				return;
			}
			var 
			args = arguments,
			v = parseInt((new Date()).getTime(), 10) + ' RunnablePool # ';
			args[0] = args[0].replace('\n', '\n' + v);
			args[0] = v.concat(args[0]);
			console.error.apply(console, args);
		};
		
		/**
		* @private
		*/
		RunnablePool.prototype._eexception = function(exception) {
			var error;
			if (exception instanceof Error) {
				error = exception;
			} else {
				error = new Error(exception.message);
				Error.captureStackTrace(error, RunnablePool.prototype._eexception); // we do not trace this function
				error.code = exception.code;
			}
			
			this.emit('error', error);
		};
		
		return RunnablePool;
}());

exports.Runnable = require('./runnable').Runnable;

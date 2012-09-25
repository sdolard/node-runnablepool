var
cp = require('child_process'),
os = require('os'),
util = require('util'),
EventEmitter = require('events').EventEmitter,

Runnable = (function(){
		/**
		* @constructor
		*/
		function Runnable(config) {
			config = config || {};
			this.modulePath = config.modulePath || __dirname +'/runnable.js';
			this.args = config.args;
			this.options = config.options;
			this.verbose = config.verbose;
			
			this._busy = false;
			this._fork = cp.fork(this.modulePath, this.args, this.options);
			this._fork.on('message', this._onRunnableMessage.bind(this));
			this._fork.on('exit', this._onRunnableExit.bind(this));
			this._fork.on('close', this._onRunnableClose.bind(this));
			this._fork.on('disconnect', this._onRunnableDisconnect.bind(this));
			this._runCount = 0;
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
				this._log('result: %s', util.inspect(message.result));
				this._busy = false; 
				response.result = message.result;
				this.emit('result', response);
				break;
				
			case 'error': // err
				this._log('error: %s', util.inspect(message));
				this._busy = false; // TODO: not sure
				response.err =  message.err;
				this.emit('result', response);
				break;
				
			default:
				this._log('message: ', message);
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
		
		return Runnable;
		
}());

exports.RunnablePool = (function() {
		
		function emptyFn() {}
		
		/**
		* @constructor
		*/
		function RunnablePool (config) {
			
			config = config || {};
			
			this.maxRunnables = Math.max(Math.min(config.maxRunnables, 24) || os.cpus().length, 1);
			this.modulePath = config.modulePath || ''; //TODO: check if exists
			this.args = config.args;
			this.options = config.options;
			this.verbose = config.verbose;
			
			
			this._runnableStack = [];
			this._freeRunnables = [];
			this._busyRunnables = {
				count: 0
			};
			this._lastRunnableId = 0;
		}
		util.inherits(RunnablePool, EventEmitter);
		
		
		/**
		*
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
					verbose: this.verbose 
			});
			runnable.on('result', this._onRunnableResult.bind(this));
			this._log('New runnable created. pid: %d', runnable._fork.pid);
	
			this._busyRunnables[runnable._fork.pid] = runnable;
			this._busyRunnables.count++;
				
			return runnable;
		};
		
		RunnablePool.prototype._onRunnableResult = function(response) {
			process.nextTick(function() {
					this.emit('result', response.pid, response.err, response.result);
			}.bind(this));
			
			this._busyRunnables.count--;
			this._freeRunnables.push(this._busyRunnables[response.pid]);
			delete this._busyRunnables[response.pid];
			
			if(this._runnableStack.length > 0) {
				this._log('A Runnable was released. Running next...');
				this._pop();
				return;
			}
			this._log('runnable stack is empty');
			this._disconnectRunnables();			
		};
		
		
		RunnablePool.prototype._disconnectRunnables = function(){
			var
			runnable,
			pid = 0,
			pidRunCount = 0,
			runnables = [];
			while (this._freeRunnables.length > 0) {
				runnable = this._freeRunnables.pop();
				pid = runnable._fork.pid;
				pidRunCount = runnable.disconnect();
				runnables.push({
						pid: pid,
						runCount: pidRunCount
				});
				this._log(util.format('pid %d run: %d', pid, pidRunCount));
			}
			
			this.emit('end', runnables);
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

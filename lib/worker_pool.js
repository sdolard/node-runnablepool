var
cp = require('child_process'),
os = require('os'),
util = require('util'),
EventEmitter = require('events').EventEmitter,

Worker = (function(){
		/**
		* @constructor
		*/
		function Worker(config) {
			config = config || {};
			this.verbose = config.verbose;
			this.file = config.file || __dirname +'/runnable.js';
			
			this._busy = false;
			this._fork = cp.fork(this.file);
			this._fork.on('message', this._onWorkerMessage.bind(this));
			this._fork.on('exit', this._onWorkerExit.bind(this));
			this._fork.on('close', this._onWorkerClose.bind(this));
			this._fork.on('disconnect', this._onWorkerDisconnect.bind(this));
			this._runCount = 0;
		}
		util.inherits(Worker, EventEmitter);
		
		Worker.prototype._onWorkerMessage = function(message) {
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
				this._log('error: %s', util.inspect(message.err));
				this._busy = false; // TODO: not sure
				response.err =  message.err;
				this.emit('result', response);
				break;
				
			default:
				this._log('message: ', message);
			}
		};
		
		Worker.prototype._onWorkerExit = function(exitCode, signal) {
			this._log(util.format('exit. code: %d, signal: %d', exitCode, signal));
		};
		
		Worker.prototype._onWorkerClose = function() {
			this._log('close');
		};
		
		Worker.prototype._onWorkerDisconnect = function() {
			this._log('disconnect');
		};
		
		Worker.prototype.run = function(config){
			var message;
			if (this._busy) {
				return this._eexception({
						code: 'EBUSY',
						message: 'Can\'t run. Worker is already busy'
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
		
		Worker.prototype.disconnect = function() {
			this._fork.disconnect();
			return this._runCount;
		};
		
		Worker.prototype._log = function() {
			if (!this.verbose) {
				return;
			}
			var 
			args = arguments,
			v = util.format('%d Worker %d# ', parseInt((new Date()).getTime(), 10), this._fork.pid);
			args[0] = args[0].replace('\n', '\n' + v);
			args[0] = v.concat(args[0]);
			console.error.apply(console, args);
		};
		
		/**
		* @private
		*/
		Worker.prototype._eexception = function(exception) {
			var error;
			if (exception instanceof Error) {
				error = exception;
			} else {
				error = new Error(exception.message);
				Error.captureStackTrace(error, Worker.prototype._eexception); // we do not trace this function
				error.code = exception.code;
			}
			
			this.emit('error', error);
		};
		
		return Worker;
		
}());

exports.WorkerPool = (function() {
		
		function emptyFn() {}
		
		/**
		* @constructor
		*/
		function WorkerPool (config) {
			
			config = config || {};
			
			this.maxWorkers = Math.max(Math.min(config.maxWorkers, 24) || os.cpus().length, 1);
			this.workerFile = config.workerFile || ''; //TODO: check if exists
			this.verbose = config.verbose;
			
			
			this._runnableStack = [];
			this._freeWorkers = [];
			this._busyWorkers = {
				count: 0
			};
			this._lastRunnableId = 0;
		}
		util.inherits(WorkerPool, EventEmitter);
		
		
		/**
		*
		*/
		WorkerPool.prototype.run = function(config) {
			config = config || {};  
			
			this._unshift({
					id: this._createId(),
					config: config
			});
		};
		
		WorkerPool.prototype._unshift = function (runnable){
			this._runnableStack.unshift(runnable);
			this._pop();
		};
		
		WorkerPool.prototype._pop = function (){
			var freeWorker;
			if (this._runnableStack.length === 0) {
				return this._eexception({
						code: 'ESTACKEMPTY',
						message: 'There is nothing to run'
				});
			}

			freeWorker = this._getFreeWorker();
			if (!freeWorker) {
				return;
			}
			freeWorker.run(this._runnableStack.pop());
		};
		
		WorkerPool.prototype._getFreeWorker = function(){
			var freeWorker;
			
			if (this._freeWorkers.length > 0) {
				this._log('Getting a freeWorker');
				freeWorker = this._freeWorkers.pop();
				this._busyWorkers[freeWorker._fork.pid] = freeWorker;
				this._busyWorkers.count++;
				return freeWorker;
			}
			
			if (this._busyWorkers.count === this.maxWorkers) {
				this._log('No free worker. Waiting one...');
				return;
			}
			
			return this._createWorker();
		};
		
		WorkerPool.prototype._createWorker = function() {
			this._log(util.format('Creating new worker (\'%s\')...', this.workerFile));
			var worker = new Worker({
					file: this.workerFile,
					verbose: this.verbose 
			});
			worker.on('result', this._onWorkerResult.bind(this));
			this._log('New worker created. pid: %d', worker._fork.pid);
	
			this._busyWorkers[worker._fork.pid] = worker;
			this._busyWorkers.count++;
				
			return worker;
		};
		
		WorkerPool.prototype._onWorkerResult = function(response) {
			process.nextTick(function() {
					this.emit('result', response.err, response.result);
			}.bind(this));
			
			this._busyWorkers.count--;
			this._freeWorkers.push(this._busyWorkers[response.pid]);
			delete this._busyWorkers[response.pid];
			
			if(this._runnableStack.length > 0) {
				this._log('A Worker was released. Running next...');
				this._pop();
				return;
			}
			this._log('runnable stack is empty');
			this._disconnectWorkers();			
		};
		
		
		WorkerPool.prototype._disconnectWorkers = function(){
			var worker;
			while (this._freeWorkers.length > 0) {
				worker = this._freeWorkers.pop();
				this._log(util.format('pid %d run: %d', worker._fork.pid, worker.disconnect()));
			}
		};
		
		WorkerPool.prototype._createId = function() {
			return this._lastRunnableId++;
		};
		
		WorkerPool.prototype._log = function() {
			if (!this.verbose) {
				return;
			}
			var 
			args = arguments,
			v = parseInt((new Date()).getTime(), 10) + ' WorkerPool # ';
			args[0] = args[0].replace('\n', '\n' + v);
			args[0] = v.concat(args[0]);
			console.error.apply(console, args);
		};
		
		/**
		* @private
		*/
		WorkerPool.prototype._eexception = function(exception) {
			var error;
			if (exception instanceof Error) {
				error = exception;
			} else {
				error = new Error(exception.message);
				Error.captureStackTrace(error, WorkerPool.prototype._eexception); // we do not trace this function
				error.code = exception.code;
			}
			
			this.emit('error', error);
		};
		
		return WorkerPool;
}());

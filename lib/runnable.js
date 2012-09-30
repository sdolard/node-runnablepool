var
util = require('util'),
run;

exports.Runnable = (function () {
		
		function Runnable () { // ctor
			this.verbose = false; // TODO: find a way to enable it
			this._log(util.format('created: %s', __filename));
			
			process.on('message', this._onProcessMessage.bind(this));
		}
		
		Runnable.prototype = {
			/**
			* @public
			* 
			*/
			run: function(config, callback){
				callback('Nothing todo. Unherits from Runnable and overload run prototype');
			},
			
			/**
			* @public
			* @param {String} Message
			*/
			log: function(message) {
				message = message || '';
				this._emit('log', {
						message: message
				});
			},
			
			/**
			* @private
			*/
			_onProcessMessage: function(message) {
				this._log(util.format('receive: %s', util.inspect(message)));
				if(!message) {
					return this._eexception({
							code: 'ENOMESSAGE',
							message: 'No message set'
					});
				}
				if(message.event === 'run') {
					this._run(message.config);
				} else {
					this._eexception({
							code: 'EUNKNOWNEVENT',
							message: util.format('Unknown event: %s', message.event)
					});
				}
			},
			
			/**
			* @private
			*/
			_run: function(config) {
				config = config || {};
				try{
					this.run(config, function(result){
							
							this._log(util.format('result: %s', util.inspect(result)));
							this._emit('result', {
									result: result
							});
					}.bind(this));
				}catch(err) {
					this._eexception(err);
				}
			},
			
			/**
			* @private
			*/
			_eexception: function(exception) {
				var 
				error;
				if (exception instanceof Error) {
					error = exception;
				} else {
					error = new Error(exception.message);
					Error.captureStackTrace(error, Runnable.prototype._eexception); // we do not trace this function
					error.code = exception.code;
				}		
				this._emit('error', {
						err: { 
							message: error.message,
							code: error.code,
							stack: error.stack
						}
				});
			},
			
			/**
			* @private
			*/
			_log: function() {
				if (!this.verbose) {
					return;
				}
				var 
				args = arguments,
				v = parseInt((new Date()).getTime(), 10) + ' Runnable '+ process.pid + ' # ';
				args[0] = args[0].replace('\n', '\n' + v);
				args[0] = v.concat(args[0]);
				console.error.apply(console, args);
			},
			
			
			/**
			* @private
			*/
			_emit: function(event, config) {
				config = config || {};
				config.pid = process.pid;
				config.event = event;
				if (process.hasOwnProperty('send')) { // for test
					return process.send(config);
				}
				switch(event) {
				case 'log':
					console.log(config.message);
					break;
					
				case 'result':
					console.log(config.result);
					break;
					
				case 'error':
					console.log(config.stack);
					break;
					
				default:
					console.log(config);
				}
				
			}
		};
		
		
		return Runnable;
}());


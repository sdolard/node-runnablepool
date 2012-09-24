var
util = require('util'),
run;

exports.Runnable = (function () {
		
		function Runnable () { // ctor
			this.verbose = false;
			this._log(util.format('created: %s', __filename));
			
			process.on('message', this._onProcessMessage.bind(this));
		}
		
		Runnable.prototype = {
			/**
			* @public
			*/
			run: function(config, callback){
				callback('Nothing todo. Unherits from Runnable and overload run prototype');
			},
			
			/**
			* @public
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
				switch(message.event) {
				case 'run':
					this._run(message.config);
					break;
					
				case 'stop':
					// TODO
					break;
					
				default:
					this._eexception({
							code: 'EUNKNOWNEVENT',
							message: util.format('Unknown event: %s', message.event)
					});
				}
			},
			
			_run: function(config) {
				config = config || {};
				try{
					this.run(config, function(){
							
							this._log(util.format('result: %s', util.inspect(arguments)));
							this._emit('result', {
									result: arguments
							});
					}.bind(this));
				}catch(err) {
					console.log(err.message);
					this._eexception(err);
				}
			},
			
			/**
			* @private
			*/
			_eexception: function(exception) {
				/*var error = ;
				if (exception instanceof Error) {
					error = exception;
				} else {
					error = new Error(exception.message);
					error.code = exception.code;
				}*/
				
				this._emit('error', {
						err: { 
							message: exception.message,
							code: exception.code
						}
				});
				/*if (this.verbose && typeof error.stack === 'string') {
					console.log(error.stack);
				}*/
			},
			
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
				process.send(config);
			}
		};
		
		
		return Runnable;
}());

//run = new exports.Runnable();

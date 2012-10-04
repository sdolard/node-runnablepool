var 
vows = require('vows'),
assert = require('assert'),
util = require('util'),
path = require('path'),
rn = require('../lib/runnable'),
// gvar
out,
StrStream = function() {
	this.text = '';
};

StrStream.prototype.write = function(s) {
	this.text += s;
};

out = new StrStream();

exports.suite1 = vows.describe('runnable').
addBatch({
		'When creating a Runnable': {
			topic: function () {
				return new rn.Runnable({
						outStream: out
				});
			},
			'Verbose is false': function (topic) {
				assert.isFalse(topic.verbose);
			},
			'Run must be overloaded': function (topic) {
				topic.run(undefined, function(response){
						assert.equal('Nothing todo. Unherits from Runnable and overload run prototype', response);
				});	
			},
			'log is public': function (topic) {
				topic.log('test');
				assert.equal('test\r', out.text);
			},
			'No param on _onProcessMessage throw an Error': function (topic) {
				assert.throws(topic._onProcessMessage, Error);
			}, 
			'When calling _onProcessMessage with an empty object': {
				topic: function (topic) {
					return topic._onProcessMessage({});
				},
				'it\'s throw an error': function (err) {
					assert.equal(err.code, 'EUNKNOWNEVENT');
				}
			}
		}
});

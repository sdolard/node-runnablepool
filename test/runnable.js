var
assert = require('assert'),
rn = require('../lib/runnable'),
// gvar
StrStream = (function() {
	function StrStream() {
		this.text = '';
	}
	StrStream.prototype.write = function(s) {
		this.text += s;
	};
	return StrStream;
}());

describe('runnable', function() {
	var
	out = new StrStream(),
	runnable = new rn.Runnable({
		outStream: out
	});

	it('should have verbose set to false', function () {
		assert(!runnable.verbose);
	});

	it('should have run ready to be overloaded', function (done) {
		runnable.run(undefined, function(response){
			assert.equal('Nothing todo. Unherits from Runnable and overload run prototype', response);
			done();
		});
	});

	it('should have log has public', function () {
		runnable.log('test');
		assert.equal('test\r', out.text);
	});

	it('should throw an Error when no param is set on _onProcessMessage call', function () {
		assert.throws(runnable._onProcessMessage, Error);
	});

	it('should When calling _onProcessMessage with an empty object', function() {
		try {
			runnable._onProcessMessage({});
		} catch(err) {
			assert.equal(err.code, 'EUNKNOWNEVENT');
		}
	});
});

const stateMap = {
	pending: 'pending',
	fulfilled: 'fulfilled',
	rejected: 'rejected'
}

function Promise(fn) {
	var p = this;
	this.value = null;
	this.state = stateMap.pending;
	this.cbs = [];

	if (typeof fn === 'function') {
		fn(function resolve(value) {
			p.resolve(value)
		}, function reject(error) {
			p.reject(error)
		});
	}
}

Promise.prototype._setState = function(value, state) {
	var p = this;

	if (p.state !== stateMap.pending) return;

	p.value = value;
	p.state = state;
	setTimeout(function() {
		p._notify();
	}, 0)
}

Promise.prototype.resolve = function (x) {
	if (this === x) {
		throw TypeError('parameter type error')
	}

	if (this.state !== stateMap.pending) return;

	var p = this,
		hasCalled = false,
		then;

	if ((typeof x === 'object' && x !== null) || typeof x === 'function') {
		try {
			then = x.then;
		} catch (e) {
			p._setState(e, stateMap.rejected);
			return;
		}

		if (typeof then === 'function') {
			try {
				then.call(x, function resolvePromise(y) {
					!hasCalled && p.resolve(y);
					hasCalled = true;
				}, function rejectPromise(r) {
					!hasCalled && p._setState(r, stateMap.rejected);
					hasCalled = true;
				})
			} catch (e) {
				if (!hasCalled) {
					p._setState(e, stateMap.rejected);
				}
			}
		} else {
			p._setState(x, stateMap.fulfilled)
		}
	} else {
		p._setState(x, stateMap.fulfilled)
	}
}

Promise.prototype.reject = function (error) {
	if (this.state !== stateMap.pending) return;

	this._setState(error, stateMap.rejected)
}

Promise.prototype._notify = function() {
	var p = this,
		value,
		cb, 
		resolve, 
		reject, 
		onFulfilled, 
		onRejected;
	
	if (p.state === stateMap.pending) return;

	while (p.cbs.length > 0) {
		try {
			cb = p.cbs.shift();
			resolve = cb[0];
			reject = cb[1];
			onFulfilled = cb[2];
			onRejected = cb[3];

			if (p.state === stateMap.fulfilled) {
				if (typeof onFulfilled === 'function') {
					resolve(onFulfilled(p.value));
				} else {
					resolve(p.value)
				}
			} else if (p.state === stateMap.rejected) {
				if (typeof onRejected === 'function') {
					resolve(onRejected(p.value));
				} else {
					reject(p.value)
				}
			}
		} catch (e) {
			reject(e);
		}
	}
}

Promise.prototype.then = function (onFulfilled, onRejected) {
	var p = this;

	return new Promise(function (resolve, reject) {
		p.cbs.push([resolve, reject, onFulfilled, onRejected]);
		
		// for resolved/rejected promise
		if (p.state !== stateMap.pending) {
			setTimeout(function() {
				p._notify();
			}, 0)
		}
	})
}

Promise.prototype.catch = function (onRejected) {

}

// for test
var resolved = Promise.resolve = function(value) {
	return new Promise(function(resolve, reject) {
		resolve(value)
	})
}

var rejected = Promise.rejected = function(reason) {
	return new Promise(function(resolve, reject) {
		reject(reason)
	})
}

var deferred = Promise.deferred = function() {
	var obj = {};
	obj.promise = new Promise(function(resolve, reject) {
		obj.resolve = resolve;
		obj.reject = reject;
	});

	return obj
}

module.exports = Promise;
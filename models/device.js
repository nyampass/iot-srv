var redis = require('redis').createClient(process.env.REDIS_URL);

var REDIS_EXPIRE = 86400 * 2;

function loge(err) {
    if (err) {
	console.log("ERR: " + err);
    }
}

var Device = function(name) {
  this.name = name;
}

Device.prototype.status = function(callback) {
    redis.get(this.name, function(err, val) {
	loge(err);
	callback(val || "0");
    });
}

Device.prototype.info = function(callback) {
    var name = this.name;
    redis.mget([name + ":code", name + ":updatedAt"], function(err, vals) {
	var code = vals[0];
	var updatedAt = vals[1]? new Date(parseInt(vals[1])).toString(): "";
	callback({
	    name: name,
	    code: code,
	    updatedAt: updatedAt
	});
    });
}

Device.prototype.logs = function(callback) {
    var name = this.name;
    redis.keys(
	name + ":s:*",
	function (err, keys) {
	    loge(err);
	    
	    redis.mget(keys, function(err, response) {
		var logs = [];
		for (var i = 0; i < keys.length; i++) {
		    var timeKey = keys[i].match(/.*:(\d+)/);
		    if (timeKey) {
			logs.push({time: parseInt(timeKey[1]), value: response[i]})
		    }
		}
		logs = logs.sort(function(a,b) {
		    return a.time - b.time;
		});
		callback({name: name,
			  logLabels: logs.map(function(o) { return new Date(o.time); }),
			  logs: logs});
	    });
	});
}

Device.prototype.updateCode = function(code, callback) {
    redis.set(this.name + ":code", code, function(err) {
	loge(err);
	callback()
    });
}

Device.prototype.runCode = function(code, name, val, prevVal) {
    if (!code) {
	return "none";
    }

    try {
	eval("(function(deviceName, val, prevVal){" + code + "})(name, val, prevVal)");
	return "success";

    } catch(e) {
	console.log(e);
	return "failed";
    }
}

Device.prototype.setStatus = function(val, callback) {
    var self = this;
    var name = this.name;

    redis.mget([name + ":code", name + ":curv"], function(err, vals) {
	var code = vals[0];
	var prevVal = vals[1];

	var now = new Date().getTime();
	var key = name + ":s:" + now;

	var result = self.runCode(code, name, val, prevVal);
	console.log("setStatusHandler: response: " + result);

	redis.mset(key, val,
		   name + ":updatedAt", now,
		   name + ":curv", val,
		   name + ":curr" , result,
		   function() {
		       redis.expire(key, REDIS_EXPIRE);

		       callback();
		   });
    });
}

function deviceList(callback) {
    redis.keys("*:curv",
	       function (err, keys) {
		   loge(err);
		   callback(keys.map(function(o) { return o.split(":")[0]; }));
	       });
}

module.exports = function(name) { return new Device(name); };
module.exports.list = deviceList;

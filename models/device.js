var redis = require('redis');
var _redisClient = null;

var REDIS_KEY = {
    DEVICE_CODE: "c",
    DEVICE_UPDATED_AT: "u",
    DEVICE_LOG: "l",
    DEVICE_CURRENT_STATUS: "cs",
    DEVICE_CURRENT_RESULT: "cr"
}

function redisDeviceKey(deviceName, key, option) {
    return deviceName + ":" + key + (option? ":" + option: "");
}

function redisClient() {
    if (_redisClient) {
	return _redisClient;
    }

    _redisClient = redis.createClient(process.env.REDIS_URL);
    return _redisClient;
}

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
    redisClient().get(this.name, function(err, val) {
	loge(err);
	callback(val || "0");
    });
}

Device.prototype.info = function(callback) {
    var name = this.name;
    redisClient().mget([redisDeviceKey(name, REDIS_KEY.DEVICE_CODE),
			redisDeviceKey(name, REDIS_KEY.DEVICE_UPDATED_AT)], function(err, vals) {
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
    redisClient().keys(
	redisDeviceKey(name, REDIS_KEY.DEVICE_LOG, "*"),
	function (err, keys) {
	    loge(err);
	    
	    redisClient().mget(keys, function(err, response) {
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
    redisClient().set(redisDeviceKey(this.name, REDIS_KEY.DEVICE_CODE), code, function(err) {
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

    redisClient().mget([redisDeviceKey(name, REDIS_KEY.DEVICE_CODE),
			redisDeviceKey(name, REDIS_KEY.DEVICE_CURRENT_STATUS)], function(err, vals) {
			    var code = vals[0];
			    var prevVal = vals[1];

			    var now = new Date().getTime();
			    var key = redisDeviceKey(name, REDIS_KEY.DEVICE_LOG, now);

			    var result = self.runCode(code, name, val, prevVal);
			    console.log("setStatusHandler: response: " + result);
			    
			    redisClient().mset(key, val,
					       redisDeviceKey(name, REDIS_KEY.DEVICE_UPDATED_AT), now,
					       redisDeviceKey(name, REDIS_KEY.DEVICE_CURRENT_STATUS), val,
					       redisDeviceKey(name, REDIS_KEY.DEVICE_CURRENT_RESULT), result,
					       function() {
						   redisClient().expire(key, REDIS_EXPIRE);
						   
						   callback();
					       });
			});
}

function deviceList(callback) {
    redisClient().keys(redisDeviceKey("*", REDIS_KEY.DEVICE_CURRENT_STATUS),
		       function (err, keys) {
			   loge(err);
			   callback(keys.map(function(o) { return o.split(":")[0]; }));
		       });
}

module.exports = function(name) { return new Device(name); };
module.exports.list = deviceList;

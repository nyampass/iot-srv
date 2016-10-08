var express = require('express');
var redis = require('redis').createClient(process.env.REDIS_URL);
var hogan = require("hogan.js");
var bodyParser = require('body-parser');

var REDIS_EXPIRE = 86400 * 2;

var app = express();

app.use(express.static('public'));

app.set('view engine', 'html')
app.set('layout', 'layout')
app.enable('view cache')
app.engine('html', require('hogan-express'))

app.use(bodyParser.urlencoded({extended: true}));

app.get('/', function (req, res) {
    res.render('index.html', {title: 'test'});
});

app.get('/:device/status', function (req, res) {
    redis.get(req.params.device, function(err, val) {
	if (err) {
	    console.log(err);
	}
	res.send(val || "0");
    });
});

function deviceInfo(device, callback) {
    redis.mget([device + ":code", device + ":updatedAt"], function(err, response) {
	var code = response[0];
	var updatedAt = response[1]? new Date(parseInt(response[1])).toString(): "";
	callback({
	    name: device,
	    code: code,
	    updatedAt: updatedAt
	});
    });
}

function deviceLogs(device, callback) {
    redis.keys(device + ":*",
	       function (err, keys) {
		   if (err) {
		       console.log(err);
		   }

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
		       callback({name: device,
				 logLabels: logs.map(function(o) { return new Date(o.time); }),
				 logs: logs});
		   });
	    });
}

app.get('/:device.json', function(req, res) {
    deviceLogs(req.params.device, function(info) {
	res.json(info);
    })
});

app.get('/:device', function(req, res) {
    deviceInfo(req.params.device, function(v) {
	res.render('device.html', {"device": v});
    });
});

function updateDeviceCode(device, code, callback) {
    redis.set(device + ":code", code, callback);
}

app.post('/:device', function(req, res) {
    updateDeviceCode(req.params.device, req.body.code, function() {
	res.redirect(302, "/" + req.params.device);
    });
});

function setStatusHandler(val) {
    return function(req, res) {
	var now = new Date().getTime();
	var key = req.params.device + ":s:" + now;
	redis.set(key, val, function() {
	    redis.expire(key, REDIS_EXPIRE);

	    key = req.params.device + ":updatedAt";
	    redis.set(key, now, function() {
		res.send("ok");
	    })
	});
    }
}

app.get('/:device/on', setStatusHandler("100"));

app.get('/:device/off', setStatusHandler("0"));

var server = app.listen(process.env.PORT || 3000, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('app listening at http://%s:%s', host, port);
});


var key = 'hoge:fuga';
var value = 'piyo';



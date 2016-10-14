var express = require('express');
var hogan = require("hogan.js");
var bodyParser = require('body-parser');
var device = require("./models/device");

var app = express();

app.use(express.static('public'));

app.set('view engine', 'html')
app.set('layout', 'layout')
app.enable('view cache')
app.engine('html', require('hogan-express'))

app.use(bodyParser.urlencoded({extended: true}));

var pollingStatusRequests = [];

app.get('/', function (req, res) {
    device.list(function(devices) {
	res.render('index.html', {
	    host: req.protocol + '://' + req.get('host'),
	    devices: devices.map(function(o) { return {name: o}; })
	})
    });
});

app.get('/:device/status', function (req, res) {
    device(req.params.device).status(function(val) {
	res.send(val || "0");
    });
});

app.get('/:device/status/polling', function (req, res) {
    pollingStatusRequests.push({name: req.params.device, res: res})
});

setInterval(function() {
	while (pollingStatusRequests.length) {
	    (function (request) {
		device(request.name).status(function(val) {
		    request.res.send(val);
		});
	    })(pollingStatusRequests.shift());
	}
}, 10000);

app.get('/:device.json', function(req, res) {
    device(req.params.device).logs(function(logs) {
	res.json(logs);
    });
});

app.get('/:device', function(req, res) {
    device(req.params.device).info(function(device) {
	res.render('device.html', {"device": device});
    });
});

app.post('/:device', function(req, res) {
    device(req.params.device).updateSettings(req.body.code,
					     req.body.resetOnFetchStatus == "on",
					     function() {
	res.redirect(302, "/" + req.params.device);
    });
});

function sendPollingStatus(deviceName, val) {
    while (pollingStatusRequests.length) {
	if (pollingStatusRequests[0].name == deviceName) {
	    (function (request) {
		device(request.name).status(function(val) {
		    request.res.send(val);
		});
	    })(pollingStatusRequests.shift());
	}
    }
}

function setStatusHandler(valOrFunc) {
    var valFunc = valOrFunc;
    if (typeof valFunc != "function") {
	valFunc = function(req) { return valOrFunc; }
    }

    return function(req, res) {
	var val = valFunc(req);
	device(req.params.device).setStatus(
	    val,
	    function() {
		sendPollingStatus(req.params.device, val)
		res.send("ok");
	    });
    };
}

app.get('/:device/on', setStatusHandler("100"));

app.get('/:device/off', setStatusHandler("0"));

app.get('/:device/:value', setStatusHandler(function(req) {
    return req.params.value;
}));

var server = app.listen(process.env.PORT || 3000, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log('app listening at http://%s:%s', host, port);
});

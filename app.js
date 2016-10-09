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

app.get('/', function (req, res) {
    res.render('index.html', {title: 'test'});
});

app.get('/:device/status', function (req, res) {
    device(req.params.device).status(function(val) {
	res.send(val || "0");
    });
});

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

function updateDeviceCode(device, code, callback) {
    redis.set(device + ":code", code, callback);
}

app.post('/:device', function(req, res) {
    device(req.params.device).updateCode(req.body.code, function() {
	res.redirect(302, "/" + req.params.device);
    });
});

function setStatusHandler(valOrFunc) {
    var valFunc = valOrFunc;
    if (typeof valFunc != "function") {
	valFunc = function(req) { return valOrFunc; }
    }
    return function(req, res) {
	device(req.params.device).setStatus(
	    valFunc(req),
	    function() {
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

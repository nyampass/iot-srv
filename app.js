var express = require('express');
var hogan = require("hogan.js");
var bodyParser = require('body-parser');
var device = require("./models/device");
var document = require("./models/document");
var marked = require("marked");

var app = express();

app.use(express.static('public'));

app.set('view engine', 'html')
app.set('layout', 'layout')
app.enable('view cache')
app.engine('html', require('hogan-express'))

app.use(bodyParser.urlencoded({extended: true}));

var pollingStatusRequests = [];

marked.setOptions({
  // renderer: new marked.Renderer(),
  // gfm: true,
  // tables: true,
  breaks: true,
  // pedantic: false,
  // sanitize: false,
  // smartLists: true,
  // smartypants: false
});

var renderer = new marked.Renderer();

renderer.heading = function(text, level) {
  var escapedText = text.toLowerCase().replace(/[^\w]+/g, '-');
  var numLevel = parseInt(level) + 2;
  return '<h' + numLevel.toString() + '>' + escapedText + '</h' + numLevel.toString() + '>';
}

app.get('/', function (req, res) {
  device.list(function(devices) {
    res.render('index.html', {
      host: req.protocol + '://' + req.get('host'),
      devices: devices.map(function(o) { return {name: o}; })
    })
  });
});

app.get('/docs', function (req, res) {
  if ( req.query.path ) {
    res.redirect('/docs/' + req.query.path);
  }
  document.list(function(docs) {
    res.render('docs/index.html', {
      docs: docs
    })
  })
})

app.get('/docs/:path', function (req, res) {
  var path = req.params.path;
  document.list(function(docs) {
    document.findOne({path: path}, function(doc) {
      var page_data = {
        path: path,
        doc: doc,
        docs: docs
      }
      if (doc != null) {
        page_data.marked_body = marked(doc.body, {renderer: renderer})
      }
      if (doc == null || req.query.mode == "edit") {
        res.render('docs/edit.html', page_data)
      } else {
        res.render('docs/show.html', page_data)
      }
    })
  })
})

app.post('/docs/:path', function (req, res) {
  var path = req.params.path;
  document.list(function(docs) {
    var doc_params = {
      path: path,
      title: req.body.title,
      body: req.body.body,
    }
    document.findOne({path: path}, function(doc) {
      var page_data = {
        path: path,
        doc: doc,
        docs: docs
      }
      if (doc == null ) {
        document.createOrUpdate(doc_params, function(err, result) {
          res.redirect('/docs/' + path)
          //res.render('docs/show.html', page_data)
        })
      } else {
        document.update({path: path}, doc_params, function(err, result) {
          res.redirect('/docs/' + path)
          //res.render('docs/show.html', page_data)
        })
      }
    })
  })
})

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
  device(req.params.device).updateSettings(
    req.body.code,
    req.body.resetOnFetchStatus == "on",
    function() {
      res.redirect(302, "/" + req.params.device);
    });
});

function sendPollingStatus(deviceName, val) {
    for (var i = 0; i < pollingStatusRequests.length; i++) {
  if (pollingStatusRequests[i].name == deviceName) {
      (function (request) {
    device(request.name).status(function(val) {
        request.res.send(val);
    });
      })(pollingStatusRequests.shift());
      i -= 1;
  }
    }
}

function setStatusHandler(valOrFunc) {
  var valFunc = valOrFunc;
  if (typeof valFunc != "function") {
    valFunc = function(req) { return valOrFunc; }
  }

  return function(req, res) {
    var val = Math.max(Math.min(valFunc(req), 0), 100);
    device(req.params.device).setStatus(
      val,
      function() {
        sendPollingStatus(req.params.device, val)
        res.send("ok");
      });
  };
}

app.get('/:device/on', setStatusHandler(100));

app.get('/:device/off', setStatusHandler(0));

app.get('/:device/:value', setStatusHandler(function(req) {
  return parseInt(req.params.value) || 0;
}));

var server = app.listen(process.env.PORT || 3000, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('app listening at http://%s:%s', host, port);
});
